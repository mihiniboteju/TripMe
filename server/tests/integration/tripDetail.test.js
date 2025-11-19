const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const User = require('../../models/User');
const TripDetail = require('../../models/TripDetail');
const tripRoutes = require('../../routes/tripDetail');
const { connect, closeDatabase, clearDatabase } = require('../setup/testDb');

// Mock Cloudinary
jest.mock('../../config/cloudinary', () => ({
  uploader: {
    upload: jest.fn(),
    destroy: jest.fn()
  }
}));

const cloudinary = require('../../config/cloudinary');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/tripDetail', tripRoutes);

// Mock fs.unlinkSync to prevent actual file deletion
const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

describe('Trip Detail Routes Integration Tests', () => {
  let testUser;
  let authToken;
  let testTrip;

  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
    unlinkSyncSpy.mockRestore();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Reset and configure cloudinary mocks
    cloudinary.uploader.upload.mockImplementation((path) => Promise.resolve({
      secure_url: `https://res.cloudinary.com/test/image/upload/${path.split('/').pop()}`,
      public_id: `test_${Date.now()}_${Math.random()}`
    }));
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

    // Create test user
    testUser = await User.create({
      username: 'triptester',
      email: 'trip@example.com',
      password: 'hashedpass123',
      verifiedEmail: true,
      firstName: 'Trip',
      lastName: 'Tester'
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser._id, username: testUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a test trip
    testTrip = await TripDetail.create({
      userId: testUser._id,
      country: 'Japan',
      travelPeriod: {
        startDate: '2024-01-01',
        endDate: '2024-01-10'
      },
      visitedPlaces: [
        { name: 'Tokyo', description: 'Amazing city', rating: 5 }
      ],
      accommodations: [
        { name: 'Hotel Tokyo', type: 'Hotel', cost: 100 }
      ],
      transportations: [
        { type: 'Train', cost: 50 }
      ],
      weatherNotes: 'Cold and dry',
      clothingTips: 'Bring warm clothes',
      budgetItems: [
        { category: 'Food', amount: 500 }
      ],
      photos: [
        { url: 'https://example.com/photo1.jpg', public_id: 'photo1' }
      ]
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/tripDetail/random', () => {
    it('should fetch random trips', async () => {
      // Create multiple trips
      await TripDetail.create({
        userId: testUser._id,
        country: 'France',
        travelPeriod: { startDate: '2024-02-01', endDate: '2024-02-10' },
        visitedPlaces: [{ name: 'Paris', description: 'Beautiful', rating: 5 }],
        accommodations: [{ name: 'Hotel Paris', type: 'Hotel', cost: 150 }],
        transportations: [{ type: 'Metro', cost: 20 }],
        budgetItems: [{ category: 'Food', amount: 300 }]
      });

      const response = await request(app)
        .get('/api/tripDetail/random')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.length).toBeLessThanOrEqual(7);
    });

    it('should handle errors when fetching random trips', async () => {
      jest.spyOn(TripDetail, 'aggregate').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/tripDetail/random')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch trips');
    });
  });

  describe('POST /api/tripDetail', () => {
    it('should create a new trip with photos', async () => {
      const tripData = {
        country: 'Thailand',
        travelPeriod: JSON.stringify({ startDate: '2024-03-01', endDate: '2024-03-15' }),
        visitedPlaces: JSON.stringify([{ name: 'Bangkok', description: 'Vibrant city', rating: 5 }]),
        accommodations: JSON.stringify([{ name: 'Hotel Bangkok', type: 'Hotel', cost: 80 }]),
        transportations: JSON.stringify([{ type: 'Tuk-tuk', cost: 10 }]),
        weatherNotes: 'Hot and humid',
        clothingTips: 'Light clothing',
        budgetItems: JSON.stringify([{ category: 'Food', amount: 400 }])
      };

      const response = await request(app)
        .post('/api/tripDetail')
        .set('Authorization', `Bearer ${authToken}`)
        .field('country', tripData.country)
        .field('travelPeriod', tripData.travelPeriod)
        .field('visitedPlaces', tripData.visitedPlaces)
        .field('accommodations', tripData.accommodations)
        .field('transportations', tripData.transportations)
        .field('weatherNotes', tripData.weatherNotes)
        .field('clothingTips', tripData.clothingTips)
        .field('budgetItems', tripData.budgetItems)
        .attach('photos', Buffer.from('fake image'), 'test.jpg')
        .expect(201);

      expect(response.body.message).toBe('Trip created successfully');
      expect(response.body.trip).toBeDefined();
      expect(response.body.trip.country).toBe('Thailand');
      expect(response.body.trip.photos).toHaveLength(1);
      expect(response.body.redirectUrl).toContain('/trip/');

      // Verify user's trips array was updated
      const updatedUser = await User.findById(testUser._id);
      const tripIds = updatedUser.trips.map(id => id.toString());
      expect(tripIds).toContain(response.body.trip._id);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/tripDetail')
        .field('country', 'Thailand')
        .expect(401);

      expect(response.body.message).toContain('No token provided');
    });

    it('should fail with invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/tripDetail')
        .set('Authorization', `Bearer ${authToken}`)
        .field('country', 'Thailand')
        .field('travelPeriod', 'invalid json')
        .expect(400);

      expect(response.body.message).toContain('Invalid JSON format');
    });

    it('should fail validation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/tripDetail')
        .set('Authorization', `Bearer ${authToken}`)
        .field('travelPeriod', JSON.stringify({ startDate: '2024-03-01', endDate: '2024-03-15' }))
        .field('visitedPlaces', JSON.stringify([]))
        .field('accommodations', JSON.stringify([]))
        .field('transportations', JSON.stringify([]))
        .field('budgetItems', JSON.stringify([]))
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle cloudinary upload errors', async () => {
      cloudinary.uploader.upload.mockRejectedValueOnce(new Error('Upload failed'));

      const tripData = {
        country: 'Thailand',
        travelPeriod: JSON.stringify({ startDate: '2024-03-01', endDate: '2024-03-15' }),
        visitedPlaces: JSON.stringify([{ name: 'Bangkok', description: 'City', rating: 5 }]),
        accommodations: JSON.stringify([{ name: 'Hotel', type: 'Hotel', cost: 80 }]),
        transportations: JSON.stringify([{ type: 'Taxi', cost: 10 }]),
        budgetItems: JSON.stringify([{ category: 'Food', amount: 400 }])
      };

      const response = await request(app)
        .post('/api/tripDetail')
        .set('Authorization', `Bearer ${authToken}`)
        .field('country', tripData.country)
        .field('travelPeriod', tripData.travelPeriod)
        .field('visitedPlaces', tripData.visitedPlaces)
        .field('accommodations', tripData.accommodations)
        .field('transportations', tripData.transportations)
        .field('budgetItems', tripData.budgetItems)
        .attach('photos', Buffer.from('fake image'), 'test.jpg')
        .expect(500);

      expect(response.body.message).toBe('Error creating trip');
    });
  });

  describe('GET /api/tripDetail/all', () => {
    it('should fetch all trips', async () => {
      const response = await request(app)
        .get('/api/tripDetail/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].country).toBeDefined();
    });

    it('should populate user information', async () => {
      const response = await request(app)
        .get('/api/tripDetail/all')
        .expect(200);

      expect(response.body[0].userId).toBeDefined();
      expect(response.body[0].userId.username).toBe('triptester');
    });

    it('should handle errors when fetching all trips', async () => {
      jest.spyOn(TripDetail, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      const response = await request(app)
        .get('/api/tripDetail/all')
        .expect(500);

      expect(response.body.message).toBe('Error fetching trips');
    });
  });

  describe('GET /api/tripDetail/:tripId', () => {
    it('should fetch a trip by ID', async () => {
      const response = await request(app)
        .get(`/api/tripDetail/${testTrip._id}`)
        .expect(200);

      expect(response.body._id).toBe(testTrip._id.toString());
      expect(response.body.country).toBe('Japan');
    });

    it('should return 404 for non-existent trip', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/tripDetail/${fakeId}`)
        .expect(404);

      expect(response.body.message).toBe('Trip not found');
    });

    it('should return 400 for invalid trip ID', async () => {
      const response = await request(app)
        .get('/api/tripDetail/undefined')
        .expect(400);

      expect(response.body.message).toBe('Invalid trip ID');
    });

    it('should handle server errors', async () => {
      jest.spyOn(TripDetail, 'findById').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get(`/api/tripDetail/${testTrip._id}`)
        .expect(500);

      expect(response.body.message).toBe('Server error');
    });
  });

  describe('GET /api/tripDetail/user/trips', () => {
    it('should fetch trips for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tripDetail/user/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].userId.toString()).toBe(testUser._id.toString());
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/tripDetail/user/trips')
        .expect(401);

      expect(response.body.message).toContain('No token provided');
    });

    it('should return 404 when user has no trips', async () => {
      // Delete all trips
      await TripDetail.deleteMany({ userId: testUser._id });

      const response = await request(app)
        .get('/api/tripDetail/user/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('no trips found for this user.');
    });

    it('should handle server errors', async () => {
      jest.spyOn(TripDetail, 'find').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/tripDetail/user/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.message).toBe('Server error.');
    });
  });

  describe('GET /api/tripDetail/user/:username', () => {
    it('should fetch trips by username', async () => {
      const response = await request(app)
        .get(`/api/tripDetail/user/${testUser.username}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].country).toBe('Japan');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/tripDetail/user/nonexistentuser')
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 when user has no trips', async () => {
      // Create user without trips
      const userNoTrips = await User.create({
        username: 'notraveler',
        email: 'notrips@example.com',
        password: 'hashedpass',
        verifiedEmail: true
      });

      const response = await request(app)
        .get(`/api/tripDetail/user/${userNoTrips.username}`)
        .expect(404);

      expect(response.body.message).toBe('No trips found for this user');
    });

    it('should handle server errors', async () => {
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get(`/api/tripDetail/user/${testUser.username}`)
        .expect(500);

      expect(response.body.message).toBe('Server error');
    });
  });

  describe('DELETE /api/tripDetail/:id', () => {
    it('should delete a trip and its photos', async () => {
      const response = await request(app)
        .delete(`/api/tripDetail/${testTrip._id}`)
        .expect(200);

      expect(response.body.message).toBe('Trip deleted successfully');
      expect(response.body.trip._id).toBe(testTrip._id.toString());

      // Verify trip was deleted
      const deletedTrip = await TripDetail.findById(testTrip._id);
      expect(deletedTrip).toBeNull();

      // Verify cloudinary destroy was called
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('photo1');
    });

    it('should remove trip from user trips array', async () => {
      // Add trip to user's trips array
      await User.findByIdAndUpdate(testUser._id, { $push: { trips: testTrip._id } });

      await request(app)
        .delete(`/api/tripDetail/${testTrip._id}`)
        .expect(200);

      // Verify trip was removed from user
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.trips).not.toContain(testTrip._id);
    });

    it('should return 404 for non-existent trip', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/tripDetail/${fakeId}`)
        .expect(404);

      expect(response.body.message).toBe('Trip not found');
    });

    it('should handle cloudinary deletion errors gracefully', async () => {
      cloudinary.uploader.destroy.mockRejectedValueOnce(new Error('Cloudinary error'));

      const response = await request(app)
        .delete(`/api/tripDetail/${testTrip._id}`)
        .expect(200);

      expect(response.body.message).toBe('Trip deleted successfully');
    });

    it('should handle server errors', async () => {
      jest.spyOn(TripDetail, 'findById').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/tripDetail/${testTrip._id}`)
        .expect(500);

      expect(response.body.message).toBe('Server error');
    });
  });

  describe('PUT /api/tripDetail/:tripId', () => {
    it('should update a trip with new data', async () => {
      const updateData = {
        country: 'Updated Japan',
        travelPeriod: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-20' }),
        visitedPlaces: JSON.stringify([{ name: 'Kyoto', description: 'Traditional', rating: 5 }]),
        accommodations: JSON.stringify([{ name: 'Ryokan', type: 'Traditional', cost: 200 }]),
        transportations: JSON.stringify([{ type: 'Bullet Train', cost: 100 }]),
        weatherNotes: 'Updated weather',
        clothingTips: 'Updated tips',
        budgetItems: JSON.stringify([{ category: 'Transportation', amount: 600 }]),
        deletedPhotos: JSON.stringify([])
      };

      const response = await request(app)
        .put(`/api/tripDetail/${testTrip._id}`)
        .field('country', updateData.country)
        .field('travelPeriod', updateData.travelPeriod)
        .field('visitedPlaces', updateData.visitedPlaces)
        .field('accommodations', updateData.accommodations)
        .field('transportations', updateData.transportations)
        .field('weatherNotes', updateData.weatherNotes)
        .field('clothingTips', updateData.clothingTips)
        .field('budgetItems', updateData.budgetItems)
        .field('deletedPhotos', updateData.deletedPhotos)
        .expect(200);

      expect(response.body.message).toBe('Trip updated successfully');
      expect(response.body.trip.country).toBe('Updated Japan');
      expect(response.body.redirectUrl).toContain('/trip/');
    });

    it('should add new photos and keep existing ones', async () => {
      const updateData = {
        country: 'Japan',
        travelPeriod: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-10' }),
        visitedPlaces: JSON.stringify([{ name: 'Tokyo', description: 'City', rating: 5 }]),
        accommodations: JSON.stringify([{ name: 'Hotel', type: 'Hotel', cost: 100 }]),
        transportations: JSON.stringify([{ type: 'Train', cost: 50 }]),
        budgetItems: JSON.stringify([{ category: 'Food', amount: 500 }]),
        deletedPhotos: JSON.stringify([])
      };

      const response = await request(app)
        .put(`/api/tripDetail/${testTrip._id}`)
        .field('country', updateData.country)
        .field('travelPeriod', updateData.travelPeriod)
        .field('visitedPlaces', updateData.visitedPlaces)
        .field('accommodations', updateData.accommodations)
        .field('transportations', updateData.transportations)
        .field('budgetItems', updateData.budgetItems)
        .field('deletedPhotos', updateData.deletedPhotos)
        .attach('photos', Buffer.from('new image'), 'new.jpg')
        .expect(200);

      expect(response.body.trip.photos.length).toBe(2); // 1 existing + 1 new
    });

    it('should delete specified photos', async () => {
      const photoToDelete = {
        id: testTrip.photos[0]._id.toString(),
        public_id: testTrip.photos[0].public_id
      };

      const updateData = {
        country: 'Japan',
        travelPeriod: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-10' }),
        visitedPlaces: JSON.stringify([{ name: 'Tokyo', description: 'City', rating: 5 }]),
        accommodations: JSON.stringify([{ name: 'Hotel', type: 'Hotel', cost: 100 }]),
        transportations: JSON.stringify([{ type: 'Train', cost: 50 }]),
        budgetItems: JSON.stringify([{ category: 'Food', amount: 500 }]),
        deletedPhotos: JSON.stringify([photoToDelete])
      };

      const response = await request(app)
        .put(`/api/tripDetail/${testTrip._id}`)
        .field('country', updateData.country)
        .field('travelPeriod', updateData.travelPeriod)
        .field('visitedPlaces', updateData.visitedPlaces)
        .field('accommodations', updateData.accommodations)
        .field('transportations', updateData.transportations)
        .field('budgetItems', updateData.budgetItems)
        .field('deletedPhotos', updateData.deletedPhotos)
        .expect(200);

      expect(response.body.trip.photos.length).toBe(0);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(photoToDelete.public_id);
    });

    it('should return 404 for non-existent trip', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        country: 'Japan',
        travelPeriod: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-10' }),
        visitedPlaces: JSON.stringify([{ name: 'Tokyo', description: 'City', rating: 5 }]),
        accommodations: JSON.stringify([{ name: 'Hotel', type: 'Hotel', cost: 100 }]),
        transportations: JSON.stringify([{ type: 'Train', cost: 50 }]),
        budgetItems: JSON.stringify([{ category: 'Food', amount: 500 }]),
        deletedPhotos: JSON.stringify([])
      };

      const response = await request(app)
        .put(`/api/tripDetail/${fakeId}`)
        .field('country', updateData.country)
        .field('travelPeriod', updateData.travelPeriod)
        .field('visitedPlaces', updateData.visitedPlaces)
        .field('accommodations', updateData.accommodations)
        .field('transportations', updateData.transportations)
        .field('budgetItems', updateData.budgetItems)
        .field('deletedPhotos', updateData.deletedPhotos)
        .expect(404);

      expect(response.body.message).toBe('Trip not found');
    });

    it('should fail with invalid JSON format', async () => {
      const response = await request(app)
        .put(`/api/tripDetail/${testTrip._id}`)
        .field('country', 'Japan')
        .field('travelPeriod', 'invalid json')
        .expect(400);

      expect(response.body.message).toContain('Invalid JSON format');
    });

    it('should fail validation with invalid data', async () => {
      const updateData = {
        travelPeriod: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-10' }),
        visitedPlaces: JSON.stringify([]),
        accommodations: JSON.stringify([]),
        transportations: JSON.stringify([]),
        budgetItems: JSON.stringify([]),
        deletedPhotos: JSON.stringify([])
      };

      const response = await request(app)
        .put(`/api/tripDetail/${testTrip._id}`)
        .field('travelPeriod', updateData.travelPeriod)
        .field('visitedPlaces', updateData.visitedPlaces)
        .field('accommodations', updateData.accommodations)
        .field('transportations', updateData.transportations)
        .field('budgetItems', updateData.budgetItems)
        .field('deletedPhotos', updateData.deletedPhotos)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });
});

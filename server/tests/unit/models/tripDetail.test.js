const mongoose = require('mongoose');
const TripDetail = require('../../../models/TripDetail');
const User = require('../../../models/User');
const { connect, closeDatabase, clearDatabase } = require('../../setup/testDb');
const { validUser } = require('../../fixtures/users');

describe('TripDetail Model', () => {
  let testUser;

  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Create a test user for trip associations
    testUser = await User.create(validUser);
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should require userId', async () => {
        const trip = new TripDetail({
          country: 'France'
        });

        await expect(trip.save()).rejects.toThrow();
      });

      it('should create trip with only required userId', async () => {
        const trip = new TripDetail({
          userId: testUser._id
        });

        const savedTrip = await trip.save();
        expect(savedTrip.userId).toEqual(testUser._id);
      });
    });

    describe('User Reference', () => {
      it('should store valid user reference', async () => {
        const trip = new TripDetail({
          userId: testUser._id,
          country: 'Japan'
        });

        const savedTrip = await trip.save();
        expect(savedTrip.userId).toEqual(testUser._id);
      });

      it('should populate user reference', async () => {
        const trip = await TripDetail.create({
          userId: testUser._id,
          country: 'Japan'
        });

        const populatedTrip = await TripDetail.findById(trip._id).populate('userId');
        expect(populatedTrip.userId.email).toBe(testUser.email);
        expect(populatedTrip.userId.username).toBe(testUser.username);
      });
    });
  });

  describe('Optional Fields', () => {
    it('should save trip with country', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Italy'
      });

      const savedTrip = await trip.save();
      expect(savedTrip.country).toBe('Italy');
    });

    it('should save trip with travel period', async () => {
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-10');

      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Spain',
        travelPeriod: {
          startDate,
          endDate
        }
      });

      const savedTrip = await trip.save();
      expect(savedTrip.travelPeriod.startDate).toEqual(startDate);
      expect(savedTrip.travelPeriod.endDate).toEqual(endDate);
    });

    it('should save trip with weather notes', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Iceland',
        weatherNotes: 'Cold and rainy, bring warm clothes'
      });

      const savedTrip = await trip.save();
      expect(savedTrip.weatherNotes).toBe('Cold and rainy, bring warm clothes');
    });

    it('should save trip with clothing tips', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Dubai',
        clothingTips: 'Light clothing, sunscreen, and hat recommended'
      });

      const savedTrip = await trip.save();
      expect(savedTrip.clothingTips).toBe('Light clothing, sunscreen, and hat recommended');
    });
  });

  describe('Visited Places Array', () => {
    it('should initialize visited places as empty array', async () => {
      const trip = new TripDetail({
        userId: testUser._id
      });

      const savedTrip = await trip.save();
      expect(savedTrip.visitedPlaces).toEqual([]);
    });

    it('should save trip with visited places', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'France',
        visitedPlaces: [
          { name: 'Eiffel Tower', description: 'Iconic Paris landmark' },
          { name: 'Louvre Museum', description: 'World famous art museum' }
        ]
      });

      const savedTrip = await trip.save();
      expect(savedTrip.visitedPlaces).toHaveLength(2);
      expect(savedTrip.visitedPlaces[0].name).toBe('Eiffel Tower');
      expect(savedTrip.visitedPlaces[1].name).toBe('Louvre Museum');
    });

    it('should add visited place to existing trip', async () => {
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'Japan'
      });

      trip.visitedPlaces.push({
        name: 'Mount Fuji',
        description: 'Beautiful mountain'
      });

      const updatedTrip = await trip.save();
      expect(updatedTrip.visitedPlaces).toHaveLength(1);
      expect(updatedTrip.visitedPlaces[0].name).toBe('Mount Fuji');
    });
  });

  describe('Accommodations Array', () => {
    it('should initialize accommodations as empty array', async () => {
      const trip = new TripDetail({
        userId: testUser._id
      });

      const savedTrip = await trip.save();
      expect(savedTrip.accommodations).toEqual([]);
    });

    it('should save trip with accommodations', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Italy',
        accommodations: [
          {
            name: 'Rome Hotel',
            type: 'Hotel',
            bookingPlatform: 'Booking.com',
            cost: 150
          },
          {
            name: 'Venice Airbnb',
            type: 'Apartment',
            bookingPlatform: 'Airbnb',
            cost: 100
          }
        ]
      });

      const savedTrip = await trip.save();
      expect(savedTrip.accommodations).toHaveLength(2);
      expect(savedTrip.accommodations[0].name).toBe('Rome Hotel');
      expect(savedTrip.accommodations[0].cost).toBe(150);
      expect(savedTrip.accommodations[1].type).toBe('Apartment');
    });
  });

  describe('Transportations Array', () => {
    it('should initialize transportations as empty array', async () => {
      const trip = new TripDetail({
        userId: testUser._id
      });

      const savedTrip = await trip.save();
      expect(savedTrip.transportations).toEqual([]);
    });

    it('should save trip with transportations', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Spain',
        transportations: [
          {
            type: 'Flight',
            from: 'New York',
            to: 'Madrid',
            bookingPlatform: 'Expedia',
            cost: 500
          },
          {
            type: 'Train',
            from: 'Madrid',
            to: 'Barcelona',
            bookingPlatform: 'Renfe',
            cost: 50
          }
        ]
      });

      const savedTrip = await trip.save();
      expect(savedTrip.transportations).toHaveLength(2);
      expect(savedTrip.transportations[0].type).toBe('Flight');
      expect(savedTrip.transportations[0].cost).toBe(500);
      expect(savedTrip.transportations[1].from).toBe('Madrid');
    });
  });

  describe('Budget Items Array', () => {
    it('should initialize budget items as empty array', async () => {
      const trip = new TripDetail({
        userId: testUser._id
      });

      const savedTrip = await trip.save();
      expect(savedTrip.budgetItems).toEqual([]);
    });

    it('should save trip with budget items', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Thailand',
        budgetItems: [
          { category: 'Food', description: 'Street food and restaurants', amount: 200 },
          { category: 'Activities', description: 'Tours and excursions', amount: 300 },
          { category: 'Shopping', description: 'Souvenirs', amount: 100 }
        ]
      });

      const savedTrip = await trip.save();
      expect(savedTrip.budgetItems).toHaveLength(3);
      expect(savedTrip.budgetItems[0].category).toBe('Food');
      expect(savedTrip.budgetItems[0].amount).toBe(200);
      expect(savedTrip.budgetItems[2].description).toBe('Souvenirs');
    });

    it('should calculate total budget from budget items', async () => {
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'Japan',
        budgetItems: [
          { category: 'Food', amount: 500 },
          { category: 'Accommodation', amount: 1000 },
          { category: 'Transport', amount: 300 }
        ]
      });

      const totalBudget = trip.budgetItems.reduce((sum, item) => sum + item.amount, 0);
      expect(totalBudget).toBe(1800);
    });
  });

  describe('Photos Array', () => {
    it('should initialize photos as empty array', async () => {
      const trip = new TripDetail({
        userId: testUser._id
      });

      const savedTrip = await trip.save();
      expect(savedTrip.photos).toEqual([]);
    });

    it('should save trip with photos', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Greece',
        photos: [
          { url: 'https://example.com/photo1.jpg', public_id: 'photo1' },
          { url: 'https://example.com/photo2.jpg', public_id: 'photo2' }
        ]
      });

      const savedTrip = await trip.save();
      expect(savedTrip.photos).toHaveLength(2);
      expect(savedTrip.photos[0].url).toBe('https://example.com/photo1.jpg');
      expect(savedTrip.photos[1].public_id).toBe('photo2');
    });
  });

  describe('Timestamp', () => {
    it('should automatically set createdAt timestamp', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Australia'
      });

      const savedTrip = await trip.save();
      expect(savedTrip.createdAt).toBeInstanceOf(Date);
    });

    it('should use current date for createdAt by default', async () => {
      const beforeCreate = Date.now();
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'New Zealand'
      });
      const afterCreate = Date.now();

      expect(trip.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate);
      expect(trip.createdAt.getTime()).toBeLessThanOrEqual(afterCreate);
    });
  });

  describe('Complex Trip Creation', () => {
    it('should create comprehensive trip with all fields', async () => {
      const trip = new TripDetail({
        userId: testUser._id,
        country: 'Japan',
        travelPeriod: {
          startDate: new Date('2024-03-15'),
          endDate: new Date('2024-03-25')
        },
        visitedPlaces: [
          { name: 'Tokyo Tower', description: 'Iconic landmark' },
          { name: 'Mount Fuji', description: 'Sacred mountain' }
        ],
        accommodations: [
          { name: 'Tokyo Hotel', type: 'Hotel', bookingPlatform: 'Booking.com', cost: 120 }
        ],
        transportations: [
          { type: 'Flight', from: 'NYC', to: 'Tokyo', bookingPlatform: 'Expedia', cost: 800 }
        ],
        weatherNotes: 'Cool spring weather',
        clothingTips: 'Layers recommended',
        budgetItems: [
          { category: 'Food', description: 'Sushi and ramen', amount: 300 }
        ],
        photos: [
          { url: 'https://example.com/fuji.jpg', public_id: 'fuji_001' }
        ]
      });

      const savedTrip = await trip.save();

      expect(savedTrip.country).toBe('Japan');
      expect(savedTrip.visitedPlaces).toHaveLength(2);
      expect(savedTrip.accommodations).toHaveLength(1);
      expect(savedTrip.transportations).toHaveLength(1);
      expect(savedTrip.budgetItems).toHaveLength(1);
      expect(savedTrip.photos).toHaveLength(1);
      expect(savedTrip.weatherNotes).toBeDefined();
      expect(savedTrip.clothingTips).toBeDefined();
    });
  });

  describe('Model Methods', () => {
    it('should find trip by id', async () => {
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'Canada'
      });

      const foundTrip = await TripDetail.findById(trip._id);
      expect(foundTrip).toBeDefined();
      expect(foundTrip.country).toBe('Canada');
    });

    it('should find trips by userId', async () => {
      await TripDetail.create({ userId: testUser._id, country: 'USA' });
      await TripDetail.create({ userId: testUser._id, country: 'Mexico' });
      await TripDetail.create({ userId: testUser._id, country: 'Canada' });

      const userTrips = await TripDetail.find({ userId: testUser._id });
      expect(userTrips).toHaveLength(3);
    });

    it('should update trip fields', async () => {
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'Germany'
      });

      trip.country = 'France';
      trip.weatherNotes = 'Updated weather info';
      const updatedTrip = await trip.save();

      expect(updatedTrip.country).toBe('France');
      expect(updatedTrip.weatherNotes).toBe('Updated weather info');
    });

    it('should delete trip', async () => {
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'Portugal'
      });

      await TripDetail.findByIdAndDelete(trip._id);
      const deletedTrip = await TripDetail.findById(trip._id);

      expect(deletedTrip).toBeNull();
    });
  });

  describe('Array Modifications', () => {
    it('should add multiple visited places', async () => {
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'Italy'
      });

      trip.visitedPlaces.push(
        { name: 'Colosseum', description: 'Ancient amphitheater' },
        { name: 'Vatican', description: 'Holy See' },
        { name: 'Trevi Fountain', description: 'Baroque fountain' }
      );

      const updatedTrip = await trip.save();
      expect(updatedTrip.visitedPlaces).toHaveLength(3);
    });

    it('should remove accommodation from array', async () => {
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'Spain',
        accommodations: [
          { name: 'Hotel A', type: 'Hotel', cost: 100 },
          { name: 'Hotel B', type: 'Hotel', cost: 150 }
        ]
      });

      trip.accommodations.splice(0, 1); // Remove first accommodation
      const updatedTrip = await trip.save();

      expect(updatedTrip.accommodations).toHaveLength(1);
      expect(updatedTrip.accommodations[0].name).toBe('Hotel B');
    });

    it('should update budget item in array', async () => {
      const trip = await TripDetail.create({
        userId: testUser._id,
        country: 'France',
        budgetItems: [
          { category: 'Food', description: 'Meals', amount: 200 }
        ]
      });

      trip.budgetItems[0].amount = 250;
      const updatedTrip = await trip.save();

      expect(updatedTrip.budgetItems[0].amount).toBe(250);
    });
  });
});

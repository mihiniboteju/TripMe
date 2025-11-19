const { connect, closeDatabase, clearDatabase } = require('../setup/testDb');

describe('Test Infrastructure Verification', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Basic Jest Configuration', () => {
    it('should run a simple test', () => {
      expect(1 + 1).toBe(2);
    });

    it('should have access to environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.PORT).toBe('5555');
    });
  });

  describe('MongoDB Memory Server', () => {
    it('should connect to in-memory database', async () => {
      const mongoose = require('mongoose');
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });

    it('should be able to create a test collection', async () => {
      const mongoose = require('mongoose');
      const TestSchema = new mongoose.Schema({ name: String });
      const TestModel = mongoose.model('Test', TestSchema);
      
      const doc = await TestModel.create({ name: 'test' });
      expect(doc.name).toBe('test');
      expect(doc._id).toBeDefined();
    });

    it('should clear database between tests', async () => {
      const mongoose = require('mongoose');
      const collections = await mongoose.connection.db.collections();
      
      // All collections should be empty after clearDatabase() is called
      for (let collection of collections) {
        const count = await collection.countDocuments();
        expect(count).toBe(0);
      }
    });
  });

  describe('Test Fixtures', () => {
    it('should be able to import user fixtures', () => {
      const { generateUser, validUser } = require('../fixtures/users');
      
      expect(validUser).toBeDefined();
      expect(validUser.email).toBe('test@example.com');
      
      const generatedUser = generateUser();
      expect(generatedUser.email).toBeDefined();
      expect(generatedUser.username).toBeDefined();
    });

    it('should be able to import trip fixtures', () => {
      const { generateTrip, validTrip } = require('../fixtures/trips');
      
      expect(validTrip).toBeDefined();
      expect(validTrip.destination).toBe('Paris');
      
      const generatedTrip = generateTrip('test-user-id');
      expect(generatedTrip.userId).toBe('test-user-id');
      expect(generatedTrip.destination).toBeDefined();
    });

    it('should be able to import post fixtures', () => {
      const { generatePost, validPost } = require('../fixtures/posts');
      
      expect(validPost).toBeDefined();
      expect(validPost.title).toBeDefined();
      
      const generatedPost = generatePost('test-user-id');
      expect(generatedPost.userId).toBe('test-user-id');
      expect(generatedPost.title).toBeDefined();
    });
  });

  describe('Faker Integration', () => {
    it('should generate random user data', () => {
      const { generateUsers } = require('../fixtures/users');
      const users = generateUsers(5);
      
      expect(users).toHaveLength(5);
      users.forEach(user => {
        expect(user.email).toBeDefined();
        expect(user.username).toBeDefined();
        expect(user.password).toBe('Test1234!@#$');
      });
    });

    it('should generate unique data for each user', () => {
      const { generateUsers } = require('../fixtures/users');
      const users = generateUsers(3);
      
      const emails = users.map(u => u.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(3); // All emails should be unique
    });
  });
});

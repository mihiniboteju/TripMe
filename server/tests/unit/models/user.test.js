const mongoose = require('mongoose');
const User = require('../../../models/User');
const { connect, closeDatabase, clearDatabase } = require('../../setup/testDb');
const { generateUser, validUser, completeUser } = require('../../fixtures/users');

describe('User Model', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should require username', async () => {
        const user = new User({
          email: 'test@example.com',
          password: 'Test1234!@#$'
        });

        await expect(user.save()).rejects.toThrow('Username is required');
      });

      it('should require email', async () => {
        const user = new User({
          username: 'testuser',
          password: 'Test1234!@#$'
        });

        await expect(user.save()).rejects.toThrow('Email is required');
      });

      it('should require password', async () => {
        const user = new User({
          username: 'testuser',
          email: 'test@example.com'
        });

        await expect(user.save()).rejects.toThrow('Password is required');
      });
    });

    describe('Username Validation', () => {
      it('should create user with valid username', async () => {
        const user = new User(validUser);
        const savedUser = await user.save();

        expect(savedUser.username).toBe(validUser.username);
      });

      it('should reject username shorter than 3 characters', async () => {
        const user = new User({
          ...validUser,
          username: 'ab'
        });

        await expect(user.save()).rejects.toThrow('Username must be at least 3 characters');
      });

      it('should trim whitespace from username', async () => {
        const user = new User({
          ...validUser,
          username: '  testuser  '
        });

        const savedUser = await user.save();
        expect(savedUser.username).toBe('testuser');
      });

      it('should enforce unique username constraint', async () => {
        await User.create(validUser);

        const duplicateUser = new User({
          ...validUser,
          email: 'different@example.com'
        });

        await expect(duplicateUser.save()).rejects.toThrow();
      });
    });

    describe('Email Validation', () => {
      it('should create user with valid email', async () => {
        const user = new User(validUser);
        const savedUser = await user.save();

        expect(savedUser.email).toBe(validUser.email.toLowerCase());
      });

      it('should convert email to lowercase', async () => {
        const user = new User({
          ...validUser,
          email: 'TEST@EXAMPLE.COM'
        });

        const savedUser = await user.save();
        expect(savedUser.email).toBe('test@example.com');
      });

      it('should trim whitespace from email', async () => {
        const user = new User({
          ...validUser,
          email: '  test@example.com  '
        });

        const savedUser = await user.save();
        expect(savedUser.email).toBe('test@example.com');
      });

      it('should reject invalid email format', async () => {
        const invalidEmails = [
          'notanemail',
          'missing@domain',
          '@nodomain.com',
          'spaces in@email.com',
          'missing.domain@',
        ];

        for (const email of invalidEmails) {
          const user = new User({
            ...validUser,
            username: `user_${email}`,
            email
          });

          await expect(user.save()).rejects.toThrow('Please enter a valid email');
        }
      });

      it('should enforce unique email constraint', async () => {
        await User.create(validUser);

        const duplicateUser = new User({
          ...validUser,
          username: 'differentuser'
        });

        await expect(duplicateUser.save()).rejects.toThrow();
      });
    });

    describe('Password Validation', () => {
      it('should accept password with minimum 8 characters', async () => {
        const user = new User({
          ...validUser,
          password: 'Pass1234'
        });

        const savedUser = await user.save();
        expect(savedUser.password).toBe('Pass1234');
      });

      it('should reject password shorter than 8 characters', async () => {
        const user = new User({
          ...validUser,
          password: 'Pass123'
        });

        await expect(user.save()).rejects.toThrow('Password must be at least 8 characters');
      });

      it('should store password as plain text (hashing should be done in controller)', async () => {
        const user = new User(validUser);
        const savedUser = await user.save();

        // Model doesn't hash - this is done in auth routes
        expect(savedUser.password).toBe(validUser.password);
      });
    });
  });

  describe('Default Values', () => {
    it('should set default values for optional fields', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test1234!@#$'
      });

      const savedUser = await user.save();

      expect(savedUser.verifiedEmail).toBe(false);
      expect(savedUser.gender).toBe('N/A');
      expect(savedUser.language).toBe('English');
      expect(savedUser.country).toBe('');
      expect(savedUser.city).toBe('');
    });

    it('should override default values when provided', async () => {
      const user = new User({
        ...validUser,
        verifiedEmail: true,
        gender: 'Male',
        language: 'Spanish',
        country: 'Spain',
        city: 'Barcelona'
      });

      const savedUser = await user.save();

      expect(savedUser.verifiedEmail).toBe(true);
      expect(savedUser.gender).toBe('Male');
      expect(savedUser.language).toBe('Spanish');
      expect(savedUser.country).toBe('Spain');
      expect(savedUser.city).toBe('Barcelona');
    });
  });

  describe('Optional Profile Fields', () => {
    it('should save user with all profile fields', async () => {
      const user = new User(completeUser);
      const savedUser = await user.save();

      expect(savedUser.firstName).toBe(completeUser.firstName);
      expect(savedUser.lastName).toBe(completeUser.lastName);
      expect(savedUser.gender).toBe(completeUser.gender);
      expect(savedUser.language).toBe(completeUser.language);
      expect(savedUser.dob).toBe(completeUser.dob);
      expect(savedUser.tel).toBe(completeUser.tel);
      expect(savedUser.country).toBe(completeUser.country);
      expect(savedUser.city).toBe(completeUser.city);
    });

    it('should save user with social media links', async () => {
      const user = new User(completeUser);
      const savedUser = await user.save();

      expect(savedUser.twitter).toBe(completeUser.twitter);
      expect(savedUser.facebook).toBe(completeUser.facebook);
      expect(savedUser.instagram).toBe(completeUser.instagram);
    });

    it('should trim whitespace from profile fields', async () => {
      const user = new User({
        ...validUser,
        firstName: '  John  ',
        lastName: '  Doe  ',
        tel: '  +1234567890  '
      });

      const savedUser = await user.save();

      expect(savedUser.firstName).toBe('John');
      expect(savedUser.lastName).toBe('Doe');
      expect(savedUser.tel).toBe('+1234567890');
    });
  });

  describe('Gender Enum', () => {
    it('should accept valid gender values', async () => {
      const validGenders = ['Male', 'Female', 'N/A'];

      for (let i = 0; i < validGenders.length; i++) {
        const gender = validGenders[i];
        const user = new User({
          ...validUser,
          username: `user${i}`,
          email: `user${i}@example.com`,
          gender
        });

        const savedUser = await user.save();
        expect(savedUser.gender).toBe(gender);
      }
    });

    it('should reject invalid gender values', async () => {
      const user = new User({
        ...validUser,
        gender: 'InvalidGender'
      });

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Email Verification Fields', () => {
    it('should store email verification OTP', async () => {
      const user = new User({
        ...validUser,
        verifyEmailOTP: '123456',
        verifyEmailOTPExpires: new Date(Date.now() + 3600000)
      });

      const savedUser = await user.save();

      expect(savedUser.verifyEmailOTP).toBe('123456');
      expect(savedUser.verifyEmailOTPExpires).toBeInstanceOf(Date);
    });

    it('should allow verified email to be set to true', async () => {
      const user = new User({
        ...validUser,
        verifiedEmail: true
      });

      const savedUser = await user.save();
      expect(savedUser.verifiedEmail).toBe(true);
    });
  });

  describe('Password Reset Fields', () => {
    it('should store password reset token and expiry', async () => {
      const user = new User(validUser);
      const savedUser = await user.save();

      savedUser.resetPasswordToken = 'reset-token-123';
      savedUser.resetPasswordExpires = new Date(Date.now() + 3600000);

      const updatedUser = await savedUser.save();

      expect(updatedUser.resetPasswordToken).toBe('reset-token-123');
      expect(updatedUser.resetPasswordExpires).toBeInstanceOf(Date);
    });
  });

  describe('Profile Pictures', () => {
    it('should store avatar and cover image URLs', async () => {
      const user = new User({
        ...validUser,
        avatar: 'https://example.com/avatar.jpg',
        cover: 'https://example.com/cover.jpg'
      });

      const savedUser = await user.save();

      expect(savedUser.avatar).toBe('https://example.com/avatar.jpg');
      expect(savedUser.cover).toBe('https://example.com/cover.jpg');
    });
  });

  describe('Trips Reference', () => {
    it('should initialize trips as empty array', async () => {
      const user = new User(validUser);
      const savedUser = await user.save();

      expect(savedUser.trips).toEqual([]);
    });

    it('should store trip references', async () => {
      const tripId = new mongoose.Types.ObjectId();
      const user = new User({
        ...validUser,
        trips: [tripId]
      });

      const savedUser = await user.save();

      expect(savedUser.trips).toHaveLength(1);
      expect(savedUser.trips[0]).toEqual(tripId);
    });

    it('should store multiple trip references', async () => {
      const tripIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId()
      ];

      const user = new User({
        ...validUser,
        trips: tripIds
      });

      const savedUser = await user.save();

      expect(savedUser.trips).toHaveLength(3);
      expect(savedUser.trips).toEqual(tripIds);
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt and updatedAt timestamps', async () => {
      const user = new User(validUser);
      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const user = new User(validUser);
      const savedUser = await user.save();

      const originalUpdatedAt = savedUser.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedUser.firstName = 'Updated';
      const updatedUser = await savedUser.save();

      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Model Methods', () => {
    it('should retrieve user by id', async () => {
      const user = await User.create(validUser);
      const foundUser = await User.findById(user._id);

      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe(validUser.email);
    });

    it('should retrieve user by email', async () => {
      await User.create(validUser);
      const foundUser = await User.findOne({ email: validUser.email });

      expect(foundUser).toBeDefined();
      expect(foundUser.username).toBe(validUser.username);
    });

    it('should retrieve user by username', async () => {
      await User.create(validUser);
      const foundUser = await User.findOne({ username: validUser.username });

      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe(validUser.email);
    });

    it('should update user fields', async () => {
      const user = await User.create(validUser);

      user.firstName = 'Updated';
      user.lastName = 'Name';
      const updatedUser = await user.save();

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
    });

    it('should delete user', async () => {
      const user = await User.create(validUser);
      await User.findByIdAndDelete(user._id);

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple users with different data', async () => {
      const users = [
        generateUser(),
        generateUser(),
        generateUser()
      ];

      const savedUsers = await User.insertMany(users);

      expect(savedUsers).toHaveLength(3);
      savedUsers.forEach((user, index) => {
        expect(user.username).toBe(users[index].username);
        expect(user.email).toBe(users[index].email.toLowerCase());
      });
    });

    it('should validate that email uniqueness is case-insensitive', async () => {
      await User.create({
        ...validUser,
        email: 'test@example.com'
      });

      const duplicateUser = new User({
        ...validUser,
        username: 'differentuser',
        email: 'TEST@EXAMPLE.COM'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });
});

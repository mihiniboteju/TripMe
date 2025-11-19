const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../../models/User');
const authRoutes = require('../../routes/auth');
const { connect, closeDatabase, clearDatabase } = require('../setup/testDb');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock nodemailer
jest.mock('nodemailer');

describe('Auth Routes Integration Tests', () => {
  let mockTransporter;

  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Setup nodemailer mock
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };
    nodemailer.createTransport.mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    const validSignupData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234!@#$'
    };

    it('should create new user and send OTP email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP has been sent');

      // Verify user was created
      const user = await User.findOne({ email: validSignupData.email });
      expect(user).toBeDefined();
      expect(user.username).toBe(validSignupData.username);
      expect(user.verifiedEmail).toBe(false);
      expect(user.verifyEmailOTP).toBeDefined();
      expect(user.verifyEmailOTP).toMatch(/^\d{6}$/); // 6-digit OTP
      expect(user.verifyEmailOTPExpires).toBeDefined();

      // Verify password was hashed
      const isPasswordMatch = await bcrypt.compare(validSignupData.password, user.password);
      expect(isPasswordMatch).toBe(true);

      // Verify email was sent
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: validSignupData.email,
          subject: 'Email Verification OTP'
        })
      );
    });

    it('should fail when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Please fill all fields');
    });

    it('should fail when username already exists', async () => {
      // Create existing user
      await User.create({
        username: 'testuser',
        email: 'different@example.com',
        password: 'hashedpass'
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail when email already exists', async () => {
      // Create existing user
      await User.create({
        username: 'differentuser',
        email: 'test@example.com',
        password: 'hashedpass'
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should generate different OTPs for different users', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'user1',
          email: 'user1@example.com',
          password: 'Password123'
        });

      // Create second user
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'Password123'
        });

      const user1 = await User.findOne({ email: 'user1@example.com' });
      const user2 = await User.findOne({ email: 'user2@example.com' });

      // OTPs should be different (statistically)
      expect(user1.verifyEmailOTP).not.toBe(user2.verifyEmailOTP);
    });

    it('should set OTP expiration to 10 minutes from now', async () => {
      const beforeSignup = Date.now();
      
      await request(app)
        .post('/api/auth/signup')
        .send(validSignupData);

      const user = await User.findOne({ email: validSignupData.email });
      const afterSignup = Date.now();

      const expectedExpiry = 10 * 60 * 1000; // 10 minutes
      const actualExpiry = user.verifyEmailOTPExpires - beforeSignup;

      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe('POST /api/auth/verify-email-otp', () => {
    let testUser;
    const testOTP = '123456';

    beforeEach(async () => {
      // Create unverified user with OTP
      const hashedPass = await bcrypt.hash('Test1234!@#$', 10);
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPass,
        verifiedEmail: false,
        verifyEmailOTP: testOTP,
        verifyEmailOTPExpires: Date.now() + 10 * 60 * 1000
      });
    });

    it('should verify email with correct OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: testUser.email,
          otp: testOTP
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toMatchObject({
        username: testUser.username,
        email: testUser.email
      });

      // Verify database was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.verifiedEmail).toBe(true);
      expect(updatedUser.verifyEmailOTP).toBeUndefined();
      expect(updatedUser.verifyEmailOTPExpires).toBeUndefined();
    });

    it('should fail with invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: testUser.email,
          otp: '999999'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid OTP');
    });

    it('should fail with expired OTP', async () => {
      // Set OTP to expired
      testUser.verifyEmailOTPExpires = Date.now() - 1000;
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: testUser.email,
          otp: testOTP
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    it('should fail when email not found', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: 'nonexistent@example.com',
          otp: testOTP
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No user found');
    });

    it('should fail when email already verified', async () => {
      // Mark user as verified
      testUser.verifiedEmail = true;
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: testUser.email,
          otp: testOTP
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already verified');
    });

    it('should fail when email or OTP is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should return valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: testUser.email,
          otp: testOTP
        });

      const { token } = response.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(testUser._id.toString());
      expect(decoded.username).toBe(testUser.username);
    });
  });

  describe('POST /api/auth/signin', () => {
    let verifiedUser;
    const userPassword = 'Test1234!@#$';

    beforeEach(async () => {
      const hashedPass = await bcrypt.hash(userPassword, 10);
      verifiedUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPass,
        verifiedEmail: true
      });
    });

    it('should sign in with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: verifiedUser.email,
          password: userPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('success');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toMatchObject({
        username: verifiedUser.username,
        email: verifiedUser.email
      });
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: verifiedUser.email,
          password: 'WrongPassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: userPassword
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail when email is not verified', async () => {
      // Create unverified user
      const hashedPass = await bcrypt.hash(userPassword, 10);
      const unverifiedUser = await User.create({
        username: 'unverified',
        email: 'unverified@example.com',
        password: hashedPass,
        verifiedEmail: false
      });

      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: unverifiedUser.email,
          password: userPassword
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('verify your email');
    });

    it('should fail when email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({ email: verifiedUser.email })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Please fill all fields');
    });

    it('should return valid JWT token with user info', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: verifiedUser.email,
          password: userPassword
        });

      const { token } = response.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(verifiedUser._id.toString());
      expect(decoded.username).toBe(verifiedUser.username);
      // Token includes exp and iat claims
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should not expose password in response', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: verifiedUser.email,
          password: userPassword
        });

      expect(response.body.user.password).toBeUndefined();
    });
  });

  describe('GET /api/auth/verify', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpass',
        verifiedEmail: true
      });

      validToken = jwt.sign(
        {
          userId: testUser._id,
          username: testUser.username
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should verify valid token and return user', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user._id).toBe(testUser._id.toString());
    });

    it('should fail when no token provided', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should fail with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
      expect(response.body.expired).toBe(true);
    });

    it('should not return password in user object', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.body.user.password).toBeUndefined();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpass',
        verifiedEmail: true
      });
    });

    it('should send password reset email with valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Reset link sent');

      // Verify user has reset token
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.resetPasswordToken).toBeDefined();
      expect(updatedUser.resetPasswordToken).toHaveLength(40); // 20 bytes = 40 hex chars
      expect(updatedUser.resetPasswordExpires).toBeDefined();

      // Verify email was sent
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          subject: 'Password Reset'
        })
      );
    });

    it('should fail when email is not provided', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email is required');
    });

    it('should fail when user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No user with that email');
    });

    it('should set token expiration to 15 minutes', async () => {
      const beforeRequest = Date.now();

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      const updatedUser = await User.findById(testUser._id);
      const afterRequest = Date.now();

      const expectedExpiry = 15 * 60 * 1000; // 15 minutes
      const actualExpiry = updatedUser.resetPasswordExpires - beforeRequest;

      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it('should generate unique reset tokens for different requests', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      const user1 = await User.findById(testUser._id);
      const token1 = user1.resetPasswordToken;

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      const user2 = await User.findById(testUser._id);
      const token2 = user2.resetPasswordToken;

      expect(token1).not.toBe(token2);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let testUser;
    let resetToken;

    beforeEach(async () => {
      resetToken = 'valid-reset-token-123';
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: await bcrypt.hash('OldPassword123', 10),
        verifiedEmail: true,
        resetPasswordToken: resetToken,
        resetPasswordExpires: Date.now() + 15 * 60 * 1000
      });
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');

      // Verify password was changed
      const updatedUser = await User.findById(testUser._id);
      const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
      expect(isMatch).toBe(true);

      // Verify token was cleared
      expect(updatedUser.resetPasswordToken).toBeUndefined();
      expect(updatedUser.resetPasswordExpires).toBeUndefined();
    });

    it('should fail when token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'NewPassword123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should fail when newPassword is missing', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with expired token', async () => {
      // Set token to expired
      testUser.resetPasswordExpires = Date.now() - 1000;
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should hash the new password', async () => {
      const newPassword = 'NewPassword123';

      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword
        });

      const updatedUser = await User.findById(testUser._id);
      
      // Password should be hashed, not plain text
      expect(updatedUser.password).not.toBe(newPassword);
      expect(updatedUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Force an error by providing invalid data type
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'password'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Server Error');
    });
  });
});

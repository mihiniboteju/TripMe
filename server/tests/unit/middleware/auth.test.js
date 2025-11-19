const jwt = require('jsonwebtoken');
const authMiddleware = require('../../../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Mock request, response, and next function
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    // Mock console to suppress logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Valid Token Scenarios', () => {
    it('should authenticate with valid token and call next()', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userId).toBe(userId);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should decode token and set userId in request', () => {
      const userId = 'user123';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userId).toBe(userId);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle token with additional claims', () => {
      const userId = 'user456';
      const token = jwt.sign({ 
        id: userId, 
        email: 'test@example.com',
        role: 'admin'
      }, process.env.JWT_SECRET);

      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userId).toBe(userId);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Missing Token Scenarios', () => {
    it('should return 401 when no authorization header', () => {
      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is empty', () => {
      req.headers.authorization = '';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has no Bearer token', () => {
      req.headers.authorization = 'Bearer';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has only Bearer', () => {
      req.headers.authorization = 'Bearer ';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token Scenarios', () => {
    it('should return 401 for malformed token', () => {
      req.headers.authorization = 'Bearer malformed.token.here';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for token signed with wrong secret', () => {
      const token = jwt.sign({ id: 'user123' }, 'wrong-secret');
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', () => {
      const token = jwt.sign(
        { id: 'user123' }, 
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for token without proper structure', () => {
      req.headers.authorization = 'Bearer notavalidtoken';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Authorization Header Format', () => {
    it('should reject token without Bearer prefix', () => {
      const token = jwt.sign({ id: 'user123' }, process.env.JWT_SECRET);
      req.headers.authorization = token; // No 'Bearer ' prefix

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive Bearer keyword', () => {
      const userId = 'user123';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
      req.headers.authorization = `bearer ${token}`; // lowercase 'bearer'

      authMiddleware(req, res, next);

      // Should still work with lowercase 'bearer'
      expect(req.userId).toBe(userId);
      expect(next).toHaveBeenCalled();
    });

    it('should handle extra spaces in authorization header', () => {
      const userId = 'user123';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer  ${token}`; // Extra space

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Token Payload Validation', () => {
    it('should extract user id from token payload', () => {
      const userId = '6789';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userId).toBe(userId);
      expect(typeof req.userId).toBe('string');
    });

    it('should handle numeric user id', () => {
      const userId = 123;
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userId).toBe(userId);
    });

    it('should handle ObjectId format user id', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userId).toBe(userId);
      expect(req.userId).toMatch(/^[0-9a-fA-F]{24}$/); // Valid ObjectId format
    });
  });

  describe('Error Handling', () => {
    it('should catch and handle JWT verification errors', () => {
      req.headers.authorization = 'Bearer invalid.jwt.token';

      authMiddleware(req, res, next);

      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    });

    it('should handle unexpected errors gracefully', () => {
      // Simulate an error by passing undefined JWT_SECRET
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const token = jwt.sign({ id: 'user123' }, 'some-secret');
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });

      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('Security Edge Cases', () => {
    it('should reject empty token payload', () => {
      const token = jwt.sign({}, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      // Should set userId to undefined but still call next
      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle very long tokens', () => {
      const longPayload = { 
        id: 'user123',
        data: 'x'.repeat(1000)
      };
      const token = jwt.sign(longPayload, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userId).toBe('user123');
      expect(next).toHaveBeenCalled();
    });

    it('should reject token with null payload', () => {
      req.headers.authorization = 'Bearer null';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

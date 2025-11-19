const request = require('supertest');
const express = require('express');
const Post = require('../../models/Post');
const postRoutes = require('../../routes/posts');
const { connect, closeDatabase, clearDatabase } = require('../setup/testDb');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/', postRoutes);

describe('Post Routes Integration Tests', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/posts', () => {
    it('should fetch all posts', async () => {
      // Create test posts
      await Post.create([
        {
          comment: 'Great experience!',
          name: 'John Doe',
          img: 'https://example.com/img1.jpg',
          rating: 5
        },
        {
          comment: 'Amazing trip',
          name: 'Jane Smith',
          img: 'https://example.com/img2.jpg',
          rating: 4
        }
      ]);

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.posts).toBeDefined();
      expect(Array.isArray(response.body.data.posts)).toBe(true);
      expect(response.body.data.posts.length).toBe(2);
    });

    it('should return empty array when no posts exist', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.data.posts).toEqual([]);
    });

    it('should return all post fields', async () => {
      await Post.create({
        comment: 'Wonderful experience',
        name: 'Test User',
        img: 'https://example.com/test.jpg',
        rating: 5
      });

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      const post = response.body.data.posts[0];
      expect(post.comment).toBe('Wonderful experience');
      expect(post.name).toBe('Test User');
      expect(post.img).toBe('https://example.com/test.jpg');
      expect(post.rating).toBe(5);
    });

    it('should handle database errors', async () => {
      jest.spyOn(Post, 'find').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/posts')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch posts');
    });

    it('should handle large number of posts', async () => {
      // Create many posts
      const posts = Array.from({ length: 50 }, (_, i) => ({
        comment: `Great trip ${i + 1}`,
        name: `Traveler ${i + 1}`,
        img: `https://example.com/img${i + 1}.jpg`,
        rating: (i % 5) + 1
      }));

      await Post.create(posts);

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.data.posts.length).toBe(50);
    });

    it('should return posts with MongoDB _id field', async () => {
      await Post.create({
        comment: 'Test comment',
        name: 'Test User',
        img: 'https://example.com/test.jpg',
        rating: 4
      });

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      const post = response.body.data.posts[0];
      expect(post._id).toBeDefined();
      expect(typeof post._id).toBe('string');
    });

    it('should return posts with all schema fields', async () => {
      await Post.create({
        comment: 'Amazing destination',
        name: 'Sarah Johnson',
        img: 'https://example.com/photo.jpg',
        rating: 5
      });

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      const post = response.body.data.posts[0];
      expect(post._id).toBeDefined();
      expect(post.comment).toBeDefined();
      expect(post.name).toBeDefined();
      expect(post.img).toBeDefined();
      expect(post.rating).toBeDefined();
    });
  });
});

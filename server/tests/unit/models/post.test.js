const Post = require('../../../models/Post');
const { connect, closeDatabase, clearDatabase } = require('../../setup/testDb');

describe('Post Model', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Schema Fields', () => {
    it('should create post with all fields', async () => {
      const postData = {
        comment: 'Amazing trip to Paris!',
        name: 'John Doe',
        img: 'https://example.com/paris.jpg',
        rating: 5
      };

      const post = new Post(postData);
      const savedPost = await post.save();

      expect(savedPost.comment).toBe(postData.comment);
      expect(savedPost.name).toBe(postData.name);
      expect(savedPost.img).toBe(postData.img);
      expect(savedPost.rating).toBe(postData.rating);
    });

    it('should create post with only comment', async () => {
      const post = new Post({
        comment: 'Great experience!'
      });

      const savedPost = await post.save();
      expect(savedPost.comment).toBe('Great experience!');
      expect(savedPost.name).toBeUndefined();
      expect(savedPost.img).toBeUndefined();
      expect(savedPost.rating).toBeUndefined();
    });

    it('should create post with empty object', async () => {
      const post = new Post({});
      const savedPost = await post.save();

      expect(savedPost._id).toBeDefined();
      expect(savedPost.comment).toBeUndefined();
    });
  });

  describe('Comment Field', () => {
    it('should store string comment', async () => {
      const post = new Post({
        comment: 'This is a test comment'
      });

      const savedPost = await post.save();
      expect(savedPost.comment).toBe('This is a test comment');
    });

    it('should store long comment', async () => {
      const longComment = 'A'.repeat(1000);
      const post = new Post({
        comment: longComment
      });

      const savedPost = await post.save();
      expect(savedPost.comment).toBe(longComment);
      expect(savedPost.comment.length).toBe(1000);
    });
  });

  describe('Name Field', () => {
    it('should store user name', async () => {
      const post = new Post({
        name: 'Jane Smith',
        comment: 'Nice place'
      });

      const savedPost = await post.save();
      expect(savedPost.name).toBe('Jane Smith');
    });
  });

  describe('Image Field', () => {
    it('should store image URL', async () => {
      const post = new Post({
        img: 'https://example.com/photo.jpg',
        comment: 'Check out this photo'
      });

      const savedPost = await post.save();
      expect(savedPost.img).toBe('https://example.com/photo.jpg');
    });

    it('should store Cloudinary image URL', async () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg';
      const post = new Post({
        img: cloudinaryUrl
      });

      const savedPost = await post.save();
      expect(savedPost.img).toBe(cloudinaryUrl);
    });
  });

  describe('Rating Field', () => {
    it('should store integer rating', async () => {
      const post = new Post({
        rating: 4,
        comment: 'Good trip'
      });

      const savedPost = await post.save();
      expect(savedPost.rating).toBe(4);
    });

    it('should store decimal rating', async () => {
      const post = new Post({
        rating: 4.5
      });

      const savedPost = await post.save();
      expect(savedPost.rating).toBe(4.5);
    });

    it('should store rating of 0', async () => {
      const post = new Post({
        rating: 0
      });

      const savedPost = await post.save();
      expect(savedPost.rating).toBe(0);
    });

    it('should store negative rating', async () => {
      const post = new Post({
        rating: -1
      });

      const savedPost = await post.save();
      expect(savedPost.rating).toBe(-1);
    });
  });

  describe('Model Methods', () => {
    it('should find post by id', async () => {
      const post = await Post.create({
        comment: 'Find me',
        name: 'Test User'
      });

      const foundPost = await Post.findById(post._id);
      expect(foundPost).toBeDefined();
      expect(foundPost.comment).toBe('Find me');
    });

    it('should find posts by name', async () => {
      await Post.create({ name: 'Alice', comment: 'Post 1' });
      await Post.create({ name: 'Alice', comment: 'Post 2' });
      await Post.create({ name: 'Bob', comment: 'Post 3' });

      const alicePosts = await Post.find({ name: 'Alice' });
      expect(alicePosts).toHaveLength(2);
    });

    it('should update post', async () => {
      const post = await Post.create({
        comment: 'Original comment',
        rating: 3
      });

      post.comment = 'Updated comment';
      post.rating = 5;
      const updatedPost = await post.save();

      expect(updatedPost.comment).toBe('Updated comment');
      expect(updatedPost.rating).toBe(5);
    });

    it('should delete post', async () => {
      const post = await Post.create({
        comment: 'Delete me'
      });

      await Post.findByIdAndDelete(post._id);
      const deletedPost = await Post.findById(post._id);

      expect(deletedPost).toBeNull();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create sample posts
      await Post.create({ comment: 'Great!', rating: 5 });
      await Post.create({ comment: 'Good', rating: 4 });
      await Post.create({ comment: 'Okay', rating: 3 });
      await Post.create({ comment: 'Bad', rating: 1 });
    });

    it('should find posts with rating greater than 3', async () => {
      const highRatedPosts = await Post.find({ rating: { $gt: 3 } });
      expect(highRatedPosts.length).toBeGreaterThanOrEqual(2);
    });

    it('should find posts by comment text', async () => {
      const posts = await Post.find({ comment: 'Great!' });
      expect(posts).toHaveLength(1);
      expect(posts[0].rating).toBe(5);
    });

    it('should sort posts by rating descending', async () => {
      const posts = await Post.find().sort({ rating: -1 });
      expect(posts[0].rating).toBeGreaterThanOrEqual(posts[posts.length - 1].rating);
    });

    it('should count total posts', async () => {
      const count = await Post.countDocuments();
      expect(count).toBe(4);
    });
  });

  describe('Bulk Operations', () => {
    it('should create multiple posts', async () => {
      const posts = [
        { comment: 'Post 1', rating: 5 },
        { comment: 'Post 2', rating: 4 },
        { comment: 'Post 3', rating: 3 }
      ];

      const createdPosts = await Post.insertMany(posts);
      expect(createdPosts).toHaveLength(3);
    });

    it('should update multiple posts', async () => {
      await Post.create({ rating: 1 });
      await Post.create({ rating: 2 });
      await Post.create({ rating: 5 });

      await Post.updateMany(
        { rating: { $lt: 3 } },
        { $set: { comment: 'Needs improvement' } }
      );

      const lowRatedPosts = await Post.find({ rating: { $lt: 3 } });
      expect(lowRatedPosts.every(post => post.comment === 'Needs improvement')).toBe(true);
    });

    it('should delete multiple posts', async () => {
      await Post.create({ rating: 1 });
      await Post.create({ rating: 2 });
      await Post.create({ rating: 5 });

      await Post.deleteMany({ rating: { $lt: 3 } });

      const remainingPosts = await Post.find();
      expect(remainingPosts.every(post => post.rating >= 3)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long comment', async () => {
      const veryLongComment = 'a'.repeat(10000);
      const post = new Post({
        comment: veryLongComment
      });

      const savedPost = await post.save();
      expect(savedPost.comment.length).toBe(10000);
    });

    it('should handle special characters in comment', async () => {
      const specialComment = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const post = new Post({
        comment: specialComment
      });

      const savedPost = await post.save();
      expect(savedPost.comment).toBe(specialComment);
    });

    it('should handle Unicode characters', async () => {
      const post = new Post({
        comment: '你好世界 🌍 مرحبا العالم',
        name: 'ユーザー名'
      });

      const savedPost = await post.save();
      expect(savedPost.comment).toBe('你好世界 🌍 مرحبا العالم');
      expect(savedPost.name).toBe('ユーザー名');
    });

    it('should handle null values', async () => {
      const post = new Post({
        comment: null,
        name: null,
        img: null,
        rating: null
      });

      const savedPost = await post.save();
      expect(savedPost.comment).toBeNull();
      expect(savedPost.name).toBeNull();
    });
  });
});

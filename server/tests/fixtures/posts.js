const { faker } = require('@faker-js/faker');

/**
 * Generate a valid post object
 */
const generatePost = (userId, overrides = {}) => ({
  userId,
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraphs(2),
  location: faker.location.city(),
  image: faker.image.url(),
  tags: [faker.lorem.word(), faker.lorem.word()],
  ...overrides
});

/**
 * Generate multiple posts for a user
 */
const generatePosts = (userId, count = 3) => {
  return Array.from({ length: count }, () => generatePost(userId));
};

/**
 * Sample valid post data
 */
const validPost = {
  title: 'My Amazing Trip to Bali',
  description: 'Bali was absolutely stunning! The beaches, culture, and food were incredible. I spent most of my time exploring Ubud and relaxing on the beaches of Seminyak.',
  location: 'Bali, Indonesia',
  image: 'https://example.com/bali-beach.jpg',
  tags: ['beach', 'culture', 'adventure']
};

/**
 * Sample post with minimal fields
 */
const minimalPost = {
  title: 'Quick London Update',
  description: 'Having a great time in London!',
  location: 'London, UK'
};

/**
 * Sample post with image
 */
const postWithImage = {
  title: 'Sunset in Santorini',
  description: 'The most beautiful sunset I have ever seen! Santorini is a dream destination.',
  location: 'Santorini, Greece',
  image: 'https://example.com/santorini-sunset.jpg',
  tags: ['sunset', 'greece', 'romantic']
};

module.exports = {
  generatePost,
  generatePosts,
  validPost,
  minimalPost,
  postWithImage
};

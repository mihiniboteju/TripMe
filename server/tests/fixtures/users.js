const { faker } = require('@faker-js/faker');

/**
 * Generate a valid user object
 */
const generateUser = (overrides = {}) => ({
  username: faker.internet.username(),
  email: faker.internet.email().toLowerCase(),
  password: 'Test1234!@#$',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  ...overrides
});

/**
 * Generate multiple users
 */
const generateUsers = (count = 3) => {
  return Array.from({ length: count }, () => generateUser());
};

/**
 * Sample valid user data
 */
const validUser = {
  username: 'testuser123',
  email: 'test@example.com',
  password: 'Test1234!@#$',
  firstName: 'Test',
  lastName: 'User'
};

/**
 * Sample user with all fields
 */
const completeUser = {
  username: 'completeuser',
  email: 'complete@example.com',
  password: 'Complete1234!@#$',
  firstName: 'Complete',
  lastName: 'User',
  gender: 'Male',
  language: 'English',
  dob: '1990-01-15',
  tel: '+1234567890',
  twitter: 'https://twitter.com/completeuser',
  facebook: 'https://facebook.com/completeuser',
  instagram: 'https://instagram.com/completeuser',
  country: 'United States',
  city: 'New York'
};

module.exports = {
  generateUser,
  generateUsers,
  validUser,
  completeUser
};

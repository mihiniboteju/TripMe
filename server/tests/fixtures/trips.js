const { faker } = require('@faker-js/faker');

/**
 * Generate a valid trip object
 */
const generateTrip = (userId, overrides = {}) => ({
  userId,
  destination: faker.location.city(),
  country: faker.location.country(),
  startDate: faker.date.future({ years: 1 }),
  endDate: faker.date.future({ years: 1, refDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }),
  budget: faker.number.int({ min: 500, max: 10000 }),
  description: faker.lorem.paragraph(),
  accommodation: faker.company.name(),
  activities: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
  transportation: faker.helpers.arrayElement(['Flight', 'Train', 'Car', 'Bus']),
  notes: faker.lorem.sentences(2),
  ...overrides
});

/**
 * Generate multiple trips for a user
 */
const generateTrips = (userId, count = 3) => {
  return Array.from({ length: count }, () => generateTrip(userId));
};

/**
 * Sample valid trip data
 */
const validTrip = {
  destination: 'Paris',
  country: 'France',
  startDate: '2024-06-01',
  endDate: '2024-06-10',
  budget: 3000,
  description: 'A wonderful trip to Paris',
  accommodation: 'Paris Hotel',
  activities: ['Eiffel Tower', 'Louvre Museum', 'Seine River Cruise'],
  transportation: 'Flight',
  notes: 'Remember to book Eiffel Tower tickets in advance'
};

/**
 * Sample trip with minimal required fields
 */
const minimalTrip = {
  destination: 'London',
  country: 'United Kingdom',
  startDate: '2024-07-01',
  endDate: '2024-07-07'
};

/**
 * Sample past trip
 */
const pastTrip = {
  destination: 'Tokyo',
  country: 'Japan',
  startDate: '2023-03-15',
  endDate: '2023-03-25',
  budget: 5000,
  description: 'Amazing experience in Tokyo',
  accommodation: 'Tokyo Residence',
  activities: ['Shibuya Crossing', 'Mount Fuji', 'Akihabara'],
  transportation: 'Flight'
};

module.exports = {
  generateTrip,
  generateTrips,
  validTrip,
  minimalTrip,
  pastTrip
};

const { validationResult } = require('express-validator');
const validateTrip = require('../../../middleware/tripvalidation');

// Helper to run validators
const runValidators = async (req, res) => {
  for (const validator of validateTrip) {
    await validator.run(req);
  }
};

describe('Trip Validation Middleware', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {};
  });

  describe('Valid Trip Data', () => {
    it('should pass validation with all required fields', async () => {
      req.body = {
        country: 'France',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Eiffel Tower' }],
        accommodations: [{ name: 'Paris Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(true);
    });

    it('should pass with multiple items in arrays', async () => {
      req.body = {
        country: 'Japan',
        travelPeriod: {
          startDate: '2024-03-15',
          endDate: '2024-03-25'
        },
        visitedPlaces: [
          { name: 'Tokyo Tower' },
          { name: 'Mount Fuji' }
        ],
        accommodations: [
          { name: 'Tokyo Hotel' },
          { name: 'Osaka Hotel' }
        ],
        transportations: [
          { type: 'Flight' },
          { type: 'Train' }
        ],
        budgetItems: [
          { category: 'Food', amount: 500 },
          { category: 'Accommodation', amount: 800 }
        ]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(true);
    });

    it('should pass with ISO 8601 datetime format', async () => {
      req.body = {
        country: 'Spain',
        travelPeriod: {
          startDate: '2024-07-01T00:00:00.000Z',
          endDate: '2024-07-10T23:59:59.999Z'
        },
        visitedPlaces: [{ name: 'Barcelona' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Travel', amount: 1000 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(true);
    });
  });

  describe('Country Validation', () => {
    it('should fail when country is missing', async () => {
      req.body = {
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'Country is required',
          path: 'country'
        })
      );
    });

    it('should fail when country is empty string', async () => {
      req.body = {
        country: '',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'Country is required'
        })
      );
    });
  });

  describe('Travel Period Validation', () => {
    it('should fail when startDate is missing', async () => {
      req.body = {
        country: 'Italy',
        travelPeriod: {
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'Start date is required'
        })
      );
    });

    it('should fail when endDate is missing', async () => {
      req.body = {
        country: 'Germany',
        travelPeriod: {
          startDate: '2024-06-01'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'End date is required'
        })
      );
    });

    it('should fail with invalid date format for startDate', async () => {
      req.body = {
        country: 'Canada',
        travelPeriod: {
          startDate: 'invalid-date',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'Invalid start date format'
        })
      );
    });

    it('should fail with invalid date format for endDate', async () => {
      req.body = {
        country: 'Australia',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '06/10/2024' // Wrong format
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'Invalid end date format'
        })
      );
    });

    it('should fail when travelPeriod is missing entirely', async () => {
      req.body = {
        country: 'Mexico',
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      const errorMessages = errors.array().map(e => e.msg);
      expect(errorMessages).toContain('Start date is required');
      expect(errorMessages).toContain('End date is required');
    });
  });

  describe('Visited Places Validation', () => {
    it('should fail when visitedPlaces is missing', async () => {
      req.body = {
        country: 'Thailand',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one visited place is required'
        })
      );
    });

    it('should fail when visitedPlaces is empty array', async () => {
      req.body = {
        country: 'Vietnam',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one visited place is required'
        })
      );
    });

    it('should fail when visitedPlaces is not an array', async () => {
      req.body = {
        country: 'Singapore',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: 'Not an array',
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
    });
  });

  describe('Accommodations Validation', () => {
    it('should fail when accommodations is missing', async () => {
      req.body = {
        country: 'Indonesia',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one accommodation is required'
        })
      );
    });

    it('should fail when accommodations is empty array', async () => {
      req.body = {
        country: 'Malaysia',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [],
        transportations: [{ type: 'Flight' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one accommodation is required'
        })
      );
    });
  });

  describe('Transportations Validation', () => {
    it('should fail when transportations is missing', async () => {
      req.body = {
        country: 'Philippines',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one transportation method is required'
        })
      );
    });

    it('should fail when transportations is empty array', async () => {
      req.body = {
        country: 'South Korea',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [],
        budgetItems: [{ category: 'Food', amount: 200 }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one transportation method is required'
        })
      );
    });
  });

  describe('Budget Items Validation', () => {
    it('should fail when budgetItems is missing', async () => {
      req.body = {
        country: 'India',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }]
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one budget item is required'
        })
      );
    });

    it('should fail when budgetItems is empty array', async () => {
      req.body = {
        country: 'China',
        travelPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-10'
        },
        visitedPlaces: [{ name: 'Place' }],
        accommodations: [{ name: 'Hotel' }],
        transportations: [{ type: 'Flight' }],
        budgetItems: []
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one budget item is required'
        })
      );
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should return all validation errors when all fields are missing', async () => {
      req.body = {};

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      const errorMessages = errors.array().map(e => e.msg);
      
      expect(errorMessages).toContain('Country is required');
      expect(errorMessages).toContain('Start date is required');
      expect(errorMessages).toContain('End date is required');
      expect(errorMessages).toContain('At least one visited place is required');
      expect(errorMessages).toContain('At least one accommodation is required');
      expect(errorMessages).toContain('At least one transportation method is required');
      expect(errorMessages).toContain('At least one budget item is required');
    });

    it('should return multiple errors for different fields', async () => {
      req.body = {
        country: '',
        travelPeriod: {
          startDate: 'invalid',
          endDate: 'invalid'
        },
        visitedPlaces: [],
        accommodations: [],
        transportations: [],
        budgetItems: []
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().length).toBeGreaterThan(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      req.body = {
        country: null,
        travelPeriod: {
          startDate: null,
          endDate: null
        },
        visitedPlaces: null,
        accommodations: null,
        transportations: null,
        budgetItems: null
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
    });

    it('should handle undefined values', async () => {
      req.body = {
        country: undefined,
        travelPeriod: undefined,
        visitedPlaces: undefined,
        accommodations: undefined,
        transportations: undefined,
        budgetItems: undefined
      };

      await runValidators(req, res);
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
    });
  });
});

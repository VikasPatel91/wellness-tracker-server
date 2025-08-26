const { body, validationResult } = require('express-validator');

// Validation for registration
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    next();
  }
];

// Validation for login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    next();
  }
];

// Validation for metrics
const validateMetric = [
  body('date')
    .isISO8601()
    .withMessage('Please enter a valid date'),
  body('steps')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Steps must be a positive number'),
  body('sleep')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Sleep hours must be between 0 and 24'),
  body('mood')
    .optional()
    .isIn(['Happy', 'Neutral', 'Tired', 'Stressed'])
    .withMessage('Invalid mood value'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    next();
  }
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateMetric
};
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// Register new user
router.post('/register', validateRegistration, authController.register);

// Login user
router.post('/login', validateLogin, authController.login);

// Get current user
router.get('/me', auth, authController.getMe);

module.exports = router;
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const {
    register,
    login,
    adminLogin,
    getMe,
    updateProfile,
    changePassword,
    logout,
    createUser,
    deleteUser,
} = require('../controllers/authController');

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);
router.post('/admin-login', validateUserLogin, adminLogin);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

// Admin-only management
router.post('/create', protect, authorize('admin'), createUser);
router.delete('/user/:username', protect, authorize('admin'), deleteUser);

module.exports = router;

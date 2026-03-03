const User = require('../models/User');
const jwt = require('jsonwebtoken');
const SystemLog = require('../models/SystemLog');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// @desc    Register a new user (default role operator)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with that email',
            });
        }

        // Create user with default role
        user = new User({
            name,
            email,
            password,
        });

        await user.save();

        // Log the action
        await SystemLog.create({
            action: 'USER_CREATED',
            details: `New user created: ${email}`,
            level: 'info',
            relatedData: user._id,
            relatedModel: 'User',
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;

        // Accept either email or username
        const loginField = email || username;
        if (!loginField || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username/email and password',
            });
        }

        // Find user by email or username
        const user = await User.findOne({
            $or: [{ email: loginField }, { username: loginField }],
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is inactive',
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Log the action
        await SystemLog.create({
            action: 'USER_LOGIN',
            details: `User logged in: ${user.username || user.email}`,
            level: 'info',
            user: user._id,
            relatedData: user._id,
            relatedModel: 'User',
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name || user.username,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        const user = await User.findById(req.user.id);

        if (name) user.name = name;
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use',
                });
            }
            user.email = email;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin creates a new user with arbitrary role
// @route   POST /api/auth/create
// @access  Private (admin only)
exports.createUser = async (req, res, next) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required',
            });
        }

        // Check if username already exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists',
            });
        }

        // Create new user
        user = new User({
            username,
            password,
            role: role || 'operator',
        });
        await user.save();

        // Log the action - handle both regular and admin users
        await SystemLog.create({
            action: 'USER_CREATED',
            details: `Admin created user: ${username}`,
            level: 'info',
            relatedData: user._id,
            relatedModel: 'User',
            user: req.user.id === 'admin' ? null : req.user.id,
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin deletes a user by username
// @route   DELETE /api/auth/user/:username
// @access  Private (admin only)
exports.deleteUser = async (req, res, next) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username required',
            });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        await user.remove();

        await SystemLog.create({
            action: 'USER_LOGOUT',
            details: `Admin ${req.user && req.user.email ? req.user.email : 'admin'} deleted user: ${username}`,
            level: 'info',
            user: req.user && req.user.id !== 'admin' ? req.user.id : null,
        });

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin Login with hardcoded credentials
// @route   POST /api/auth/admin-login
// @access  Public
exports.adminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Hardcoded admin credentials
        const ADMIN_EMAIL = 'admin@wastesmart.com';
        const ADMIN_PASSWORD = 'Admin@123456';

        // Validate credentials
        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials',
            });
        }

        // Log the action
        await SystemLog.create({
            action: 'USER_LOGIN',
            details: `Admin logged in: ${email}`,
            level: 'info',
        });

        // Generate token with admin claims
        const token = jwt.sign(
            { id: 'admin', email: ADMIN_EMAIL, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            token,
            user: {
                id: 'admin',
                name: 'Administrator',
                email: ADMIN_EMAIL,
                role: 'admin',
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
    try {
        // Log the action
        await SystemLog.create({
            action: 'USER_LOGOUT',
            details: `User logged out: ${req.user.email}`,
            level: 'info',
            user: req.user._id,
        });

        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    } catch (error) {
        next(error);
    }
};

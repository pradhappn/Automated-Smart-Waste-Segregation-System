// Input validation middleware
exports.validateWasteData = (req, res, next) => {
    const { metalLevel, moistureLevel, temperature } = req.body;

    // Validate metalLevel
    if (metalLevel !== undefined) {
        if (typeof metalLevel !== 'number' || metalLevel < 0 || metalLevel > 100) {
            return res.status(400).json({
                success: false,
                message: 'metalLevel must be a number between 0 and 100',
            });
        }
    } else {
        return res.status(400).json({
            success: false,
            message: 'metalLevel is required',
        });
    }

    // Validate moistureLevel
    if (moistureLevel !== undefined) {
        if (typeof moistureLevel !== 'number' || moistureLevel < 0 || moistureLevel > 100) {
            return res.status(400).json({
                success: false,
                message: 'moistureLevel must be a number between 0 and 100',
            });
        }
    } else {
        return res.status(400).json({
            success: false,
            message: 'moistureLevel is required',
        });
    }

    // Validate temperature
    if (temperature !== undefined) {
        if (typeof temperature !== 'number' || temperature < -50 || temperature > 100) {
            return res.status(400).json({
                success: false,
                message: 'temperature must be a number between -50 and 100',
            });
        }
    }

    next();
};

// Validate user registration data
exports.validateUserRegistration = (req, res, next) => {
    const { name, email, password, confirmPassword } = req.body;

    // Check required fields
    if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'Please provide all required fields: name, email, password, confirmPassword',
        });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address',
        });
    }

    // Check password length
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long',
        });
    }

    // Check passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'Passwords do not match',
        });
    }

    // Check name length
    if (name.length < 2 || name.length > 50) {
        return res.status(400).json({
            success: false,
            message: 'Name must be between 2 and 50 characters',
        });
    }

    next();
};

// Validate user login data
exports.validateUserLogin = (req, res, next) => {
    const { email, username, password } = req.body;

    // Accept either email or username
    if ((!email && !username) || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide username/email and password',
        });
    }

    // Validate email format if email is provided
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address',
            });
        }
    }

    next();
};

// Validate pagination
exports.validatePagination = (req, res, next) => {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) {
        page = 1;
    }

    if (isNaN(limit) || limit < 1) {
        limit = 10;
    }

    if (limit > 100) {
        limit = 100; // Max limit
    }

    req.pagination = {
        page,
        limit,
        skip: (page - 1) * limit,
    };

    next();
};

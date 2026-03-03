// Custom error handler middleware
exports.errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);

    // Default error
    let error = {
        statusCode: err.statusCode || 500,
        message: err.message || 'Server Error',
    };

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found`;
        error = {
            statusCode: 404,
            message,
        };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `${field} already exists`;
        error = {
            statusCode: 400,
            message,
        };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
            .map((val) => val.message)
            .join(', ');
        error = {
            statusCode: 400,
            message,
        };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = {
            statusCode: 401,
            message,
        };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = {
            statusCode: 401,
            message,
        };
    }

    res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { error: err }),
    });
};

// 404 Not Found handler
exports.notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

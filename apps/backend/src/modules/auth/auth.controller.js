const jwt = require('jsonwebtoken');
const authService = require('./auth.service');

/**
 * Handle Google OAuth callback
 */
const handleGoogleCallback = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: req.user._id,
                email: req.user.email,
                role: req.user.role
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/success?token=${token}`);

    } catch (error) {
        console.error('Google callback error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Logout user
 */
const logout = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

/**
 * Get current user info
 */
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: req.user._id,
                email: req.user.email,
                displayName: req.user.displayName,
                profilePictureUrl: req.user.profilePictureUrl,
                role: req.user.role
            }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    handleGoogleCallback,
    logout,
    getCurrentUser
}; 
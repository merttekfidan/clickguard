const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../../models/User.model');

/**
 * Configure Google OAuth Strategy
 */
const configureGoogleStrategy = () => {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ googleId: profile.id });
            
            if (!user) {
                // Create new user
                user = new User({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    displayName: profile.displayName,
                    profilePictureUrl: profile.photos[0]?.value,
                    role: 'user' // Default role
                });
                
                await user.save();
                console.log('✅ New user created:', user.email);
            } else {
                console.log('✅ Existing user logged in:', user.email);
            }
            
            return done(null, user);
            
        } catch (error) {
            console.error('❌ Google strategy error:', error);
            return done(error, null);
        }
    }));
};

/**
 * Serialize user for session
 */
passport.serializeUser((user, done) => {
    done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

/**
 * Initialize passport
 */
const initializePassport = () => {
    configureGoogleStrategy();
    return passport.initialize();
};

/**
 * Find user by ID
 */
const findUserById = async (userId) => {
    try {
        return await User.findById(userId);
    } catch (error) {
        console.error('Find user by ID error:', error);
        return null;
    }
};

/**
 * Find user by email
 */
const findUserByEmail = async (email) => {
    try {
        return await User.findOne({ email });
    } catch (error) {
        console.error('Find user by email error:', error);
        return null;
    }
};

/**
 * Update user role
 */
const updateUserRole = async (userId, role) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        );
        return user;
    } catch (error) {
        console.error('Update user role error:', error);
        return null;
    }
};

module.exports = {
    initializePassport,
    findUserById,
    findUserByEmail,
    updateUserRole
}; 
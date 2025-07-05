const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../../models/User.model');

/**
 * Configure Google OAuth Strategy
 */
const configureGoogleStrategy = () => {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('❌ Missing Google OAuth environment variables:');
        console.error('   GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
        console.error('   GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
        return false;
    }

    try {
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
        
        console.log('✅ Google OAuth strategy configured successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to configure Google OAuth strategy:', error);
        return false;
    }
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
    const strategyConfigured = configureGoogleStrategy();
    if (!strategyConfigured) {
        console.warn('⚠️ Google OAuth strategy not configured - auth routes may not work');
    }
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
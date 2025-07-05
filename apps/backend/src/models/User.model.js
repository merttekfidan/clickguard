const mongoose = require('../config/mongo');

const UserSchema = new mongoose.Schema({
    googleId: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    profilePictureUrl: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Index for better query performance
UserSchema.index({ googleId: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

// Virtual for user's full profile
UserSchema.virtual('fullProfile').get(function() {
    return {
        id: this._id,
        email: this.email,
        displayName: this.displayName,
        profilePictureUrl: this.profilePictureUrl,
        role: this.role,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
});

// Method to check if user is admin
UserSchema.methods.isAdmin = function() {
    return this.role === 'admin';
};

// Method to update last login
UserSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Pre-save middleware to ensure email is lowercase
UserSchema.pre('save', function(next) {
    if (this.email) {
        this.email = this.email.toLowerCase();
    }
    next();
});

module.exports = mongoose.model('User', UserSchema); 
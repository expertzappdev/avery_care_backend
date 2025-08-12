// src/models/Admin.js
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false, // for security so that password can't be selected in query 
    },
    role: {
        type: String,
        enum: ['admin'],
        default: 'admin',
    },
    otp: {
        type: String,
        default: null,
    },
    otpExpiresAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
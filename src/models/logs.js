// src/models/Logs.js

import mongoose from 'mongoose';

const logsSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
    },
    action: {
        type: String,
        required: true,
        enum: ['login_attempt', 'otp_attempt'], // Kis type ka attempt tha
    },
    status: {
        type: String,
        required: true,
        enum: ['success', 'failed'], // Attempt ka status
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const Logs = mongoose.model('Logs', logsSchema);

export default Logs;
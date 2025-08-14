import mongoose from 'mongoose';
const transcriptSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'], // Indicates if the message was from the user or the AI assistant
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { _id: false } // Prevents MongoDB from automatically adding a default _id to each transcript entry
);

const scheduledCallSchema = new mongoose.Schema({
  recipientName: {
    type: String,
    required: true,
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  scheduledTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipientNumber: {
    type: String,
    required: true,
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  scheduledAtHistory: { // Naya field
    type: [Date],
    default: [],
  },
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
  durationInSeconds: {
    type: Number,
    default: 0, // Duration of the call in seconds, defaults to 0
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'failed', 'completed',],
    default: 'pending',
  },
  triesLeft: {
    type: Number,
    default: 3,
    min: 0,
    max: 3,
  },
  callSid: {
    type: String,
    default: null,
  },
  transcript: [transcriptSchema], // An array of message objects representing the call's full transcript
  aiSummary: {
    type: String, // An AI-generated summary of the call
    default: null,
  },
  audioRecordingUrl: {
    type: String, // URL to the audio recording, typically stored in Firebase Storage
    default: null,
  },

}, {
  timestamps: true,
});

const ScheduledCall = mongoose.model('ScheduledCall', scheduledCallSchema);
export default ScheduledCall;
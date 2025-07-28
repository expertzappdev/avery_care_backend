import mongoose from 'mongoose';

// Sub-schema for each message entry within a call transcript
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

const callSummarySchema = new mongoose.Schema(
  {
    _id: {
      type: String, // The _id for this document will be the Twilio Call SID (String)
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User who initiated or is associated with this call
      required: true,
    },
    familyMemberName: {
      type: String,
      required: true, // The name of the family member who was called
    },
    phoneNumber: {
      type: String,
      required: true, // The phone number to which the call was made
    },
    startTime: {
      type: Date, // The start time of the call
    },
    endTime: {
      type: Date, // The end time of the call
    },
    durationInSeconds: {
      type: Number,
      default: 0, // Duration of the call in seconds, defaults to 0
    },
    status: {
      type: String, // The status of the call (e.g., "success", "missed", "failed")
    },
    transcript: [transcriptSchema], // An array of message objects representing the call's full transcript
    aiSummary: {
      type: String, // An AI-generated summary of the call
    },
    audioRecordingUrl: {
      type: String, // URL to the audio recording, typically stored in Firebase Storage
    },
  },
  { timestamps: true, _id: false } // Automatically adds 'createdAt' and 'updatedAt' fields; _id is custom managed
);

const CallSummary = mongoose.model('CallSummary', callSummarySchema);

export default CallSummary;
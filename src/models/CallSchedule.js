import mongoose from 'mongoose';

const callScheduleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    familyMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember', // Reference to the FamilyMember model
      default: null, // This field is optional; it can be null if the call isn't for a specific family member
    },
    scheduledTime: {
      type: Date,
      required: true, // The exact time the call is scheduled to occur
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'], // Current status of the call
      default: 'pending', // Default status is 'pending'
    },
    retryCount: {
      type: Number,
      default: 0, // Number of times the call has been retried
    },
  },
  {
    timestamps: true, // Automatically adds 'createdAt' and 'updatedAt' fields
  }
);

const CallSchedule = mongoose.model('CallSchedule', callScheduleSchema);

export default CallSchedule;
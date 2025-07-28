import mongoose from 'mongoose';

const familyMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    relationship: {
      type: String,
      required: true, // Example: "Mother", "Father", "Brother", "Sister", etc.
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model, indicating which user this family member belongs to
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false, // Default value is false until explicitly verified
    },
  },
  {
    timestamps: true, // Automatically adds 'createdAt' and 'updatedAt' fields
  }
);

const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);

export default FamilyMember;
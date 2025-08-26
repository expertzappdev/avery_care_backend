import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		phoneNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			select: false,
		},
		role: {
			type: String,
			enum: ['user', 'admin'],
			default: 'user',
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
		otpExpiresAt: {
			type: Date,
		},
		emailOtp: {
			type: String,
			default: null,
		},
		mobileOtp: {
			type: String,
			default: null,
		},
		isAFamilyMember: {
			type: String,
			default: null,
		},
		familyMembers: [
			{
				relationship: {
					type: String,
					required: true,
					trim: true,
					lowercase: true,
				},
				member: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'FamilyMember',
					required: true,
				},
			},
		]

	},
	{
		timestamps: true,
	}
);


userSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });
// This pre-save hook hashes the password before saving the user document to the database.
userSchema.pre('save', async function (next) {

	// Only hash the password if it has been modified (e.g., during registration or password change).
	if (!this.isModified('password')) {
		next(); // If not modified, skip hashing and move to the next middleware.
	}
	const salt = await bcrypt.genSalt(10); // Generate a salt with 10 salt rounds for hashing.
	this.password = await bcrypt.hash(this.password, salt); // Hash the plain-text password using the generated salt.

});

userSchema.pre('save', function (next) {
	const relations = this.familyMembers.map(fm => fm.relation);
	const uniqueRelations = new Set(relations);

	if (relations.length !== uniqueRelations.size) {
		return next(new Error('Duplicate relation types are not allowed.'));
	}

	next();
});
userSchema.methods.matchPassword = async function (enteredPassword) {
	return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
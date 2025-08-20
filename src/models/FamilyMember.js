import mongoose from 'mongoose';
import User from './user';
const familyMemberSchema = new mongoose.Schema(
	{
		isUser: {
			type: Boolean,
			default: false,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: function () {
				return this.isUser === true;
			},
		},
		name: {
			type: String,
			trim: true,
		},
		email: {
			type: String,
			unique: true,
			sparse: true, // allow null but enforce uniqueness if present
			lowercase: true,
			trim: true,
		},
		phoneNumber: {
			type: String,
			unique: true,
			sparse: true, // allow null but enforce uniqueness if present
			trim: true,
		},
		linkedToPrimaryUsers: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
		],
	},
	{ timestamps: true }
);

// Virtual to populate runtime info from User when isUser is true
familyMemberSchema.virtual('userInfo', {
	ref: 'User',
	localField: 'userId',
	foreignField: '_id',
	justOne: true,
});
familyMemberSchema.set('toJSON', {
	virtuals: true,
	transform: function (doc, ret) {
		// Merge userInfo fields into root if isUser is true and userInfo exists
		if (ret.isUser && ret.userInfo) {
			ret.name = ret.userInfo.name;
			ret.email = ret.userInfo.email;
			ret.phoneNumber = ret.userInfo.phoneNumber;
			ret.createdAt = ret.userInfo.createdAt;
			ret.updatedAt = ret.userInfo.updatedAt;
		}
		delete ret.userInfo; // remove nested userInfo object from final output
		delete ret.__v;
		return ret;
	},
});
const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);
export default FamilyMember;
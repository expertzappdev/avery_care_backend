import asyncHandler from 'express-async-handler';
// Corrected import paths for models (assuming 'models' folder has camelCase names and file names like 'User.js', 'FamilyMember.js')
import FamilyMember from '../models/FamilyMember.js';
import User from '../models/user.js';
// Corrected import path for validation utilities (assuming 'utils' folder has camelCase names and file name like 'ValidationUtils.js')
import { isValidPhone, isValidGmail } from '../utils/ValidationUtils.js';

// @desc    Add a new family member
// @route   POST /api/family
// @access  Private (Authenticated User only)
// const addFamilyMember = asyncHandler(async (req, res) => {

const addFamilyMember = async (req, res) => {

	try {
		const { name, email, phoneNumber, relationship } = req.body;
		if (!name || !phoneNumber || !email || !relationship) {
			console.log("❌ Missing required fields.");
			res.status(400);
			return res.status(400).json({ message: 'please enter all fields' });
		}
		if (!isValidGmail(email)) {
			return res.status(201).json({ message: 'Invalid email format for family member. Only @gmail.com emails are allowed.' });
		}

		// if (!isValidPhone(phoneNumber)) {
		// 	return res.status(400).json({ message: 'Invalid phone number for family member. Must be 10 digits and start with 6, 7, 8, or 9.' });
		// 	// throw new Error('Invalid email format for family member. Only @gmail.com emails are allowed.');
		// }
		const primaryUserId = req.user._id;
		const primaryUser = await User.findById(primaryUserId);
		const sanitizedRelation = relationship.trim().toLowerCase();
		//-------------------checks exising user this same relationship ------------------------------------
		const existingRelation = primaryUser.familyMembers.find(fm => fm.relation === sanitizedRelation);
		if (existingRelation) {
			return res.status(200).json({ message: `A family member with relation '${sanitizedRelation}' already exists.` });
		}
		//-------------------checks Self Linking ------------------------------------
		// const selfUser = await User.findById(primaryUserId)
		if (primaryUser.email === email || primaryUser.phoneNumber === phoneNumber) {
			return res.status(400).json({ message: 'self linking is not allowed' });
		}

		//-------------------familly logic starts here ------------------------------------------------------------------------------
		//my updated logic  ---------------------------------------------------------------------------------
		const emailMatch = await FamilyMember.findOne({ email });
		const phoneMatch = await FamilyMember.findOne({ phoneNumber });

		if (emailMatch && phoneMatch) {
			if (emailMatch._id.equals(phoneMatch._id)) {
				// ✅ Both matched in the same entry
				console.log("email and phone logic working fine and now db function linking")

				//exisintg member linking logic pasted here ------------------------------------------------------>
				if (emailMatch) {
					// Check if this user already linked to this member
					if (emailMatch.linkedToPrimaryUsers.includes(primaryUserId)) {
						return res.status(400).json({ message: 'Family member already linked to this user.' });
					}
					console.log("fm found with this email");

					emailMatch.linkedToPrimaryUsers.push(primaryUserId);
					await emailMatch.save();

					await User.findByIdAndUpdate(primaryUserId, {
						$addToSet: {
							familyMembers: {
								relation: sanitizedRelation,
								member: emailMatch._id
							}
						}
					});

					return res.status(200).json({ message: 'Existing family member linked successfully.', member: emailMatch });
				}


				//exisintg member linking logic pasted here ------------------------------------------------------>

			} else {
				// ⚠️ Email and phone matched with different entries
				return res.status(400).json({
					status: 'conflict',
					message: 'Email and phone match with different family members.',
					emailMatchedMember: emailMatch,
					phoneMatchedMember: phoneMatch,
				});
			}
		} else if (emailMatch) {
			// ✅ Only email matched
			return res.status(200).json({
				status: 'email_match_only',
				message: 'Email matches an existing family member, phone does not.',
				member: emailMatch,
			});
		} else if (phoneMatch) {
			// ✅ Only phone matched
			return res.status(200).json({
				status: 'phone_match_only',
				message: 'Phone matches an existing family member, email does not.',
				member: phoneMatch,
			});
		}
		//my updated logic  ---------------------------------------------------------------------------------
		// Check if a FamilyMember already exists with same email and phone

		console.log("not found in existing fm entries ");
		// Create new family member
		const newFamilyMember = await FamilyMember.create({
			name,
			email,
			phoneNumber,
			isUser: false,
			linkedToPrimaryUsers: [primaryUserId],
		});
		console.log("entry created");
		// Add this member to User's familyMembers list
		await User.findByIdAndUpdate(primaryUserId, {
			$addToSet: {
				familyMembers: {
					relation: sanitizedRelation,
					member: newFamilyMember._id
				}
			}
		});

		const dummyMember = await User.findById(primaryUserId);
		console.log("this family member is added in : ", dummyMember.name);
		// return res.status(201).json({ message: 'Family member added successfully.', member: newFamilyMember });

		//-------------------familly logic ends here ------------------------------------------------------------------------------



		//-------------------User verificaation here ------------------------------------------------------------------------>
		const emailMatchWithUser = await User.findOne({ email });
		const phoneMatchWithUser = await User.findOne({ phoneNumber });

		if (emailMatchWithUser && phoneMatchWithUser) {
			if (emailMatchWithUser._id.equals(phoneMatchWithUser._id)) {
				// ✅ Both matched in the same entry
				console.log("email and phone logic working fine founded : ", emailMatchWithUser)

				newFamilyMember.isUser = true
				newFamilyMember.userId = emailMatchWithUser
				await newFamilyMember.save();

				console.log("set to true and id set also: ", newFamilyMember.isUser, newFamilyMember.userId);

			} else {
				// ⚠️ Email and phone matched with different entries
				return res.status(400).json({
					status: 'conflict',
					message: 'Email and phone match with different Users.',
					emailMatchedMember: emailMatchWithUser,
					phoneMatchedMember: phoneMatchWithUser,
				});
			}
		} else if (emailMatchWithUser) {
			// ✅ Only email matched
			return res.status(200).json({
				status: 'email_match_only',
				message: 'Email matches an existing User, phone does not.',
				member: emailMatchWithUser,
			});
		} else if (phoneMatchWithUser) {
			// ✅ Only phone matched
			return res.status(200).json({
				status: 'phone_match_only',
				message: 'Phone matches an existing User, email does not.',
				member: phoneMatchWithUser,
			});
		}
		//-------------------User Logic ends here------------------------------------------------------------------------>
		if (emailMatchWithUser) {
			return res.status(201).json({ message: 'Family member added successfully and is already a User', member: newFamilyMember });
		}
		return res.status(201).json({ message: 'Family member added successfully', member: newFamilyMember });
	} catch (error) {
		console.error('Add Family Member Error:', error);
		return res.status(500).json({ message: 'Server error while adding family member.' });
	}
};


const updateFamilyMember = asyncHandler(async (req, res) => {

	const { familyMemberId } = req.params;
	console.log("➡️ Incoming update request for familyMemberId:", familyMemberId);
	const primaryUserId = req.user._id;
	console.log("➡️ Request from user ID:", primaryUserId);
	// Destructure all required fields from request body including 'relationship' as it is part of FamilyMember.
	const { name, phoneNumber, relationship, email } = req.body;
	console.log("📝 Incoming update data:", { name, phoneNumber, relationship, email });


	// --- Initial Input Validation for all required fields ---
	if (!name || !email || !phoneNumber || !relationship) {
		res.status(400);
		throw new Error('Please enter all fields: name, email, phone number, and relationship for update.');
	}
	console.log("📝 Incoming update data after verify:", { name, phoneNumber, relationship, email });
	// --- End Initial Input Validation ---

	// --- Check existing relation with this name ---
	const sanitizedRelation = relationship.trim().toLowerCase();
	console.log("sanitizedRelation", sanitizedRelation)
	//-------------------checks exising user this same relationship ------------------------------------
	const primaryUser = await User.findById(primaryUserId);
	console.log("user found");
	const existingRelation = primaryUser.familyMembers.find(fm => fm.relation === sanitizedRelation);
	if (existingRelation) {
		return res.status(200).json({ message: `A family member with relation '${sanitizedRelation}' already exists.` });
	}

	// Find the global family member document by ID

	console.log("👨‍👩‍👧‍👦 searching for FamilyMember in DB:", familyMemberId);
	const familyMember = await FamilyMember.findById(familyMemberId);
	console.log("👨‍👩‍👧‍👦 Found FamilyMember in DB:", familyMember);
	if (!familyMember) {
		res.status(404).json({
			message: "Family member not found"
		});
	}

	// Ensure the current user is one of the primary users linked to this global family member
	if (!familyMember.linkedToPrimaryUsers.includes(primaryUserId.toString())) {
		res.status(401);
		throw new Error('Not authorized to update this family member. You are not linked to them.');
	}

	// --- Logic: Prevent updating core fields if family member is a registered User (Option A) ---
	if (familyMember.isUser) { // Check if this FamilyMember entry is linked to a registered User
		// If linked, primary user cannot update name, email, phone number.
		// Those must be updated by the corresponding User directly.
		console.log("⚠️ This family member is a registered user. Checking if core fields are being modified...");
		if (name !== familyMember.name || email !== familyMember.email || phoneNumber !== familyMember.phoneNumber) {
			res.status(400);
			throw new Error('This family member is a registered user. Name, email, and phone number must be updated directly by them through their own user profile.');
		}
	}
	// --- End Logic ---

	// Validate the format of the new phone number
	// if (!isValidPhone(phoneNumber)) {
	// 	res.status(400);
	// 	throw new Error('Invalid phone number for family member. Must be 10 digits and start with 6, 7, 8, or 9.');
	// }

	// Validate the format of the new email
	if (!isValidGmail(email)) {
		res.status(400);
		throw new Error('Invalid email format for family member. Only @gmail.com emails are allowed.');
	}

	// --- Uniqueness checks for updated email/phone ---
	// If email is changing, check if the new email is already used by another global FamilyMember (excluding current FM)
	if (email !== familyMember.email) {
		const existingFamilyMemberWithNewEmail = await FamilyMember.findOne({
			email: email,
			_id: { $ne: familyMember._id }
		});
		if (existingFamilyMemberWithNewEmail) {
			res.status(400);
			console.log("📧 Email conflict check result:", existingFamilyMemberWithNewEmail);
			throw new Error('This email is already associated with another family member in the system.');
		}
	}

	// If phone number is changing, check if the new phone number is already used by another global FamilyMember (excluding current FM)
	if (phoneNumber !== familyMember.phoneNumber) {
		const existingFamilyMemberWithNewPhone = await FamilyMember.findOne({
			phoneNumber: phoneNumber,
			_id: { $ne: familyMember._id }
		});
		if (existingFamilyMemberWithNewPhone) {
			res.status(400);
			throw new Error('This phone number is already associated with another family member in the system.');
		}
		// console.log("📞 Phone conflict check result:", existingFamilyMemberWithNewPhone);
	}
	// --- End Uniqueness Checks ---


	// Update FamilyMember fields with new data
	// Note: 'name', 'email', 'phoneNumber' are only updated here if 'isUser' is false
	// or if 'isUser' is true but the fields provided are identical to the linked User (handled by previous logic)
	familyMember.name = name;
	familyMember.email = email;
	familyMember.phoneNumber = phoneNumber;
	// Save the updated FamilyMember document
	const updatedFamilyMember = await familyMember.save();
	// console.log("✅ FamilyMember successfully updated:", updatedFamilyMember);
	// Respond with a success message and the updated family member's details
	res.json({
		message: 'Family member updated successfully!',
		familyMember: {
			_id: updatedFamilyMember._id,
			name: updatedFamilyMember.name,
			email: updatedFamilyMember.email,
			phoneNumber: updatedFamilyMember.phoneNumber,
			userId: updatedFamilyMember.userId,
			linkedToPrimaryUsers: updatedFamilyMember.linkedToPrimaryUsers,
			// Relationship is specific to how the current user sees them, this is not a global property of FamilyMember document anymore.
			// This needs to be managed within the User's familyMembers array if desired.
		},
	});
});


const deleteFamilyMember = asyncHandler(async (req, res) => {
	const { familyMemberId } = req.params;
	console.log("🔍 Requested to delete family member ID:", familyMemberId);
	console.log("🔐 Request made by user ID:", req.user._id);

	// Find the global family member document by ID
	const familyMember = await FamilyMember.findById(familyMemberId);
	console.log("📄 Fetched familyMember from DB:", familyMember);

	if (!familyMember) {
		console.log("❌ Family member not found in database.");
		res.status(404);
		throw new Error('Family member not found');
	}

	// Ensure the current user is one of the primary users linked to this global family member
	const userIndex = familyMember.linkedToPrimaryUsers.findIndex(userId => userId.toString() === req.user._id.toString());

	if (userIndex === -1) { // If current user is not linked to this family member
		res.status(401);
		throw new Error('Not authorized to delete this family member from your list. You are not linked to them.');
	}

	// Remove the current user's ID from the global FamilyMember's linkedToPrimaryUsers array
	familyMember.linkedToPrimaryUsers.splice(userIndex, 1);
	await familyMember.save();
	console.log("✅ Removed user from linkedToPrimaryUsers and saved updated familyMember.");

	const user = await User.findById(req.user._id);
	console.log("👤 Loaded user document:", user?.name || "User not found");
	if (user) {
		user.familyMembers = user.familyMembers.filter((fm) => {
			return fm.member && fm.member.toString() !== familyMemberId.toString();
		});
		await user.save();
		console.log("🧹 Removed member from user's familyMembers array and saved user.");
	}
	// Optional: If no primary users are linked AND it's not a registered user, delete the FamilyMember document.
	// This is for cleanup of truly unreferenced global family member entries.
	if (familyMember.linkedToPrimaryUsers.length === 0 && !familyMember.isUser) {
		await FamilyMember.deleteOne({ _id: familyMemberId });
		console.log("🗑️ FamilyMember was unlinked and not a registered user. Deleted globally.");
		return res.json({ message: 'Family member removed from your list and globally deleted (no other links found).' });

	}

	res.json({ message: 'Family member removed from your list successfully.' });
});

export { addFamilyMember, updateFamilyMember, deleteFamilyMember };
import asyncHandler from 'express-async-handler';
import FamilyMember from '../models/FamilyMember.js';
import User from '../models/User.js';
import { isValidPhone } from '../utils/validationUtils.js'; // Importing phone number validation utility

// @desc    Add a new family member
// @route   POST /api/family
// @access  Private (Authenticated User only)
const addFamilyMember = asyncHandler(async (req, res) => {
  const { name, phoneNumber, relationship } = req.body;

  // Check if all required fields are provided
  if (!name || !phoneNumber || !relationship) {
    res.status(400);
    throw new Error('Please enter all fields: name, phone number, and relationship.');
  }

  // Validate the phone number format
  if (!isValidPhone(phoneNumber)) {
    res.status(400);
    throw new Error('Invalid phone number for family member. Must be 10 digits and start with 6, 7, 8, or 9.');
  }

  // Check if this family member (by phone number for the current user) already exists
  const existingMember = await FamilyMember.findOne({ user: req.user._id, phoneNumber });
  if (existingMember) {
    res.status(400);
    throw new Error('Family member with this phone number already exists for this user.');
  }

  // Create new family member in the database
  const familyMember = await FamilyMember.create({
    name,
    phoneNumber,
    relationship,
    user: req.user._id, // Assign the ID of the logged-in user
  });

  if (familyMember) {
    // Add the newly created family member's ID to the user's familyMembers array
    const user = await User.findById(req.user._id);
    if (user) {
      user.familyMembers.push(familyMember._id);
      await user.save(); // Save the updated user document
    }

    // Respond with success message and the new family member's details
    res.status(201).json({
      message: 'Family member added successfully!',
      familyMember: {
        _id: familyMember._id,
        name: familyMember.name,
        phoneNumber: familyMember.phoneNumber,
        relationship: familyMember.relationship,
        isVerified: familyMember.isVerified,
      },
    });
  } else {
    // If family member creation fails
    res.status(400);
    throw new Error('Invalid family member data');
  }
});

// @desc    Update a family member
// @route   PUT /api/family/:id
// @access  Private (Authenticated User only)
const updateFamilyMember = asyncHandler(async (req, res) => {
  const { id } = req.params; // Get family member ID from URL parameters
  const { name, phoneNumber, relationship, isVerified } = req.body; // Get updated data from request body

  // Find the family member by ID
  const familyMember = await FamilyMember.findById(id);

  if (familyMember) {
    // Ensure the found family member belongs to the authenticated user
    if (familyMember.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to update this family member');
    }

    // Check if the new phone number is provided and is different from the current one
    if (phoneNumber && phoneNumber !== familyMember.phoneNumber) {
      // Validate the format of the new phone number
      if (!isValidPhone(phoneNumber)) {
        res.status(400);
        throw new Error('Invalid phone number for family member. Must be 10 digits and start with 6, 7, 8, or 9.');
      }
      // Check if another family member of the current user already has this new phone number
      const existingMemberWithNewNumber = await FamilyMember.findOne({
        user: req.user._id,
        phoneNumber: phoneNumber,
        _id: { $ne: familyMember._id } // Exclude the current family member from the check
      });
      if (existingMemberWithNewNumber) {
        res.status(400);
        throw new Error('Another family member with this phone number already exists.');
      }
    }

    // Update family member fields with new data, or retain existing if not provided
    familyMember.name = name || familyMember.name;
    familyMember.phoneNumber = phoneNumber || familyMember.phoneNumber;
    familyMember.relationship = relationship || familyMember.relationship;
    // Update isVerified only if it's explicitly provided as a boolean
    familyMember.isVerified = typeof isVerified === 'boolean' ? isVerified : familyMember.isVerified;

    const updatedFamilyMember = await familyMember.save(); // Save the updated family member document

    // Respond with success message and the updated family member's details
    res.json({
      message: 'Family member updated successfully!',
      familyMember: {
        _id: updatedFamilyMember._id,
        name: updatedFamilyMember.name,
        phoneNumber: updatedFamilyMember.phoneNumber,
        relationship: updatedFamilyMember.relationship,
        isVerified: updatedFamilyMember.isVerified,
      },
    });
  } else {
    // If family member is not found
    res.status(404);
    throw new Error('Family member not found');
  }
});

// @desc    Delete a family member
// @route   DELETE /api/family/:id
// @access  Private (Authenticated User only)
const deleteFamilyMember = asyncHandler(async (req, res) => {
  const { id } = req.params; // Get family member ID from URL parameters

  // Find the family member by ID
  const familyMember = await FamilyMember.findById(id);

  if (familyMember) {
    // Ensure the family member belongs to the authenticated user
    if (familyMember.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to delete this family member');
    }

    // Delete the family member document from the database
    await FamilyMember.deleteOne({ _id: id });

    // Remove the family member's ID from the user's familyMembers array
    const user = await User.findById(req.user._id);
    if (user) {
      user.familyMembers = user.familyMembers.filter(
        (memberId) => memberId.toString() !== id.toString()
      );
      await user.save(); // Save the updated user document
    }

    // Respond with success message
    res.json({ message: 'Family member removed successfully' });
  } else {
    // If family member is not found
    res.status(404);
    throw new Error('Family member not found');
  }
});

export { addFamilyMember, updateFamilyMember, deleteFamilyMember };
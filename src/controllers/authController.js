import User from '../models/user.js';
import generateToken from '../utils/jwt.js';
import asyncHandler from 'express-async-handler';
import { isValidGmail, isValidPhone } from '../utils/ValidationUtils.js';
import FamilyMember from '../models/FamilyMember.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phoneNumber, password, role } = req.body;

  // --- Initial Input Validation for all required fields ---
  if (!name) {
    res.status(400);
    throw new Error('Name is required.');
  }
  if (!email) {
    res.status(400);
    throw new Error('Email is required.');
  }
  if (!phoneNumber) {
    res.status(400);
    throw new Error('Phone number is required.');
  }
  if (!password) {
    res.status(400);
    throw new Error('Password is required.');
  }

  if (!isValidGmail(email)) {
    res.status(400);
    throw new Error('Invalid email format. Only @gmail.com emails are allowed.');
  }

  // Phone number format validation (must be 10 digits and start with 6, 7, 8, or 9)
  if (!isValidPhone(phoneNumber)) {
    res.status(400);
    throw new Error('Invalid phone number, Must be an Indian number with country code (+91) and 10 digits starting with 6, 7, 8, or 9.');
  }

  // --- User Uniqueness Checks (Email AND Phone Number) ---
  // Check if a user with this email already exists
  const userExistsByEmail = await User.findOne({ email });
  if (userExistsByEmail) {
    res.status(400);
    throw new Error('User already exists with this email.');
  }

  // Check if a user with this phone number already exists
  const userExistsByPhone = await User.findOne({ phoneNumber });
  if (userExistsByPhone) {
    res.status(400);
    throw new Error('Phone number is already used by another user.');
  }
  // --- End User Uniqueness Checks ---


  // --- Logic for FamilyMember Matching and Linking during Registration (Point 4 from your logic) ---
  let linkedFamilyMemberEntry = null;

  // Find family member entries that match by email OR phone, and are not yet linked to a User
  const matchingUnlinkedFamilyMembers = await FamilyMember.find({
    $or: [{ email: email }, { phoneNumber: phoneNumber }],
    isUser: false, // Only consider those not yet marked as a User
    userId: null   // Ensure they are truly unlinked
  });

  if (matchingUnlinkedFamilyMembers.length > 0) {
    // Filter for an exact match (both email AND phone number) with an unlinked family member
    const exactMatchCandidate = matchingUnlinkedFamilyMembers.find(fm =>
      fm.email === email && fm.phoneNumber === phoneNumber
    );

    if (exactMatchCandidate) {
      linkedFamilyMemberEntry = exactMatchCandidate;
    } else {
      // Scenario: Email matches but Phone doesn't, OR Phone matches but Email doesn't
      // This enforces the "pair must match" rule for family members who are trying to register
      if (matchingUnlinkedFamilyMembers.some(fm => fm.email === email && fm.phoneNumber !== phoneNumber)) {
        res.status(400);
        throw new Error('This email is associated with a family member, but the phone number does not match their record. Please register with the correct phone number and email.');
      }
      if (matchingUnlinkedFamilyMembers.some(fm => fm.phoneNumber === phoneNumber && fm.email !== email)) {
        res.status(400);
        throw new Error('This phone number is associated with a family member, but the email does not match their record. Please register with the correct email and phone Number.');
      }
    }
  }
  // --- End FamilyMember Matching and Linking Logic ---


  // Create new User
  const user = await User.create({
    name,
    email,
    phoneNumber,
    password, // Password will be automatically hashed by the UserSchema's pre-save hook
    role,
  });

  if (user) {
    // If a matching FamilyMember entry was found, update it to reflect the new User (Point 4)
    if (linkedFamilyMemberEntry) {
      linkedFamilyMemberEntry.isUser = true;         // Mark as a registered user
      linkedFamilyMemberEntry.userId = user._id;      // Link to the newly created User ID
      linkedFamilyMemberEntry.name = user.name;       // Sync name from User
      linkedFamilyMemberEntry.email = user.email;     // Sync email from User
      linkedFamilyMemberEntry.phoneNumber = user.phoneNumber; // Sync phone from User
      await linkedFamilyMemberEntry.save(); // Save the updated FamilyMember entry
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token: generateToken(user._id),
      message: linkedFamilyMemberEntry ? 'User registered and also present as family member of !' : 'User registered successfully!'
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Basic validation for login fields: ensure email and password are provided
  if (!email || !password) {
    res.status(400);
    throw new Error('Please enter both email and password.');
  }

  // Find the user by email
  const user = await User.findOne({ email });

  // If user exists and password matches, return user details and a new JWT token
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    // If user not found or password doesn't match
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

export { registerUser, loginUser };
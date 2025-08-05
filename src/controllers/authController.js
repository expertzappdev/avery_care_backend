import User from '../models/user.js';
import generateToken from '../utils/jwt.js';
import asyncHandler from 'express-async-handler';
import { isValidGmail, isValidPhone } from '../utils/ValidationUtils.js';
import FamilyMember from '../models/FamilyMember.js';
import generateOTP from '../utils/otp.js';
import { isValidOtp } from '../utils/ValidationUtils.js';
import { sendEmail } from '../config/emailConfig.js';
import { sendOtpSms } from '../config/smsConfig.js';

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phoneNumber, password, role } = req.body;

  // --- Step 1: Basic Validations ---
  if (!name || !email || !phoneNumber || !password) {
    res.status(400);
    throw new Error('Name, Email, Phone Number, and Password are required.');
  }

  if (!isValidGmail(email)) {
    res.status(400);
    throw new Error('Invalid email format. Only @gmail.com emails are allowed.');
  }

  if (!isValidPhone(phoneNumber)) {
    res.status(400);
    throw new Error('Invalid phone number. Must be Indian (+91) and start with 6, 7, 8, or 9.');
  }

  // --- Step 2: Uniqueness Checks ---
  const userExistsByEmail = await User.findOne({ email });
  if (userExistsByEmail) {
    res.status(400);
    throw new Error('User already exists with this email.');
  }

  const userExistsByPhone = await User.findOne({ phoneNumber });
  if (userExistsByPhone) {
    res.status(400);
    throw new Error('Phone number is already used by another user.');
  }

  // --- Step 3: FamilyMember Matching ---
  let linkedFamilyMemberEntry = null;

  const matchingUnlinkedFamilyMembers = await FamilyMember.find({
    $or: [{ email: email }, { phoneNumber: phoneNumber }],
    isUser: false,
    userId: null
  });

  if (matchingUnlinkedFamilyMembers.length > 0) {
    const exactMatch = matchingUnlinkedFamilyMembers.find(fm =>
      fm.email === email && fm.phoneNumber === phoneNumber
    );

    if (exactMatch) {
      linkedFamilyMemberEntry = exactMatch;
    } else {
      if (matchingUnlinkedFamilyMembers.some(fm => fm.email === email && fm.phoneNumber !== phoneNumber)) {
        res.status(400);
        throw new Error('This email is linked to a family member, but the phone number does not match.');
      }
      if (matchingUnlinkedFamilyMembers.some(fm => fm.phoneNumber === phoneNumber && fm.email !== email)) {
        res.status(400);
        throw new Error('This phone number is linked to a family member, but the email does not match.');
      }
    }
  }

  // --- Step 4: Generate OTP ---
  const emailOtp = generateOTP();
  const mobileOtp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 minutes

  // Send OTP via email
  await sendEmail(email, emailOtp);
  await sendOtpSms(phoneNumber, mobileOtp);

  // --- Step 5: Create User ---
  const user = await User.create({
    name,
    email,
    phoneNumber,
    password, // password hashing via schema
    role,
    emailOtp,
    mobileOtp,
    otpExpiresAt,
    isVerified: false,  // default false until verified via OTP
  });

  // --- Step 6: Link to FamilyMember (if applicable) ---
  if (linkedFamilyMemberEntry) {
    linkedFamilyMemberEntry.isUser = true;
    linkedFamilyMemberEntry.userId = user._id;
    linkedFamilyMemberEntry.name = user.name;
    linkedFamilyMemberEntry.email = user.email;
    linkedFamilyMemberEntry.phoneNumber = user.phoneNumber;
    await linkedFamilyMemberEntry.save();
  }

  // --- Step 7: Respond ---
  res.status(201).json({
    success: true,
    _id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    message: linkedFamilyMemberEntry
      ? 'Family Member registered as User OTP sent to email for Verification.'
      : 'User registered successfully, Verification Required OTP sent to email.',
  });
});


const verifyOtp = asyncHandler(async (req, res) => {
  const { email, emailOtp, mobileOtp } = req.body;
  console.log("api hit")

  if (!email || !emailOtp || !mobileOtp) {
    res.status(400);
    throw new Error('Email, mobileOtp and emailOtp are required.');
  }
  console.log(email, emailOtp, mobileOtp);

  if (!isValidOtp(mobileOtp)) {
    res.status(400);
    throw new Error('! Invalid mobile OTP, must be of four digits');
  }
  console.log("mobile passed")
  if (!isValidOtp(emailOtp)) {
    res.status(400);
    throw new Error('! Invalid email OTP, must be of four digits');
  }
  console.log("email passed")
  const user = await User.findOne({ email });
  // console.log(user.otp, user.otpExpiresAt)

  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  if (!user.emailOtp || !user.otpExpiresAt || !user.mobileOtp) {
    res.status(400);
    throw new Error('No OTP found. Please request a new one.');
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error('User is already verified.');
  }

  if (user.emailOtp !== emailOtp && user.mobileOtp !== mobileOtp) {
    res.status(400);
    throw new Error('Invalid OTP.');
  }

  if (user.otpExpiresAt < new Date()) {
    res.status(400);
    throw new Error('OTP has expired.');
  }

  // OTP matched & valid
  user.isVerified = true;
  user.emailOtp = null;
  user.mobileOtp = null;
  user.otpExpiresAt = null;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully. User Registered and Verified Successfully',
    token: generateToken(user._id), // send token after successful verification
  });
});


const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log("req recieved", email, password);
  if (!email || !password) {
    res.status(400);
    throw new Error('Please enter both email and password.');
  }
  const user = await User.findOne({ email })
    .populate({
      path: 'familyMembers.member',
      populate: { path: 'userInfo' }, // virtual populate if isUser: true
      select: 'name email phoneNumber isUser userId',
    });

  if (!user) {
    res.status(401);
    throw new Error('Invalid email');
  }

  if (!user.isVerified) {
    res.status(401);
    throw new Error('Account not verified');
  }

  const passwordMatches = await user.matchPassword(password);

  if (!passwordMatches) {
    res.status(401);
    throw new Error('Invalid password.');
  }

  // Format familyMembers
  let formattedFamily = {};

  for (let fm of user.familyMembers) {
    const member = fm.member;
    if (member) {
      formattedFamily[fm.relation] = {
        name: member.name,
        email: member.email,
        phoneNumber: member.phoneNumber,
      };
    }
  }

  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      token: generateToken(user._id),
      familyMembers: Object.keys(formattedFamily).length > 0 ? formattedFamily : null
    }
  });
});


export { registerUser, verifyOtp, loginUser };
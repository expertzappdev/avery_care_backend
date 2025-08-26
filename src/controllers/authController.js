import generateToken from '../utils/jwt.js';
import generateOTP from '../utils/otp.js';
import User from '../models/User.js';
import FamilyMember from '../models/FamilyMember.js';
import asyncHandler from 'express-async-handler';
import { isValidOtp, isValidGmail, isValidPhone } from '../utils/validationUtils.js';
import { sendOtpSms } from '../config/smsConfig.js';
import { generateLogAndSendEmail } from '../utils/logger.js';
import { sendEmail } from '../config/emailConfig.js';

const registerUser = asyncHandler(async (req, res) => {
	const { name, email, phoneNumber, password, role } = req.body;

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
	const userExistsByPhone = await User.findOne({ phoneNumber });


	if (userExistsByEmail && userExistsByPhone) {
		// Case 1: Agar email aur phone dono ek hi user ke hain
		if (userExistsByEmail._id.toString() === userExistsByPhone._id.toString()) {
			if (userExistsByEmail.isVerified) {
				// user verified,error
				res.status(400);
				throw new Error('A verified user with this email and phone number already exists.');
			} else {
				// if user is unverified , OTP regenerate 
				console.log("Same unverified user found. Regenerating OTP.");
				const user = userExistsByEmail;
				const emailOtp = generateOTP();
				const mobileOtp = generateOTP();
				user.emailOtp = emailOtp;
				user.mobileOtp = mobileOtp;
				user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

				await user.save();
				return res.status(201).json({
					success: true,
					_id: user._id,
					name: user.name,
					email: user.email,
					phoneNumber: user.phoneNumber,
					role: user.role,
					message: "User registered successfully, Verification Required OTP sent to email."
				});
			}
		} else {
			// Case 2: email phone users are different
			res.status(400);
			throw new Error('This email and phone number are associated with different accounts.');
		}
	} else if (userExistsByEmail) {
		// Case 3: email exist
		res.status(400);
		throw new Error('This email is already associated with an account.');
	} else if (userExistsByPhone) {
		// Case 4: phone number exists
		throw new Error('This phone number is already associated with an account.');
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
			linkedFamilyMemberEntry = exactMatch._id;
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

	const subject = "OTP Verification";
	const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d3748;">Password Recovery</h2>
      <p>Your One Time Password for E-Cart Account:</p>
      <div style="background: #f7fafc; padding: 16px; border-radius: 4px; 
                  font-size: 24px; font-weight: bold; text-align: center; 
                  margin: 16px 0; color: #2b6cb0;">
        ${emailOtp}
      </div>
      <p><strong>Do not share this code with anyone.</strong></p>
      <p style="color: #718096; font-size: 14px;">
        If you didn't request this, please ignore this email.
      </p>
    </div>
  `;

	await sendEmail(email, subject, "Your One Time Password is ", htmlContent);
	await sendOtpSms(phoneNumber, mobileOtp);

	const user = await User.create({
		name,
		email,
		phoneNumber,
		password, // password hashing via schema
		role,
		emailOtp,
		mobileOtp,
		isAFamilyMember: linkedFamilyMemberEntry,
		otpExpiresAt,
		isVerified: false,  // default false until verified via  OTP
	});

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
	if (user.isAFamilyMember) {
		const linkedFamilyMemberEntry = await FamilyMember.findById(user.isAFamilyMember)
		if (linkedFamilyMemberEntry) {
			linkedFamilyMemberEntry.isUser = true;
			linkedFamilyMemberEntry.userId = user._id;
			linkedFamilyMemberEntry.name = user.name;
			linkedFamilyMemberEntry.email = user.email;
			linkedFamilyMemberEntry.phoneNumber = user.phoneNumber;
			await linkedFamilyMemberEntry.save();
		}
	}
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

	const user = await User.findOne({ email }).select('+password');

	if (!user) {
		res.status(401);
		throw new Error('This email is not associated with a registered user');
	}

	if (!user.isVerified) {
		res.status(401);
		throw new Error('Account not verified');
	}

	const passwordMatches = await user.matchPassword(password);

	if (!passwordMatches) {
		if (user.role === "admin") {
			await generateLogAndSendEmail(
				email || 'unknown',
				'login_attempt',
				'failed',
				'Password mismatch',
				null
			);
			return res.status(401).json({ message: 'Invalid Credentials.' });
		}
		res.status(401);
		throw new Error('Invalid password.');
	}
	if (user.role === "admin") {
		await generateLogAndSendEmail(
			email || 'unknown',
			'login_attempt',
			'success',
			'User Login Successfull',
			null
		);
		return res.status(201).json({
			success: true,
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			token: generateToken(user._id),
		});
	}

	res.json({
		success: true,
		_id: user._id,
		name: user.name,
		email: user.email,
		phoneNumber: user.phoneNumber,
		role: user.role,
		token: generateToken(user._id),
	});
});

export { registerUser, verifyOtp, loginUser };
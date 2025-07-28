import User from '../models/User.js';
import generateToken from '../utils/jwt.js';
import { isValidGmail, isValidPhone } from '../utils/validationUtils.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, phoneNumber, password, role } = req.body;

  if (!isValidGmail(email)) {
    res.status(400);
    throw new Error('Invalid email format. Only @gmail.com emails are allowed.');
  }

  if (phoneNumber && !isValidPhone(phoneNumber)) {
    res.status(400);
    throw new Error('Invalid phone number. Must be 10 digits and start with 6, 7, 8, or 9.');
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists with this email' });
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    phoneNumber,
    password, // password will automatically be hashed using pre hook of UserSchema
    role,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token: generateToken(user._id), // Jwt generated from userID
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email });

  if (!isValidGmail(email)) {
    res.status(400);
    throw new Error('Invalid email format. Only @gmail.com emails are allowed.');
  }

  if (phoneNumber && !isValidPhone(phoneNumber)) {
    res.status(400);
    throw new Error('Invalid phone number. Must be 10 digits and start with 6, 7, 8, or 9.');
  }

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
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

export { registerUser, loginUser };
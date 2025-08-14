import Admin from '../models/admin/admin.js';
import Logs from '../models/admin/logs.js';
import User from '../models/user.js';
import FamilyMember from '../models/familyMember.js';
import bcrypt from 'bcryptjs';
import generateOTP from '../utils/otp.js';
import generateToken from '../utils/jwt.js';
import { sendEmail } from '../config/emailConfig.js';
import { isValidGmail, isValidOtp } from '../utils/validationUtils.js';


// Helper function: To generate and send JWT token
const createSendToken = (admin, statusCode, res) => {
    const token = generateToken(admin._id);

    // Cookie options for secure production environment
    const cookieOptions = {
        expires: new Date(
            Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true, // Not accessible by client-side JavaScript
    };

    // Enable secure flag in production
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    // Remove sensitive data from response
    admin.password = undefined;
    admin.otp = undefined;
    admin.otpExpiresAt = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            admin,
        },
    });
};

// Helper function: To create logs and send email notifications
const generateLogAndSendEmail = async (email, action, status, message, adminEmailForNotification) => {
    try {
        await Logs.create({ email, action, status, message });
        if (status === 'failed' && adminEmailForNotification) {
            const subject = 'Security Alert: Admin Panel Access Attempt';
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d32f2f;">Security Alert!</h2>
                    <p>Dear Admin,</p>
                    <p>Someone attempted to access your admin panel account with the email: <strong>${email}</strong>.</p>
                    <p>Details: <strong>${message}</strong></p>
                    <p style="color: #718096;">If this was you, please ignore this email. If not, please change your password immediately.</p>
                    <p style="color: #718096; font-size: 14px;">Timestamp: ${new Date().toLocaleString()}</p>
                </div>
            `;
            await sendEmail(adminEmailForNotification, subject, '', htmlContent);
            console.log(`Controller: Security alert email sent to ${adminEmailForNotification}`);
        }
    } catch (emailErr) {
        console.error('Controller: Failed to send security alert email:', emailErr.message);
    }
};

// --- API 1: Admin Login (Sends OTP) ---
export const adminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            await generateLogAndSendEmail(
                email || 'unknown',
                'login_attempt',
                'failed',
                'Email or password missing',
                null
            );
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Validate email format
        if (!isValidGmail(email)) {
            await generateLogAndSendEmail(
                email,
                'login_attempt',
                'failed',
                'Invalid email format (must be Gmail)',
                null
            );
            return res.status(400).json({ message: 'Invalid email format. Please use a valid Gmail address.' });
        }

        const admin = await Admin.findOne({ email }).select('+password');

        // Check if admin exists and password matches
        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            await generateLogAndSendEmail(
                email,
                'login_attempt',
                'failed',
                'Invalid email or password',
                admin ? admin.email : null
            );
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // If credentials are correct, generate and send OTP
        const otp = generateOTP(); // Using imported generateOTP
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        admin.otp = otp;
        admin.otpExpiresAt = otpExpiresAt;
        await admin.save({ validateBeforeSave: false });

        await sendEmail(
            admin.email,
            'OTP Verification for Admin Login',
            'Your One Time Password is ',
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2d3748;">Admin Panel Login OTP</h2>
                <p>Your One Time Password (OTP) for Admin Panel login is:</p>
                <div style="background: #f7fafc; padding: 16px; border-radius: 4px; 
                            font-size: 24px; font-weight: bold; text-align: center; 
                            margin: 16px 0; color: #2b6cb0;">
                    ${otp}
                </div>
                <p><strong>Do not share this code with anyone. It will expire in 10 minutes.</strong></p>
                <p style="color: #718096; font-size: 14px;">
                    If you did not request this, please ignore this email.
                </p>
            </div>
            `
        );

        res.status(200).json({
            status: 'success',
            message: 'OTP has been sent to your email.',
        });
    } catch (error) {
        console.error('Controller: Error in adminLogin:', error.message);
        await generateLogAndSendEmail(
            req.body.email || 'unknown',
            'login_attempt',
            'failed',
            `Server error: ${error.message}`,
            null
        );
        res.status(500).json({ message: 'Server error during login process.' });
    }
};

// --- API 2: Verifies OTP ---
export const verifyAdminOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        // Input validation
        if (!email || !otp) {
            await generateLogAndSendEmail(
                email || 'unknown',
                'otp_attempt',
                'failed',
                'Email or OTP missing',
                null
            );
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        // Validate email format
        if (!isValidGmail(email)) {
            await generateLogAndSendEmail(
                email,
                'otp_attempt',
                'failed',
                'Invalid email format (must be Gmail)',
                null
            );
            return res.status(400).json({ message: 'Invalid email format. Please use a valid Gmail address.' });
        }

        // Validate OTP format
        if (!isValidOtp(otp)) {
            await generateLogAndSendEmail(
                email,
                'otp_attempt',
                'failed',
                'Invalid OTP format (must be 4 digits)', // Assuming isValidOtp expects 4 digits based on regex
                null
            );
            return res.status(400).json({ message: 'Invalid OTP format.' });
        }


        const admin = await Admin.findOne({ email }).select('+otp +otpExpiresAt');

        if (!admin) {
            await generateLogAndSendEmail(
                email,
                'otp_attempt',
                'failed',
                'Admin user not found',
                null
            );
            return res.status(401).json({ message: 'Invalid email or OTP.' });
        }

        // Match OTP and check for expiration
        if (admin.otp !== otp || admin.otpExpiresAt < Date.now()) {
            await generateLogAndSendEmail(
                email,
                'otp_attempt',
                'failed',
                'Incorrect or expired OTP',
                admin.email
            );
            return res.status(401).json({ message: 'Incorrect or expired OTP.' });
        }

        // If OTP is correct and valid, clear OTP fields and generate JWT token
        admin.otp = undefined;
        admin.otpExpiresAt = undefined;
        await admin.save({ validateBeforeSave: false });

        await generateLogAndSendEmail(
            email,
            'otp_attempt',
            'success',
            'Admin successfully logged in',
            admin.email
        );

        // Send JWT token
        createSendToken(admin, 200, res);
    } catch (error) {
        console.error('Controller: Error in verifyAdminOtp:', error.message);
        await generateLogAndSendEmail(
            req.body.email || 'unknown',
            'otp_attempt',
            'failed',
            `Server error: ${error.message}`,
            null
        );
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        console.log('Controller: Attempting to fetch all users...');

        const users = await User.find().select('-password -otpExpiresAt -emailOtp -mobileOtp -__v');

        console.log(`Controller: Successfully fetched ${users.length} users.`);

        res.status(200).json({
            status: 'success',
            results: users.length,
            data: { users },
        });
    } catch (error) {
        console.error('Controller: Error fetching all users. The database query failed.', error.message);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
};

export const getSingleUserWithFamilyMembers = async (req, res) => {
    try {
        const { id } = req.params; // User ID from URL parameter

        const user = await User.findById(id).populate({
            path: 'familyMembers.member', // User ke familyMembers array ke andar ke 'member' field ko populate karo
            model: 'FamilyMember', // Jis model se populate karna hai
            select: '-__v -linkedToPrimaryUsers -userId', // FamilyMember ke in fields ko hide karo
        }).select('-password -otpExpiresAt -emailOtp -mobileOtp -__v'); // User ke sensitive fields hide karo

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            status: 'success',
            data: { user },
        });
    } catch (error) {
        console.error('Controller: Error fetching single user with family members:', error.message);
        res.status(500).json({ message: 'Server error fetching user details.' });
    }
};

export const getAllFamilyMembers = async (req, res) => {
    try {
        console.log('Controller: Attempting to fetch all family members...');
        
        if (!FamilyMember) {
            console.error('Controller: FamilyMember model is not defined. Check model import.');
            return res.status(500).json({ message: 'FamilyMember model not found on server.' });
        }
        
        const familyMembers = await FamilyMember.find().select('-__v -linkedToPrimaryUsers -userId');

        console.log(`Controller: Successfully fetched ${familyMembers.length} family members.`);

        res.status(200).json({
            status: 'success',
            results: familyMembers.length,
            data: { familyMembers },
        });
    } catch (error) {
        console.error('Controller: Error fetching all family members. The database query failed.', error.message);
        res.status(500).json({ message: 'Server error fetching all family members.' });
    }
};

// --- API 6: Get Single Specific Family Member by ID ---
export const getSingleFamilyMember = async (req, res) => {
    try {
        const { id } = req.params; // Family Member ID from URL parameter
        console.log(`Controller: Attempting to fetch family member with ID: ${id}`);
        
        const familyMember = await FamilyMember.findById(id)
            .select('-__v'); // '__v' field ko hide kiya

        if (!familyMember) {
            console.log(`Controller: Family member with ID ${id} not found.`);
            return res.status(404).json({ message: 'Family member not found.' });
        }

        console.log(`Controller: Successfully fetched family member with ID: ${id}`);
        
        res.status(200).json({
            status: 'success',
            data: { familyMember },
        });
    } catch (error) {
        console.error('Controller: Error fetching single family member. The database query failed.', error.message);
        res.status(500).json({ message: 'Server error fetching family member details.' });
    }
};

// --- API 7: Delete a User and their linked Family Members ---
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // User ID from URL parameter
        console.log(`Controller: Attempting to delete user with ID: ${id}`);
        
        const user = await User.findById(id).select('familyMembers email phoneNumber');

        if (!user) {
            console.log(`Controller: User with ID ${id} not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        // 1. Saare linked family members ki details fetch karo
        const familyMemberIds = user.familyMembers.map(fm => fm.member);
        const familyMembersDocs = await FamilyMember.find({ _id: { $in: familyMemberIds } });

        const idsToDelete = [];
        const idsToUnlink = [];

        familyMembersDocs.forEach(fm => {
            // 2. Logic check karo: isUser false hai aur sirf ye user linked hai
            if (fm.isUser === false && fm.linkedToPrimaryUsers.length === 1 && fm.linkedToPrimaryUsers[0].toString() === id) {
                idsToDelete.push(fm._id);
            } else {
                idsToUnlink.push(fm._id);
            }
        });
        
        // 3. Un family members ko delete karo jo sirf isi user se linked the
        if (idsToDelete.length > 0) {
            await FamilyMember.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`Controller: Successfully deleted ${idsToDelete.length} family members.`);
        }

        // 4. Baaki family members se user ki ID hata do
        if (idsToUnlink.length > 0) {
            await FamilyMember.updateMany(
                { _id: { $in: idsToUnlink } },
                { $pull: { linkedToPrimaryUsers: id } }
            );
            console.log(`Controller: Successfully unlinked user from ${idsToUnlink.length} family members.`);
        }

        // 5. User ke email aur phoneNumber se matching family member entry dhundo
        const matchingFamilyMember = await FamilyMember.findOne({
            email: user.email,
            phoneNumber: user.phoneNumber
        });

        // Agar matching family member entry milti hai
        if (matchingFamilyMember) {
            const familyMemberId = matchingFamilyMember._id;
            const linkedUserIds = matchingFamilyMember.linkedToPrimaryUsers;

            console.log(`Controller: Found matching FamilyMember ID: ${familyMemberId}`);
            
            // 3. Unlinked users ke familyMembers array se is family member entry ko hatao
            await User.updateMany(
                { _id: { $in: linkedUserIds } },
                { $pull: { familyMembers: { member: familyMemberId } } }
            );

            console.log(`Controller: Unlinked FamilyMember entry from ${linkedUserIds.length} users.`);

            // 4. Ab us matching family member entry ko delete karo
            await FamilyMember.findByIdAndDelete(familyMemberId);
            console.log(`Controller: Successfully deleted the matching FamilyMember entry.`);
        }

        // 5. Ab user ko delete karo
        await User.findByIdAndDelete(id);
        console.log(`Controller: Successfully deleted the matching FamilyMember entry.`);

        res.status(200).json({
            status: 'success',
            message: 'User and associated family members deleted/unlinked successfully.',
        });
    } catch (error) {
        console.error('Controller: Error deleting user. The database operation failed.', error.message);
        res.status(500).json({ message: 'Server error deleting user.' });
    }
};

export const deleteFamilyMember = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Controller: Attempting to delete family member with ID: ${id}`);
        
        // 1. Pehle Family Member ko find karo taki linked users ki list mil jaye
        const familyMember = await FamilyMember.findById(id);

        if (!familyMember) {
            console.log(`Controller: Family member with ID ${id} not found.`);
            return res.status(404).json({ message: 'Family member not found.' });
        }
        
        // 2. Us family member se linked saare users ke document se uski ID hatao
        await User.updateMany(
            { 'familyMembers.member': id },
            { $pull: { familyMembers: { member: id } } }
        );
        console.log(`Controller: Successfully unlinked family member from users' familyMembers array.`);

        // 3. Ab family member ko delete karo
        await FamilyMember.findByIdAndDelete(id);

        console.log(`Controller: Successfully deleted family member with ID: ${id}`);
        
        res.status(200).json({
            status: 'success',
            message: 'Family member deleted successfully.',
        });
    } catch (error) {
        console.error('Controller: Error deleting family member. The database operation failed.', error.message);
        res.status(500).json({ message: 'Server error deleting family member.' });
    }
};

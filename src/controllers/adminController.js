import User from '../models/user.js';
import FamilyMember from '../models/familyMember.js';
import ScheduledCall from '../models/scheduledCallSummary.js';

// GET /api/users
// Example: /api/users?role=admin&isVerified=true&search=john&page=2&limit=10&sort=-createdAt
// controllers/adminController.js

export const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, isVerified, name, email, phoneNumber, createdAtInBetweenStartDate, createdAtInBetweenEndDate, familyMemberName, familyMemberCount } = req.query;

        const query = {};

        // Normal user filters
        if (role) query.role = role;
        if (isVerified) query.isVerified = isVerified === "true";

        if (name) query.name = { $regex: name, $options: "i" };
        if (email) query.email = { $regex: email, $options: "i" };
        if (phoneNumber) query.phoneNumber = { $regex: phoneNumber, $options: "i" };

        if (createdAtInBetweenStartDate && createdAtInBetweenEndDate) {
            query.createdAt = {
                $gte: new Date(createdAtInBetweenStartDate),
                $lte: new Date(createdAtInBetweenEndDate),
            };
        }

        // Aggregation pipeline start
        const pipeline = [
            { $match: query },

            // lookup familyMembers
            {
                $lookup: {
                    from: "familymembers", // collection name (lowercase plural of model)
                    localField: "familyMembers.member",
                    foreignField: "_id",
                    as: "familyDetails",
                },
            },
        ];

        // Family member filters
        if (familyMemberName) {
            pipeline.push({
                $match: {
                    "familyDetails.name": familyMemberName, // full match only
                },
            });
        }

        if (familyMemberCount) {
            pipeline.push({
                $match: {
                    $expr: { $eq: [{ $size: "$familyMembers" }, Number(familyMemberCount)] },
                },
            });
        }

        // Pagination
        const skip = (Number(page) - 1) * Number(limit);

        // total count (without pagination)
        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await User.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        // fetch paginated users
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: Number(limit) });

        const users = await User.aggregate(pipeline);

        res.status(200).json({
            success: true,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
            totalUsers: total,
            count: users.length,
            users,
        });

    } catch (error) {
        console.error("Error in getUsersModified:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
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


export const familyMembers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            name,
            email,
            phoneNumber,
            isUser,
            createdAtStartDate,
            createdAtEndDate,
            modifiedInBetweenStartDate,
            modifiedInBetweenEndDate,
            linkedToPrimaryUserName,
        } = req.query;

        const query = {};

        // 🔍 Name search
        if (name) query.name = { $regex: name, $options: 'i' };

        // 🔍 Email search
        if (email) query.email = { $regex: email, $options: 'i' };

        // 🔍 Phone search
        if (phoneNumber) query.phoneNumber = { $regex: phoneNumber, $options: 'i' };

        // 🔍 isUser filter
        if (isUser !== undefined) query.isUser = isUser === 'true';

        // 🔍 CreatedAt date range
        if (createdAtStartDate || createdAtEndDate) {
            query.createdAt = {};
            if (createdAtStartDate) query.createdAt.$gte = new Date(createdAtStartDate);
            if (createdAtEndDate) query.createdAt.$lte = new Date(createdAtEndDate);
        }

        // 🔍 UpdatedAt date range
        if (modifiedInBetweenStartDate || modifiedInBetweenEndDate) {
            query.updatedAt = {};
            if (modifiedInBetweenStartDate) query.updatedAt.$gte = new Date(modifiedInBetweenStartDate);
            if (modifiedInBetweenEndDate) query.updatedAt.$lte = new Date(modifiedInBetweenEndDate);
        }

        // 🔍 linkedToPrimaryUserName filter
        if (linkedToPrimaryUserName) {
            const users = await User.find({
                name: { $regex: linkedToPrimaryUserName, $options: 'i' },
            }).select('_id');

            const userIds = users.map((u) => u._id);
            if (userIds.length > 0) {
                query.linkedToPrimaryUsers = { $in: userIds };
            } else {

                return res.status(200).json({
                    success: true,
                    data: [],
                    total: 0,
                    page: Number(page),
                    limit: Number(limit),
                });
            }
        }

        // Pagination + Populate
        const familyMembers = await FamilyMember.find(query)
            .populate('linkedToPrimaryUsers', 'name email phoneNumber')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await FamilyMember.countDocuments(query);

        res.status(200).json({
            success: true,
            data: familyMembers,
            total,
            page: Number(page),
            limit: Number(limit),
        });
    } catch (error) {
        console.error('Error fetching family members:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
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

// --- API 7: Calls Scheduled ---
export const getScheduledCalls = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            recipientName,
            scheduledByName,
            scheduledToName,
            recipientNumber,
            scheduledAtBeetweenStartDate,//scheduledAtBeetweenStartDate
            scheduledAtBeetweenEndDate,//scheduledAtBeetweenEndDate
            durationInSeconds,
            minDuration,
            maxDuration,
            startBetweenStartTime,//startBetweenStartTime
            startBetweenEndTime,//startBetweenEndTime
            endBetweenStartTime,//endBetweenStartTime
            endBetweenEndTime,//endBetweenEndTime
            status,
            triesLeft,
        } = req.query;

        const query = {};

        // 🔍 recipientName
        if (recipientName) {
            query.recipientName = { $regex: recipientName, $options: "i" };
        }

        // 🔍 scheduledByName 
        if (scheduledByName) {
            const users = await User.find({
                name: { $regex: scheduledByName, $options: "i" },
            }).select("_id");
            const ids = users.map((u) => u._id);
            if (ids.length > 0) {
                query.scheduledBy = { $in: ids };
            } else {
                return res.json({
                    success: true,
                    data: [],
                    total: 0,
                    page: Number(page),
                    limit: Number(limit),
                });
            }
        }

        // 🔍 scheduledToName 
        if (scheduledToName) {
            const fms = await FamilyMember.find({
                name: { $regex: scheduledToName, $options: "i" },
            }).select("_id");
            const ids = fms.map((f) => f._id);
            if (ids.length > 0) {
                query.scheduledTo = { $in: ids };
            } else {
                return res.json({
                    success: true,
                    data: [],
                    total: 0,
                    page: Number(page),
                    limit: Number(limit),
                });
            }
        }

        // 🔍 recipientNumber
        if (recipientNumber) {
            query.recipientNumber = { $regex: recipientNumber, $options: "i" };
        }

        // 🔍 scheduledAt range
        if (scheduledAtBeetweenStartDate || scheduledAtBeetweenEndDate) {
            query.scheduledAt = {};
            if (scheduledAtBeetweenStartDate)
                query.scheduledAt.$gte = new Date(scheduledAtBeetweenStartDate);
            if (scheduledAtBeetweenEndDate)
                query.scheduledAt.$lte = new Date(scheduledAtBeetweenEndDate);
        }

        // 🔍 durationInSeconds
        if (durationInSeconds) {
            query.durationInSeconds = Number(durationInSeconds);
        }

        // 🔍 durationInSeconds
        if (minDuration || maxDuration) {
            query.durationInSeconds = {};
            if (minDuration) query.durationInSeconds.$gte = Number(minDuration);
            if (maxDuration) query.durationInSeconds.$lte = Number(maxDuration);
        }
        // 🔍 startTime range
        if (startBetweenStartTime || startBetweenEndTime) {
            query.startTime = {};
            if (startBetweenStartTime) query.startTime.$gte = new Date(startBetweenStartTime);
            if (startBetweenEndTime) query.startTime.$lte = new Date(startBetweenEndTime);
        }

        // 🔍 endTime range
        if (endBetweenStartTime || endBetweenEndTime) {
            query.endTime = {};
            if (endBetweenStartTime) query.endTime.$gte = new Date(endBetweenStartTime);
            if (endBetweenEndTime) query.endTime.$lte = new Date(endBetweenEndTime);
        }

        // 🔍 status
        if (status) {
            query.status = status;
        }

        // 🔍 triesLeft
        if (triesLeft !== undefined) {
            query.triesLeft = Number(triesLeft);
        }

        // Pagination + Populate
        const calls = await ScheduledCall.find(query)
            .populate("scheduledBy", "name email phoneNumber")
            .populate("scheduledTo", "name email phoneNumber")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await ScheduledCall.countDocuments(query);

        res.json({
            success: true,
            data: calls,
            total,
            page: Number(page),
            limit: Number(limit),
        });
    } catch (error) {
        console.error("Error fetching scheduled calls:", error);
        res
            .status(500)
            .json({ success: false, message: "Server Error", error: error.message });
    }
};

export const deleteScheduledCall = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const deletedCall = await ScheduledCall.findByIdAndDelete(id);

    if (!deletedCall) {
      return res.status(404).json({
        success: false,
        message: "Scheduled Call not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Scheduled Call deleted successfully",
      data: deletedCall,
    });
  } catch (error) {
    console.error("Error deleting scheduled call:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};










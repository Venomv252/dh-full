/**
 * User Controller
 * Handles user registration, profile management, and user-related operations
 * Supports comprehensive user profiles with encrypted sensitive data
 */

const User = require('../models/User');
const { USER_ROLES, ERROR_CODES, HTTP_STATUS } = require('../config/constants');
const { generateUserToken } = require('../middleware/auth');

/**
 * Register new user
 * POST /api/user/register
 * 
 * Creates a new user account with comprehensive profile information
 * Handles email uniqueness validation and sensitive data encryption
 */
const registerUser = async (req, res, next) => {
  try {
    const userData = req.body;
    
    // Check if email already exists (additional check beyond model validation)
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      const error = new Error('Email address is already registered');
      error.statusCode = 409;
      error.code = ERROR_CODES.EMAIL_ALREADY_EXISTS;
      error.details = {
        email: userData.email,
        suggestion: 'Please use a different email address or try logging in'
      };
      throw error;
    }
    
    // Create new user (encryption happens in pre-save middleware)
    const user = new User(userData);
    await user.save();
    
    // Get decrypted data for response (without sensitive fields)
    const userResponse = {
      userId: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      // Don't include sensitive encrypted data in registration response
      profileComplete: !!(
        user.fullName && 
        user.dob && 
        user.phone && 
        user.address
      )
    };
    
    // Generate JWT token for immediate authentication (optional)
    const token = generateUserToken({
      _id: user._id,
      email: user.email,
      role: user.role
    });
    
    const response = {
      success: true,
      data: {
        user: userResponse,
        token, // Include token for immediate login
        message: 'User registered successfully'
      },
      message: 'Registration completed successfully'
    };
    
    res.status(HTTP_STATUS.CREATED).json(response);
    
  } catch (error) {
    // Handle specific registration errors
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern || {})[0] || 'email';
      error.message = `${field.charAt(0).toUpperCase() + field.slice(1)} is already registered`;
      error.statusCode = 409;
      error.code = field === 'email' ? ERROR_CODES.EMAIL_ALREADY_EXISTS : ERROR_CODES.PHONE_ALREADY_EXISTS;
    }
    
    next(error);
  }
};

/**
 * Get user profile
 * GET /api/user/:userId
 * 
 * Retrieves user profile information with decrypted sensitive data
 * Users can only access their own profile unless they're admin
 */
const getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    
    // Check if user is accessing their own profile or is admin
    const isOwnProfile = requestingUser.userId === userId;
    const isAdmin = requestingUser.role === USER_ROLES.ADMIN;
    
    if (!isOwnProfile && !isAdmin) {
      const error = new Error('You can only access your own profile');
      error.statusCode = 403;
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      throw error;
    }
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.USER_NOT_FOUND;
      throw error;
    }
    
    // Get decrypted user data
    const decryptedUser = user.getDecryptedData();
    
    // Remove sensitive fields for non-admin users accessing other profiles
    if (!isOwnProfile && !isAdmin) {
      delete decryptedUser.medicalConditions;
      delete decryptedUser.allergies;
      delete decryptedUser.emergencyContacts;
      delete decryptedUser.insurance;
      delete decryptedUser.vehicles;
    }
    
    const response = {
      success: true,
      data: {
        user: decryptedUser,
        permissions: {
          canEdit: isOwnProfile || isAdmin,
          canViewMedical: isOwnProfile || isAdmin,
          canViewContacts: isOwnProfile || isAdmin
        }
      },
      message: 'User profile retrieved successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/user/:userId
 * 
 * Updates user profile information with validation and encryption
 * Users can only update their own profile unless they're admin
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    const requestingUser = req.user;
    
    // Check if user is updating their own profile or is admin
    const isOwnProfile = requestingUser.userId === userId;
    const isAdmin = requestingUser.role === USER_ROLES.ADMIN;
    
    if (!isOwnProfile && !isAdmin) {
      const error = new Error('You can only update your own profile');
      error.statusCode = 403;
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      throw error;
    }
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.USER_NOT_FOUND;
      throw error;
    }
    
    // Prevent role changes unless admin
    if (updateData.role && !isAdmin) {
      delete updateData.role;
    }
    
    // Prevent email changes (would require email verification)
    if (updateData.email && updateData.email !== user.email) {
      const error = new Error('Email changes are not allowed. Please contact support.');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }
    
    // Update user fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        user[key] = updateData[key];
      }
    });
    
    // Save updated user (encryption happens in pre-save middleware)
    await user.save();
    
    // Get decrypted data for response
    const decryptedUser = user.getDecryptedData();
    
    const response = {
      success: true,
      data: {
        user: decryptedUser,
        updatedFields: Object.keys(updateData)
      },
      message: 'Profile updated successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 * DELETE /api/user/:userId
 * 
 * Soft delete or hard delete user account
 * Only admins can delete other users, users can delete their own account
 */
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { permanent = false } = req.query;
    const requestingUser = req.user;
    
    // Check permissions
    const isOwnAccount = requestingUser.userId === userId;
    const isAdmin = requestingUser.role === USER_ROLES.ADMIN;
    
    if (!isOwnAccount && !isAdmin) {
      const error = new Error('You can only delete your own account');
      error.statusCode = 403;
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      throw error;
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.USER_NOT_FOUND;
      throw error;
    }
    
    // Prevent admin from deleting themselves
    if (isOwnAccount && user.role === USER_ROLES.ADMIN) {
      const error = new Error('Admin users cannot delete their own account');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }
    
    let deletionResult;
    
    if (permanent && isAdmin) {
      // Hard delete (admin only)
      deletionResult = await User.findByIdAndDelete(userId);
    } else {
      // Soft delete - deactivate account
      user.role = 'deactivated';
      user.email = `deleted_${Date.now()}_${user.email}`;
      await user.save();
      deletionResult = user;
    }
    
    const response = {
      success: true,
      data: {
        userId,
        deletionType: permanent && isAdmin ? 'permanent' : 'deactivated',
        deletedAt: new Date().toISOString()
      },
      message: permanent && isAdmin ? 'User permanently deleted' : 'User account deactivated'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * List users (Admin only)
 * GET /api/user/list
 * 
 * Retrieves paginated list of users with filtering options
 * Admin-only endpoint for user management
 */
const listUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by role
    if (role && Object.values(USER_ROLES).includes(role)) {
      query.role = role;
    }
    
    // Search by email (case-insensitive)
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('-__v') // Exclude version field
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    
    // Format user data (remove sensitive encrypted data)
    const formattedUsers = users.map(user => ({
      userId: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      age: user.age,
      // Don't include encrypted sensitive data in list view
      hasProfile: !!(user.fullName && user.dob && user.phone),
      hasEmergencyContacts: user.emergencyContacts?.length > 0,
      hasVehicles: user.vehicles?.length > 0,
      hasInsurance: !!user.insurance?.provider
    }));
    
    const response = {
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          pages: Math.ceil(totalUsers / parseInt(limit)),
          hasNext: skip + parseInt(limit) < totalUsers,
          hasPrev: parseInt(page) > 1
        },
        filters: {
          role,
          search,
          sortBy,
          sortOrder
        }
      },
      message: 'Users retrieved successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics (Admin only)
 * GET /api/user/stats
 * 
 * Returns system-wide user statistics for monitoring and analytics
 */
const getUserStatistics = async (req, res, next) => {
  try {
    // Get user counts by role
    const [
      totalUsers,
      usersByRole,
      recentUsers,
      usersWithCompleteProfiles
    ] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }),
      User.countDocuments({
        fullName: { $exists: true },
        dob: { $exists: true },
        phone: { $exists: true },
        'address.street': { $exists: true }
      })
    ]);
    
    // Format role statistics
    const roleStats = {};
    Object.values(USER_ROLES).forEach(role => {
      roleStats[role] = 0;
    });
    
    usersByRole.forEach(stat => {
      if (stat._id && roleStats.hasOwnProperty(stat._id)) {
        roleStats[stat._id] = stat.count;
      }
    });
    
    // Calculate percentages
    const completeProfilePercentage = totalUsers > 0 
      ? Math.round((usersWithCompleteProfiles / totalUsers) * 100)
      : 0;
    
    const response = {
      success: true,
      data: {
        totalUsers,
        roleDistribution: roleStats,
        recentRegistrations: recentUsers,
        completeProfiles: usersWithCompleteProfiles,
        completeProfilePercentage,
        averageUsersPerDay: Math.round(recentUsers / 30),
        systemHealth: {
          totalUsers,
          activeRoles: Object.keys(roleStats).filter(role => roleStats[role] > 0).length,
          dataQuality: completeProfilePercentage
        }
      },
      message: 'User statistics retrieved successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role (Admin only)
 * PATCH /api/user/:userId/role
 * 
 * Updates user role - admin-only operation
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validate role
    if (!Object.values(USER_ROLES).includes(role)) {
      const error = new Error('Invalid role specified');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      error.details = {
        providedRole: role,
        validRoles: Object.values(USER_ROLES)
      };
      throw error;
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.USER_NOT_FOUND;
      throw error;
    }
    
    const previousRole = user.role;
    
    // Update role
    user.role = role;
    await user.save();
    
    const response = {
      success: true,
      data: {
        userId,
        previousRole,
        newRole: role,
        updatedAt: user.updatedAt
      },
      message: `User role updated from ${previousRole} to ${role}`
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Search users by criteria (Admin only)
 * POST /api/user/search
 * 
 * Advanced user search with multiple criteria
 */
const searchUsers = async (req, res, next) => {
  try {
    const {
      email,
      role,
      ageRange,
      city,
      state,
      bloodGroup,
      hasEmergencyContacts,
      hasVehicles,
      hasInsurance,
      dateRange,
      page = 1,
      limit = 20
    } = req.body;
    
    // Build search query
    const query = {};
    
    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }
    
    if (role) {
      query.role = role;
    }
    
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }
    
    if (state) {
      query['address.state'] = { $regex: state, $options: 'i' };
    }
    
    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }
    
    if (hasEmergencyContacts !== undefined) {
      query.emergencyContacts = hasEmergencyContacts 
        ? { $exists: true, $not: { $size: 0 } }
        : { $size: 0 };
    }
    
    if (hasVehicles !== undefined) {
      query.vehicles = hasVehicles 
        ? { $exists: true, $not: { $size: 0 } }
        : { $size: 0 };
    }
    
    if (hasInsurance !== undefined) {
      query['insurance.provider'] = hasInsurance 
        ? { $exists: true }
        : { $exists: false };
    }
    
    if (dateRange) {
      const dateQuery = {};
      if (dateRange.start) {
        dateQuery.$gte = new Date(dateRange.start);
      }
      if (dateRange.end) {
        dateQuery.$lte = new Date(dateRange.end);
      }
      if (Object.keys(dateQuery).length > 0) {
        query.createdAt = dateQuery;
      }
    }
    
    // Execute search with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, totalResults] = await Promise.all([
      User.find(query)
        .select('-__v')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query)
    ]);
    
    // Format results (no sensitive data)
    const formattedUsers = users.map(user => ({
      userId: user._id,
      email: user.email,
      role: user.role,
      age: user.age,
      city: user.address?.city,
      state: user.address?.state,
      bloodGroup: user.bloodGroup,
      createdAt: user.createdAt,
      hasEmergencyContacts: user.emergencyContacts?.length > 0,
      hasVehicles: user.vehicles?.length > 0,
      hasInsurance: !!user.insurance?.provider
    }));
    
    const response = {
      success: true,
      data: {
        users: formattedUsers,
        searchCriteria: req.body,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResults,
          pages: Math.ceil(totalResults / parseInt(limit))
        }
      },
      message: `Found ${totalResults} users matching search criteria`
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  listUsers,
  getUserStatistics,
  updateUserRole,
  searchUsers
};
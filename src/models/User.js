/**
 * Enhanced User Model
 * 
 * Comprehensive user schema supporting all user types (user, police, hospital, admin)
 * with encrypted sensitive data, medical information, and role-specific fields
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { encryptSensitiveData, decryptSensitiveData } = require('../utils/encryption');

// Emergency Contact Schema
const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: mongoose.Schema.Types.Mixed, // Encrypted object
    required: true
  },
  relation: {
    type: String,
    required: true,
    enum: ['spouse', 'parent', 'sibling', 'child', 'friend', 'colleague', 'other']
  },
  phone: {
    type: mongoose.Schema.Types.Mixed, // Encrypted object
    required: true
  }
}, { _id: true });

// Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: mongoose.Schema.Types.Mixed, // Encrypted object
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['car', 'motorcycle', 'truck', 'bicycle', 'bus', 'van', 'other']
  },
  model: {
    type: String,
    required: true,
    maxlength: 100
  },
  color: {
    type: String,
    maxlength: 50
  }
}, { _id: true });

// Insurance Schema
const insuranceSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.Mixed, // Encrypted object
    required: false
  },
  policyNumber: {
    type: mongoose.Schema.Types.Mixed, // Encrypted object
    required: false
  },
  validTill: {
    type: Date,
    required: false
  },
  coverageType: {
    type: String,
    enum: ['basic', 'comprehensive', 'premium'],
    default: 'basic'
  }
}, { _id: false });

// Address Schema
const addressSchema = new mongoose.Schema({
  street: {
    type: mongoose.Schema.Types.Mixed, // Encrypted object
    required: true
  },
  city: {
    type: String,
    required: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    maxlength: 100
  },
  pincode: {
    type: String,
    required: true,
    maxlength: 20
  },
  country: {
    type: String,
    default: 'India',
    maxlength: 100
  }
}, { _id: false });

// Main User Schema
const userSchema = new mongoose.Schema({
  // Basic Information
  fullName: {
    type: mongoose.Schema.Types.Mixed, // Encrypted object
    required: true
  },
  dob: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        const age = Math.floor((Date.now() - value.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 13 && age <= 120; // Age between 13 and 120
      },
      message: 'Age must be between 13 and 120 years'
    }
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other']
  },
  
  // Contact Information
  phone: {
    type: mongoose.Schema.Types.Mixed, // Encrypted object
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  
  // Authentication
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Don't include in queries by default
  },
  
  // Address Information
  address: {
    type: addressSchema,
    required: true
  },
  
  // Medical Information (Encrypted)
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    default: 'unknown'
  },
  medicalConditions: [{
    type: mongoose.Schema.Types.Mixed // Encrypted array
  }],
  allergies: [{
    type: mongoose.Schema.Types.Mixed // Encrypted array
  }],
  
  // Emergency Contacts
  emergencyContacts: {
    type: [emergencyContactSchema],
    validate: {
      validator: function(contacts) {
        return contacts.length >= 1 && contacts.length <= 5;
      },
      message: 'Must have between 1 and 5 emergency contacts'
    }
  },
  
  // Vehicle Information
  vehicles: {
    type: [vehicleSchema],
    validate: {
      validator: function(vehicles) {
        return vehicles.length <= 5;
      },
      message: 'Cannot have more than 5 vehicles'
    }
  },
  
  // Insurance Information
  insurance: {
    type: insuranceSchema,
    required: false
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['user', 'police', 'hospital', 'admin'],
    default: 'user',
    required: true
  },
  
  // Role-specific fields (conditional based on role)
  department: {
    type: String,
    maxlength: 100,
    required: function() {
      return ['police', 'hospital'].includes(this.role);
    }
  },
  jurisdiction: {
    type: String,
    maxlength: 200,
    required: function() {
      return this.role === 'police';
    }
  },
  licenseNumber: {
    type: String,
    maxlength: 50,
    required: function() {
      return this.role === 'hospital';
    }
  },
  badgeNumber: {
    type: String,
    maxlength: 50,
    required: function() {
      return this.role === 'police';
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    maxlength: 500
  },
  bannedAt: {
    type: Date
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Activity Tracking
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  
  // Password Reset
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  // Email Verification
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.dob) return null;
  return Math.floor((Date.now() - this.dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  if (!this.address) return null;
  const decryptedStreet = decryptSensitiveData(this.address.street);
  return `${decryptedStreet}, ${this.address.city}, ${this.address.state} ${this.address.pincode}, ${this.address.country}`;
});

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'phone.encrypted': 1 }, { unique: true, sparse: true }); // Unique encrypted phone
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ jurisdiction: 1 });
userSchema.index({ isActive: 1, createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ lastActiveAt: -1 });

// Compound indexes
userSchema.index({ role: 1, department: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isActive: 1, isBanned: 1 });

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  try {
    // Only hash password if it's modified
    if (!this.isModified('password')) return next();
    
    // Hash password with cost of 12
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for data encryption
userSchema.pre('save', async function(next) {
  try {
    // Encrypt sensitive fields if they are modified
    if (this.isModified('fullName') && typeof this.fullName === 'string') {
      this.fullName = encryptSensitiveData(this.fullName);
    }
    
    if (this.isModified('phone') && typeof this.phone === 'string') {
      this.phone = encryptSensitiveData(this.phone);
    }
    
    if (this.isModified('address.street') && typeof this.address.street === 'string') {
      this.address.street = encryptSensitiveData(this.address.street);
    }
    
    // Encrypt medical conditions
    if (this.isModified('medicalConditions')) {
      this.medicalConditions = this.medicalConditions.map(condition => 
        typeof condition === 'string' ? encryptSensitiveData(condition) : condition
      );
    }
    
    // Encrypt allergies
    if (this.isModified('allergies')) {
      this.allergies = this.allergies.map(allergy => 
        typeof allergy === 'string' ? encryptSensitiveData(allergy) : allergy
      );
    }
    
    // Encrypt emergency contacts
    if (this.isModified('emergencyContacts')) {
      this.emergencyContacts = this.emergencyContacts.map(contact => ({
        ...contact,
        name: typeof contact.name === 'string' ? encryptSensitiveData(contact.name) : contact.name,
        phone: typeof contact.phone === 'string' ? encryptSensitiveData(contact.phone) : contact.phone
      }));
    }
    
    // Encrypt vehicle information
    if (this.isModified('vehicles')) {
      this.vehicles = this.vehicles.map(vehicle => ({
        ...vehicle,
        vehicleNumber: typeof vehicle.vehicleNumber === 'string' ? 
          encryptSensitiveData(vehicle.vehicleNumber) : vehicle.vehicleNumber
      }));
    }
    
    // Encrypt insurance information
    if (this.isModified('insurance')) {
      if (this.insurance.provider && typeof this.insurance.provider === 'string') {
        this.insurance.provider = encryptSensitiveData(this.insurance.provider);
      }
      if (this.insurance.policyNumber && typeof this.insurance.policyNumber === 'string') {
        this.insurance.policyNumber = encryptSensitiveData(this.insurance.policyNumber);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for activity tracking
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified()) {
    this.lastActiveAt = new Date();
  }
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to get decrypted data
userSchema.methods.getDecryptedData = function() {
  const decryptedUser = this.toObject();
  
  // Decrypt sensitive fields
  if (this.fullName) {
    decryptedUser.fullName = decryptSensitiveData(this.fullName);
  }
  
  if (this.phone) {
    decryptedUser.phone = decryptSensitiveData(this.phone);
  }
  
  if (this.address && this.address.street) {
    decryptedUser.address.street = decryptSensitiveData(this.address.street);
  }
  
  // Decrypt medical conditions
  if (this.medicalConditions && this.medicalConditions.length > 0) {
    decryptedUser.medicalConditions = this.medicalConditions.map(condition => 
      decryptSensitiveData(condition)
    );
  }
  
  // Decrypt allergies
  if (this.allergies && this.allergies.length > 0) {
    decryptedUser.allergies = this.allergies.map(allergy => 
      decryptSensitiveData(allergy)
    );
  }
  
  // Decrypt emergency contacts
  if (this.emergencyContacts && this.emergencyContacts.length > 0) {
    decryptedUser.emergencyContacts = this.emergencyContacts.map(contact => ({
      ...contact.toObject(),
      name: decryptSensitiveData(contact.name),
      phone: decryptSensitiveData(contact.phone)
    }));
  }
  
  // Decrypt vehicles
  if (this.vehicles && this.vehicles.length > 0) {
    decryptedUser.vehicles = this.vehicles.map(vehicle => ({
      ...vehicle.toObject(),
      vehicleNumber: decryptSensitiveData(vehicle.vehicleNumber)
    }));
  }
  
  // Decrypt insurance
  if (this.insurance) {
    decryptedUser.insurance = {
      ...this.insurance.toObject(),
      provider: this.insurance.provider ? decryptSensitiveData(this.insurance.provider) : null,
      policyNumber: this.insurance.policyNumber ? decryptSensitiveData(this.insurance.policyNumber) : null
    };
  }
  
  return decryptedUser;
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  this.lastActiveAt = new Date();
  return await this.save();
};

// Instance method to ban user
userSchema.methods.banUser = async function(reason, bannedBy) {
  this.isBanned = true;
  this.banReason = reason;
  this.bannedAt = new Date();
  this.bannedBy = bannedBy;
  this.isActive = false;
  return await this.save();
};

// Instance method to unban user
userSchema.methods.unbanUser = async function() {
  this.isBanned = false;
  this.banReason = undefined;
  this.bannedAt = undefined;
  this.bannedBy = undefined;
  this.isActive = true;
  return await this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users by role
userSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, isActive: true, isBanned: false });
};

// Static method to find by department
userSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true, isBanned: false });
};

// Static method to find by jurisdiction
userSchema.statics.findByJurisdiction = function(jurisdiction) {
  return this.find({ jurisdiction, isActive: true, isBanned: false });
};

// Static method for user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        banned: { $sum: { $cond: ['$isBanned', 1, 0] } }
      }
    }
  ]);
  
  return stats;
};

// Create and export the model
const User = mongoose.model('User', userSchema);

module.exports = User;
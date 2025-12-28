/**
 * User Test Factory
 * 
 * Factory functions for creating test user data
 */

const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const User = require('../../src/models/User');

/**
 * Generate a valid user object for testing
 */
const createUserData = (overrides = {}) => {
  const userData = {
    email: faker.internet.email().toLowerCase(),
    password: 'TestPassword123!',
    fullName: faker.person.fullName(),
    phone: faker.phone.number('+1##########'),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: 'USA'
    },
    emergencyContact: {
      name: faker.person.fullName(),
      relationship: faker.helpers.arrayElement(['spouse', 'parent', 'sibling', 'friend', 'other']),
      phone: faker.phone.number('+1##########')
    },
    medicalInfo: {
      bloodType: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      allergies: faker.helpers.arrayElements(['peanuts', 'shellfish', 'dairy', 'none'], { min: 0, max: 2 }),
      medications: faker.helpers.arrayElements(['aspirin', 'insulin', 'none'], { min: 0, max: 1 }),
      conditions: faker.helpers.arrayElements(['diabetes', 'hypertension', 'asthma', 'none'], { min: 0, max: 1 })
    },
    role: faker.helpers.arrayElement(['user', 'hospital', 'admin']),
    ...overrides
  };

  return userData;
};

/**
 * Create a user with hashed password
 */
const createUserWithHashedPassword = async (overrides = {}) => {
  const userData = createUserData(overrides);
  userData.password = await bcrypt.hash(userData.password, 12);
  return userData;
};

/**
 * Create and save a test user to database
 */
const createTestUser = async (overrides = {}) => {
  const userData = createUserData(overrides);
  const user = new User(userData);
  return await user.save();
};

/**
 * Create multiple users
 */
const createMultipleUsers = (count = 3, overrides = {}) => {
  return Array.from({ length: count }, () => createUserData(overrides));
};

/**
 * Create a hospital user
 */
const createHospitalUser = (overrides = {}) => {
  return createUserData({
    role: 'hospital',
    ...overrides
  });
};

/**
 * Create an admin user
 */
const createAdminUser = (overrides = {}) => {
  return createUserData({
    role: 'admin',
    ...overrides
  });
};

/**
 * Create invalid user data for testing validation
 */
const createInvalidUserData = (invalidField) => {
  const baseData = createUserData();
  
  switch (invalidField) {
    case 'email':
      baseData.email = 'invalid-email';
      break;
    case 'password':
      baseData.password = '123'; // Too short
      break;
    case 'phone':
      baseData.phone = 'invalid-phone';
      break;
    case 'bloodType':
      baseData.medicalInfo.bloodType = 'Z+'; // Invalid blood type
      break;
    default:
      delete baseData[invalidField];
  }
  
  return baseData;
};

module.exports = {
  createUserData,
  createUserWithHashedPassword,
  createTestUser,
  createMultipleUsers,
  createHospitalUser,
  createAdminUser,
  createInvalidUserData
};
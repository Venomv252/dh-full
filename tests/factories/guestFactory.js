/**
 * Guest Test Factory
 * 
 * Factory functions for creating test guest data
 */

const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
const Guest = require('../../src/models/Guest');

/**
 * Generate a valid guest object for testing
 */
const createGuestData = (overrides = {}) => {
  const guestData = {
    guestId: uuidv4(),
    actionCount: faker.number.int({ min: 0, max: 10 }),
    lastActiveAt: faker.date.recent(),
    createdAt: faker.date.recent(),
    ...overrides
  };

  return guestData;
};

/**
 * Create and save a test guest to database
 */
const createTestGuest = async (overrides = {}) => {
  const guest = new Guest(overrides);
  return await guest.save();
};

/**
 * Create a guest with specific action count
 */
const createGuestWithActionCount = (actionCount, overrides = {}) => {
  return createGuestData({
    actionCount,
    ...overrides
  });
};

/**
 * Create a guest at action limit
 */
const createGuestAtLimit = (overrides = {}) => {
  return createGuestData({
    actionCount: 10, // At the limit
    ...overrides
  });
};

/**
 * Create a guest over action limit
 */
const createGuestOverLimit = (overrides = {}) => {
  return createGuestData({
    actionCount: 15, // Over the limit
    ...overrides
  });
};

/**
 * Create multiple guests
 */
const createMultipleGuests = (count = 3, overrides = {}) => {
  return Array.from({ length: count }, () => createGuestData(overrides));
};

/**
 * Create a fresh guest (no actions)
 */
const createFreshGuest = (overrides = {}) => {
  return createGuestData({
    actionCount: 0,
    lastActiveAt: new Date(),
    ...overrides
  });
};

/**
 * Create an inactive guest (old lastActiveAt)
 */
const createInactiveGuest = (overrides = {}) => {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  return createGuestData({
    lastActiveAt: twoDaysAgo,
    ...overrides
  });
};

module.exports = {
  createGuestData,
  createTestGuest,
  createGuestWithActionCount,
  createGuestAtLimit,
  createGuestOverLimit,
  createMultipleGuests,
  createFreshGuest,
  createInactiveGuest
};
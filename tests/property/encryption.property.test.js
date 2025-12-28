/**
 * Property-Based Tests for Data Encryption Consistency
 * 
 * Tests the encryption and decryption functionality for sensitive user data
 * Property 17: Data encryption consistency
 */

const fc = require('fast-check');
const { 
  encryptSensitiveData, 
  decryptSensitiveData, 
  encryptArray, 
  decryptArray,
  encryptObjectFields,
  decryptObjectFields,
  isEncrypted,
  safeEncrypt,
  safeDecrypt,
  hashForSearch,
  validateEncryptionKey,
  generateEncryptionKey
} = require('../../src/utils/encryption');

// Mock environment variable for testing
const originalEnv = process.env.ENCRYPTION_KEY;

describe('Property Test: Data Encryption Consistency', () => {

  beforeAll(() => {
    // Set a valid test encryption key
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
  });

  afterAll(() => {
    // Restore original environment
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  test('Property 17: Data encryption consistency - Round trip encryption', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 1000 }),
      (originalText) => {
        // Test basic encryption and decryption round-trip
        const encrypted = encryptSensitiveData(originalText);
        
        // Verify encrypted data structure
        expect(encrypted).toBeDefined();
        expect(encrypted).toHaveProperty('encrypted');
        expect(encrypted).toHaveProperty('iv');
        expect(encrypted).toHaveProperty('authTag');
        expect(encrypted).toHaveProperty('algorithm');
        expect(encrypted.algorithm).toBe('aes-256-gcm');
        
        // Verify encrypted data is different from original
        expect(encrypted.encrypted).not.toBe(originalText);
        expect(encrypted.encrypted).toMatch(/^[a-f0-9]+$/); // Hex string
        expect(encrypted.iv).toMatch(/^[a-f0-9]+$/); // Hex string
        expect(encrypted.authTag).toMatch(/^[a-f0-9]+$/); // Hex string
        
        // Test decryption
        const decrypted = decryptSensitiveData(encrypted);
        expect(decrypted).toBe(originalText);
        
        // Test isEncrypted function
        expect(isEncrypted(encrypted)).toBe(true);
        expect(isEncrypted(originalText)).toBe(false);
        expect(isEncrypted(null)).toBe(false);
        expect(isEncrypted(undefined)).toBe(false);
        expect(isEncrypted({})).toBe(false);
      }
    ), { numRuns: 20 });
  });

  test('Property 17a: Encryption uniqueness and randomness', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (text) => {
        // Same text should produce different encrypted results due to random IV
        const encrypted1 = encryptSensitiveData(text);
        const encrypted2 = encryptSensitiveData(text);
        
        // Different IVs should produce different encrypted data
        expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
        expect(encrypted1.iv).not.toBe(encrypted2.iv);
        expect(encrypted1.authTag).not.toBe(encrypted2.authTag);
        
        // But both should decrypt to the same original text
        expect(decryptSensitiveData(encrypted1)).toBe(text);
        expect(decryptSensitiveData(encrypted2)).toBe(text);
        
        // IVs should be different lengths (32 hex chars = 16 bytes)
        expect(encrypted1.iv).toHaveLength(32);
        expect(encrypted2.iv).toHaveLength(32);
        
        // Auth tags should be same length (32 hex chars = 16 bytes)
        expect(encrypted1.authTag).toHaveLength(32);
        expect(encrypted2.authTag).toHaveLength(32);
      }
    ), { numRuns: 15 });
  });

  test('Property 17b: Null and undefined handling', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.option(fc.string()),
      (maybeString) => {
        // Test encryption handles null/undefined gracefully
        const encrypted = encryptSensitiveData(maybeString);
        
        if (maybeString === null || maybeString === undefined || maybeString === '') {
          expect(encrypted).toBeNull();
        } else {
          expect(encrypted).toBeDefined();
          expect(encrypted.encrypted).toBeDefined();
          
          const decrypted = decryptSensitiveData(encrypted);
          expect(decrypted).toBe(maybeString);
        }
        
        // Test decryption with invalid data returns null (no throwing)
        expect(decryptSensitiveData(null)).toBeNull();
        expect(decryptSensitiveData(undefined)).toBeNull();
        expect(decryptSensitiveData('invalid')).toBeNull();
        expect(decryptSensitiveData({})).toBeNull();
        expect(decryptSensitiveData({ encrypted: 'test' })).toBeNull(); // Missing fields
      }
    ), { numRuns: 15 });
  });

  test('Property 17c: Array encryption consistency', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 10 }),
      (stringArray) => {
        // Test array encryption and decryption
        const encryptedArray = encryptArray(stringArray);
        
        expect(Array.isArray(encryptedArray)).toBe(true);
        expect(encryptedArray).toHaveLength(stringArray.length);
        
        // Each item should be encrypted
        encryptedArray.forEach((item, index) => {
          if (stringArray[index]) {
            expect(isEncrypted(item)).toBe(true);
          }
        });
        
        // Test decryption
        const decryptedArray = decryptArray(encryptedArray);
        expect(decryptedArray).toEqual(stringArray);
        
        // Test with mixed array (some encrypted, some not)
        const mixedArray = [...encryptedArray, 'plaintext', null, undefined];
        const decryptedMixed = decryptArray(mixedArray);
        expect(decryptedMixed.slice(0, stringArray.length)).toEqual(stringArray);
        expect(decryptedMixed[stringArray.length]).toBe('plaintext');
        expect(decryptedMixed[stringArray.length + 1]).toBeNull();
        expect(decryptedMixed[stringArray.length + 2]).toBeUndefined();
      }
    ), { numRuns: 10 });
  });

  test('Property 17d: Object field encryption consistency', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.emailAddress(),
        phone: fc.string({ minLength: 10, maxLength: 15 }),
        address: fc.string({ minLength: 5, maxLength: 100 }),
        publicInfo: fc.string({ minLength: 1, maxLength: 50 })
      }),
      (userData) => {
        const fieldsToEncrypt = ['name', 'phone', 'address'];
        
        // Test object field encryption
        const encryptedObj = encryptObjectFields(userData, fieldsToEncrypt);
        
        // Encrypted fields should be encrypted
        fieldsToEncrypt.forEach(field => {
          expect(isEncrypted(encryptedObj[field])).toBe(true);
        });
        
        // Non-encrypted fields should remain unchanged
        expect(encryptedObj.email).toBe(userData.email);
        expect(encryptedObj.publicInfo).toBe(userData.publicInfo);
        
        // Test decryption
        const decryptedObj = decryptObjectFields(encryptedObj, fieldsToEncrypt);
        
        // All fields should match original
        expect(decryptedObj.name).toBe(userData.name);
        expect(decryptedObj.phone).toBe(userData.phone);
        expect(decryptedObj.address).toBe(userData.address);
        expect(decryptedObj.email).toBe(userData.email);
        expect(decryptedObj.publicInfo).toBe(userData.publicInfo);
      }
    ), { numRuns: 10 });
  });

  test('Property 17e: Safe encryption/decryption functions', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.oneof(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(''),
        fc.integer(),
        fc.boolean(),
        fc.object()
      ),
      (data) => {
        // Test safe encryption (should never throw)
        const encrypted = safeEncrypt(data);
        
        if (typeof data === 'string' && data.length > 0) {
          // Valid string should be encrypted
          expect(isEncrypted(encrypted)).toBe(true);
          
          // Safe decryption should work
          const decrypted = safeDecrypt(encrypted);
          expect(decrypted).toBe(data);
        } else {
          // Invalid data should be returned as-is
          expect(encrypted).toBe(data);
        }
        
        // Safe decryption should never throw
        const safeDecrypted = safeDecrypt(data);
        if (isEncrypted(data)) {
          expect(typeof safeDecrypted).toBe('string');
        } else {
          expect(safeDecrypted).toBe(data);
        }
      }
    ), { numRuns: 15 });
  });

  test('Property 17f: Search hash consistency', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (text) => {
        // Test search hash generation
        const hash1 = hashForSearch(text);
        const hash2 = hashForSearch(text);
        
        // Same input should produce same hash
        expect(hash1).toBe(hash2);
        expect(typeof hash1).toBe('string');
        expect(hash1).toMatch(/^[a-f0-9]+$/); // Hex string
        expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
        
        // Different inputs should produce different hashes (with high probability)
        const differentText = text + 'x';
        const differentHash = hashForSearch(differentText);
        expect(differentHash).not.toBe(hash1);
        
        // Case insensitive and trimmed
        const upperCaseHash = hashForSearch(text.toUpperCase());
        const trimmedHash = hashForSearch(`  ${text}  `);
        expect(upperCaseHash).toBe(hash1);
        expect(trimmedHash).toBe(hash1);
        
        // Null/undefined should return null
        expect(hashForSearch(null)).toBeNull();
        expect(hashForSearch(undefined)).toBeNull();
        expect(hashForSearch('')).toBeNull();
      }
    ), { numRuns: 15 });
  });

  test('Property 17g: Encryption key validation', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.oneof(
        fc.string({ minLength: 64, maxLength: 64 }).filter(s => /^[a-f0-9]+$/.test(s)), // Valid hex
        fc.string({ minLength: 1, maxLength: 100 }), // Invalid strings
        fc.constant(null),
        fc.constant(undefined),
        fc.string({ minLength: 1, maxLength: 63 }), // Too short
        fc.string({ minLength: 65, maxLength: 100 }) // Too long
      ),
      (keyCandidate) => {
        const isValid = validateEncryptionKey(keyCandidate);
        
        if (typeof keyCandidate === 'string' && 
            keyCandidate.length === 64 && 
            /^[a-f0-9]+$/.test(keyCandidate)) {
          // Valid 64-character hex string
          expect(isValid).toBe(true);
        } else {
          // Invalid key
          expect(isValid).toBe(false);
        }
        
        // Test generated keys are always valid
        const generatedKey = generateEncryptionKey();
        expect(validateEncryptionKey(generatedKey)).toBe(true);
        expect(generatedKey).toHaveLength(64);
        expect(generatedKey).toMatch(/^[a-f0-9]+$/);
      }
    ), { numRuns: 15 });
  });

});

describe('Encryption Edge Cases and Security', () => {

  beforeAll(() => {
    // Set a valid test encryption key
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
  });

  afterAll(() => {
    // Restore original environment
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  test('Property: Encryption with special characters and unicode', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.string({ minLength: 1, maxLength: 100 }), // Regular strings
        fc.fullUnicodeString({ minLength: 1, maxLength: 100 }), // Unicode strings
        fc.constantFrom('🔒🔑', '测试', 'Ñoño', '🚨🚑🏥', 'αβγδε') // Special cases
      ),
      (text) => {
        // Test encryption with various character sets
        const encrypted = encryptSensitiveData(text);
        expect(isEncrypted(encrypted)).toBe(true);
        
        const decrypted = decryptSensitiveData(encrypted);
        expect(decrypted).toBe(text);
        
        // Verify UTF-8 encoding is preserved
        expect(Buffer.from(decrypted, 'utf8').toString('utf8')).toBe(text);
      }
    ), { numRuns: 15 });
  });

  test('Property: Data tampering detection', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (originalText) => {
        const encrypted = encryptSensitiveData(originalText);
        
        // Test tampering with encrypted data
        const tamperedEncrypted = { ...encrypted };
        
        // Tamper with encrypted content
        tamperedEncrypted.encrypted = encrypted.encrypted.slice(0, -2) + 'ff';
        expect(decryptSensitiveData(tamperedEncrypted)).toBeNull();
        
        // Tamper with IV
        const tamperedIv = { ...encrypted };
        tamperedIv.iv = encrypted.iv.slice(0, -2) + 'ff';
        expect(decryptSensitiveData(tamperedIv)).toBeNull();
        
        // Tamper with auth tag
        const tamperedTag = { ...encrypted };
        tamperedTag.authTag = encrypted.authTag.slice(0, -2) + 'ff';
        expect(decryptSensitiveData(tamperedTag)).toBeNull();
        
        // Original should still work
        expect(decryptSensitiveData(encrypted)).toBe(originalText);
      }
    ), { numRuns: 10 });
  });

});
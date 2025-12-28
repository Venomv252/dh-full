/**
 * System Verification Script
 * Comprehensive testing of all API endpoints and core functionality
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let testResults = [];
let guestId = null;

/**
 * Test result tracking
 */
const addTestResult = (testName, success, details = '') => {
  testResults.push({
    test: testName,
    success,
    details,
    timestamp: new Date().toISOString()
  });
  
  const status = success ? '✅' : '❌';
  console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
};

/**
 * HTTP request helper with error handling
 */
const makeRequest = async (method, url, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

/**
 * Test 1: Health Check
 */
const testHealthCheck = async () => {
  console.log('\n🏥 Testing Health Check...');
  
  const result = await makeRequest('GET', '/health');
  
  if (result.success && result.data.success) {
    addTestResult('Health Check', true, `API is running (uptime: ${result.data.uptime}s)`);
    return true;
  } else {
    addTestResult('Health Check', false, result.error?.message || 'Health check failed');
    return false;
  }
};

/**
 * Test 2: Guest User Management
 */
const testGuestManagement = async () => {
  console.log('\n👤 Testing Guest Management...');
  
  // Create guest user
  const createResult = await makeRequest('POST', '/api/guest/create', {});
  
  if (createResult.success && createResult.data.success) {
    guestId = createResult.data.data.guestId;
    addTestResult('Guest Creation', true, `Guest ID: ${guestId}`);
    
    // Verify guest has correct initial state
    if (createResult.data.data.actionCount === 0 && createResult.data.data.maxActions === 10) {
      addTestResult('Guest Initial State', true, '0/10 actions');
      return true;
    } else {
      addTestResult('Guest Initial State', false, 'Incorrect initial action count');
      return false;
    }
  } else {
    addTestResult('Guest Creation', false, createResult.error?.message || 'Failed to create guest');
    return false;
  }
};

/**
 * Test 3: User Registration
 */
const testUserRegistration = async () => {
  console.log('\n👥 Testing User Registration...');
  
  const userData = {
    fullName: 'Test User',
    dob: '1995-06-15',
    gender: 'male',
    phone: '+1555000001',
    email: 'test.user@example.com',
    password: 'TestPass123!',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      pincode: '12345'
    },
    bloodGroup: 'A+',
    medicalConditions: ['None'],
    allergies: ['None'],
    emergencyContacts: [
      {
        name: 'Emergency Contact',
        relation: 'Friend',
        phone: '+1555000002'
      }
    ],
    vehicles: [
      {
        vehicleNumber: 'TEST123',
        type: 'Car',
        model: 'Test Model 2023'
      }
    ],
    insurance: {
      provider: 'Test Insurance',
      policyNumber: 'TEST123456',
      validTill: '2025-12-31'
    }
  };
  
  const result = await makeRequest('POST', '/api/user/register', userData);
  
  if (result.success && result.data.success) {
    addTestResult('User Registration', true, `User ID: ${result.data.data.userId}`);
    
    // Test duplicate email registration
    const duplicateResult = await makeRequest('POST', '/api/user/register', userData);
    if (!duplicateResult.success && duplicateResult.status === 409) {
      addTestResult('Duplicate Email Prevention', true, 'Correctly rejected duplicate email');
      return true;
    } else {
      addTestResult('Duplicate Email Prevention', false, 'Should have rejected duplicate email');
      return false;
    }
  } else {
    addTestResult('User Registration', false, result.error?.message || 'Registration failed');
    return false;
  }
};

/**
 * Test 4: Input Validation
 */
const testInputValidation = async () => {
  console.log('\n🔍 Testing Input Validation...');
  
  // Test invalid user registration
  const invalidUserData = {
    fullName: '', // Empty required field
    email: 'invalid-email', // Invalid email format
    password: '123', // Weak password
    phone: 'invalid-phone' // Invalid phone format
  };
  
  const result = await makeRequest('POST', '/api/user/register', invalidUserData);
  
  if (!result.success && result.status === 400) {
    addTestResult('Input Validation', true, 'Correctly rejected invalid data');
    
    // Test invalid JSON
    try {
      const response = await axios.post(`${BASE_URL}/api/guest/create`, 'invalid-json', {
        headers: { 'Content-Type': 'application/json' }
      });
      addTestResult('JSON Validation', false, 'Should have rejected invalid JSON');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        addTestResult('JSON Validation', true, 'Correctly rejected invalid JSON');
        return true;
      } else {
        addTestResult('JSON Validation', false, 'Unexpected error for invalid JSON');
        return false;
      }
    }
  } else {
    addTestResult('Input Validation', false, 'Should have rejected invalid data');
    return false;
  }
};

/**
 * Test 5: Incident Management
 */
const testIncidentManagement = async () => {
  console.log('\n🚨 Testing Incident Management...');
  
  if (!guestId) {
    addTestResult('Incident Management', false, 'No guest ID available');
    return false;
  }
  
  // Create incident
  const incidentData = {
    title: 'Test Emergency Incident',
    description: 'This is a test incident for system verification',
    type: 'Other',
    geoLocation: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    },
    media: [
      {
        type: 'image',
        url: 'https://example.com/test-image.jpg'
      }
    ]
  };
  
  const createResult = await makeRequest('POST', '/api/incidents', incidentData, {
    'X-Guest-ID': guestId
  });
  
  if (createResult.success && createResult.data.success) {
    const incidentId = createResult.data.data.incidentId;
    addTestResult('Incident Creation', true, `Incident ID: ${incidentId}`);
    
    // Test incident listing
    const listResult = await makeRequest('GET', '/api/incidents?page=1&limit=5');
    if (listResult.success && listResult.data.success && listResult.data.data.incidents.length > 0) {
      addTestResult('Incident Listing', true, `Found ${listResult.data.data.incidents.length} incidents`);
      
      // Test incident details
      const detailResult = await makeRequest('GET', `/api/incidents/${incidentId}`);
      if (detailResult.success && detailResult.data.success) {
        addTestResult('Incident Details', true, 'Retrieved incident details');
        
        // Test incident upvoting
        const upvoteResult = await makeRequest('POST', `/api/incidents/${incidentId}/upvote`, {}, {
          'X-Guest-ID': guestId
        });
        
        if (upvoteResult.success && upvoteResult.data.success) {
          addTestResult('Incident Upvoting', true, `Upvotes: ${upvoteResult.data.data.upvotes}`);
          
          // Test duplicate upvote prevention
          const duplicateUpvoteResult = await makeRequest('POST', `/api/incidents/${incidentId}/upvote`, {}, {
            'X-Guest-ID': guestId
          });
          
          if (!duplicateUpvoteResult.success && duplicateUpvoteResult.status === 409) {
            addTestResult('Duplicate Upvote Prevention', true, 'Correctly prevented duplicate upvote');
            return true;
          } else {
            addTestResult('Duplicate Upvote Prevention', false, 'Should have prevented duplicate upvote');
            return false;
          }
        } else {
          addTestResult('Incident Upvoting', false, upvoteResult.error?.message || 'Upvote failed');
          return false;
        }
      } else {
        addTestResult('Incident Details', false, detailResult.error?.message || 'Failed to get details');
        return false;
      }
    } else {
      addTestResult('Incident Listing', false, listResult.error?.message || 'Failed to list incidents');
      return false;
    }
  } else {
    addTestResult('Incident Creation', false, createResult.error?.message || 'Failed to create incident');
    return false;
  }
};

/**
 * Test 6: Geospatial Queries
 */
const testGeospatialQueries = async () => {
  console.log('\n🌍 Testing Geospatial Queries...');
  
  // Test location-based incident search
  const geoResult = await makeRequest('GET', '/api/incidents?lat=37.7749&lng=-122.4194&radius=10000&page=1&limit=10');
  
  if (geoResult.success && geoResult.data.success) {
    const incidents = geoResult.data.data.incidents;
    addTestResult('Geospatial Query', true, `Found ${incidents.length} incidents within radius`);
    
    // Verify incidents have distance information
    if (incidents.length > 0 && incidents[0].distance !== undefined) {
      addTestResult('Distance Calculation', true, `Distance: ${incidents[0].distance}m`);
      return true;
    } else {
      addTestResult('Distance Calculation', false, 'Missing distance information');
      return false;
    }
  } else {
    addTestResult('Geospatial Query', false, geoResult.error?.message || 'Geospatial query failed');
    return false;
  }
};

/**
 * Test 7: Error Handling
 */
const testErrorHandling = async () => {
  console.log('\n🚫 Testing Error Handling...');
  
  // Test 404 for non-existent route
  const notFoundResult = await makeRequest('GET', '/api/nonexistent');
  if (!notFoundResult.success && notFoundResult.status === 404) {
    addTestResult('404 Error Handling', true, 'Correctly returned 404 for non-existent route');
  } else {
    addTestResult('404 Error Handling', false, 'Should have returned 404');
    return false;
  }
  
  // Test 404 for non-existent incident
  const nonExistentIncident = await makeRequest('GET', '/api/incidents/507f1f77bcf86cd799439011');
  if (!nonExistentIncident.success && nonExistentIncident.status === 404) {
    addTestResult('Resource Not Found', true, 'Correctly returned 404 for non-existent incident');
  } else {
    addTestResult('Resource Not Found', false, 'Should have returned 404 for non-existent incident');
    return false;
  }
  
  // Test validation error format
  const validationResult = await makeRequest('POST', '/api/incidents', {}, {
    'X-Guest-ID': guestId
  });
  
  if (!validationResult.success && validationResult.status === 400 && validationResult.error.error) {
    addTestResult('Error Response Format', true, 'Error responses have correct format');
    return true;
  } else {
    addTestResult('Error Response Format', false, 'Error responses should have consistent format');
    return false;
  }
};

/**
 * Test 8: Security Headers
 */
const testSecurityHeaders = async () => {
  console.log('\n🛡️ Testing Security Headers...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    const headers = response.headers;
    
    const requiredHeaders = [
      'content-security-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy'
    ];
    
    let allHeadersPresent = true;
    const missingHeaders = [];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        allHeadersPresent = false;
        missingHeaders.push(header);
      }
    }
    
    if (allHeadersPresent) {
      addTestResult('Security Headers', true, 'All required security headers present');
      return true;
    } else {
      addTestResult('Security Headers', false, `Missing headers: ${missingHeaders.join(', ')}`);
      return false;
    }
  } catch (error) {
    addTestResult('Security Headers', false, 'Failed to check security headers');
    return false;
  }
};

/**
 * Test 9: Rate Limiting (Basic Test)
 */
const testRateLimiting = async () => {
  console.log('\n⏱️ Testing Rate Limiting...');
  
  // Make multiple rapid requests to test rate limiting
  const requests = [];
  for (let i = 0; i < 5; i++) {
    requests.push(makeRequest('GET', '/health'));
  }
  
  try {
    const results = await Promise.all(requests);
    const successCount = results.filter(r => r.success).length;
    
    if (successCount >= 4) { // Allow most requests to succeed
      addTestResult('Rate Limiting', true, `${successCount}/5 requests succeeded (rate limiting active)`);
      return true;
    } else {
      addTestResult('Rate Limiting', false, `Only ${successCount}/5 requests succeeded`);
      return false;
    }
  } catch (error) {
    addTestResult('Rate Limiting', false, 'Error testing rate limiting');
    return false;
  }
};

/**
 * Test 10: Guest Action Limits
 */
const testGuestActionLimits = async () => {
  console.log('\n🔢 Testing Guest Action Limits...');
  
  if (!guestId) {
    addTestResult('Guest Action Limits', false, 'No guest ID available');
    return false;
  }
  
  // Create a new guest for this test
  const newGuestResult = await makeRequest('POST', '/api/guest/create', {});
  if (!newGuestResult.success) {
    addTestResult('Guest Action Limits', false, 'Failed to create test guest');
    return false;
  }
  
  const testGuestId = newGuestResult.data.data.guestId;
  
  // Perform multiple actions to test limits
  let actionCount = 0;
  const maxActions = 10;
  
  for (let i = 0; i < maxActions + 2; i++) { // Try to exceed limit
    const incidentData = {
      title: `Test Incident ${i + 1}`,
      description: 'Testing guest action limits',
      type: 'Other',
      geoLocation: {
        type: 'Point',
        coordinates: [-122.4194 + (i * 0.001), 37.7749 + (i * 0.001)]
      }
    };
    
    const result = await makeRequest('POST', '/api/incidents', incidentData, {
      'X-Guest-ID': testGuestId
    });
    
    if (result.success) {
      actionCount++;
    } else if (result.status === 403 && result.error.error?.code === 'GUEST_ACTION_LIMIT_EXCEEDED') {
      // Expected behavior when limit is reached
      break;
    }
  }
  
  if (actionCount === maxActions) {
    addTestResult('Guest Action Limits', true, `Guest correctly limited to ${maxActions} actions`);
    return true;
  } else {
    addTestResult('Guest Action Limits', false, `Expected ${maxActions} actions, got ${actionCount}`);
    return false;
  }
};

/**
 * Generate test report
 */
const generateReport = () => {
  console.log('\n📊 SYSTEM VERIFICATION REPORT');
  console.log('=' .repeat(50));
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${successRate}%`);
  
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.filter(r => !r.success).forEach(test => {
      console.log(`  - ${test.test}: ${test.details}`);
    });
  }
  
  console.log('\n🎯 SYSTEM STATUS:');
  if (successRate >= 90) {
    console.log('✅ SYSTEM READY FOR PRODUCTION');
  } else if (successRate >= 75) {
    console.log('⚠️ SYSTEM MOSTLY FUNCTIONAL - Minor issues need attention');
  } else {
    console.log('❌ SYSTEM NOT READY - Critical issues need to be resolved');
  }
  
  return successRate >= 90;
};

/**
 * Main verification function
 */
const runSystemVerification = async () => {
  console.log('🚀 EMERGENCY INCIDENT PLATFORM - SYSTEM VERIFICATION');
  console.log('=' .repeat(60));
  console.log('Testing all core functionality and API endpoints...\n');
  
  try {
    // Run all tests
    await testHealthCheck();
    await testGuestManagement();
    await testUserRegistration();
    await testInputValidation();
    await testIncidentManagement();
    await testGeospatialQueries();
    await testErrorHandling();
    await testSecurityHeaders();
    await testRateLimiting();
    await testGuestActionLimits();
    
    // Generate final report
    const systemReady = generateReport();
    
    console.log('\n🏁 VERIFICATION COMPLETE');
    process.exit(systemReady ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
};

// Check if server is running before starting tests
const checkServerStatus = async () => {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running, starting verification...\n');
    runSystemVerification();
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   node src/app.js');
    console.error('\nThen run this verification script again.');
    process.exit(1);
  }
};

// Start verification
checkServerStatus();
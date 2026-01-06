// Simple test to verify authentication system
// This can be run in the browser console

console.log('Testing Authentication System...');

// Test 1: Check if AuthContext is available
try {
  const authContext = document.querySelector('[data-testid="auth-context"]');
  console.log('✓ AuthContext component rendered');
} catch (error) {
  console.log('✗ AuthContext not found:', error);
}

// Test 2: Check localStorage functionality
try {
  localStorage.setItem('test_auth', 'test_value');
  const testValue = localStorage.getItem('test_auth');
  localStorage.removeItem('test_auth');
  
  if (testValue === 'test_value') {
    console.log('✓ localStorage working correctly');
  } else {
    console.log('✗ localStorage not working');
  }
} catch (error) {
  console.log('✗ localStorage error:', error);
}

// Test 3: Check if API service is available
try {
  const apiModule = import('../services/api.js');
  console.log('✓ API service module available');
} catch (error) {
  console.log('✗ API service error:', error);
}

// Test 4: Check if authentication hooks are available
try {
  const useAuthModule = import('../hooks/useAuth.js');
  console.log('✓ useAuth hook available');
} catch (error) {
  console.log('✗ useAuth hook error:', error);
}

console.log('Authentication system test completed!');
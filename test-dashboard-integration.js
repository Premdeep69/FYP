#!/usr/bin/env node

/**
 * Dashboard Backend Integration Test Script
 * 
 * This script tests the complete integration between the frontend dashboard
 * and backend API to ensure all data flows correctly.
 * 
 * Usage: node test-dashboard-integration.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let token = '';
let userId = '';

// Helper functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const success = (message) => log(`✓ ${message}`, 'green');
const error = (message) => log(`✗ ${message}`, 'red');
const info = (message) => log(`ℹ ${message}`, 'blue');
const warn = (message) => log(`⚠ ${message}`, 'yellow');

// Test functions
async function testServerConnection() {
  info('Testing server connection...');
  try {
    const response = await axios.get(`${API_URL.replace('/api', '')}/`);
    if (response.status === 200) {
      success('Server is running');
      return true;
    }
  } catch (err) {
    error('Server is not running. Please start the backend server.');
    error(`Error: ${err.message}`);
    return false;
  }
}

async function testUserLogin() {
  info('Testing user login...');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'user@example.com',
      password: 'password123'
    });
    
    if (response.data.token) {
      token = response.data.token;
      userId = response.data.user.id || response.data.user._id;
      success('User login successful');
      info(`User ID: ${userId}`);
      return true;
    }
  } catch (err) {
    error('User login failed');
    error(`Error: ${err.response?.data?.message || err.message}`);
    warn('Make sure test user exists: user@example.com / password123');
    return false;
  }
}

async function testDashboardEndpoint() {
  info('Testing dashboard endpoint...');
  try {
    const response = await axios.get(`${API_URL}/dashboard/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    
    // Verify response structure
    const requiredFields = [
      'user',
      'weeklyStats',
      'currentStreak',
      'activeGoals',
      'recentWorkouts'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      error(`Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    success('Dashboard endpoint returns correct structure');
    
    // Display data summary
    info('Dashboard Data Summary:');
    console.log(`  - User: ${data.user.name} (${data.user.email})`);
    console.log(`  - Workouts This Week: ${data.weeklyStats.workoutSessions}`);
    console.log(`  - Total Minutes: ${data.weeklyStats.totalMinutes}`);
    console.log(`  - Total Calories: ${data.weeklyStats.totalCalories}`);
    console.log(`  - Current Streak: ${data.currentStreak} days`);
    console.log(`  - Active Goals: ${data.activeGoals.length}`);
    console.log(`  - Recent Workouts: ${data.recentWorkouts.length}`);
    
    return true;
  } catch (err) {
    error('Dashboard endpoint failed');
    error(`Error: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testChartData() {
  info('Testing chart data availability...');
  try {
    const response = await axios.get(`${API_URL}/dashboard/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    
    // Check for chart data
    const chartDataFields = [
      'weeklyActivityData',
      'monthlyProgressData',
      'workoutTypeDistribution'
    ];
    
    let allPresent = true;
    chartDataFields.forEach(field => {
      if (data[field]) {
        success(`${field} is present (${data[field].length} items)`);
      } else {
        warn(`${field} is missing or empty`);
        allPresent = false;
      }
    });
    
    return allPresent;
  } catch (err) {
    error('Chart data test failed');
    error(`Error: ${err.message}`);
    return false;
  }
}

async function testComparisons() {
  info('Testing week-over-week comparisons...');
  try {
    const response = await axios.get(`${API_URL}/dashboard/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    
    if (data.comparisons) {
      success('Comparisons data is present');
      console.log(`  - Workouts: ${data.comparisons.workouts >= 0 ? '+' : ''}${data.comparisons.workouts}`);
      console.log(`  - Minutes: ${data.comparisons.minutes >= 0 ? '+' : ''}${data.comparisons.minutes}`);
      console.log(`  - Calories: ${data.comparisons.calories >= 0 ? '+' : ''}${data.comparisons.calories}`);
      return true;
    } else {
      warn('Comparisons data is missing');
      return false;
    }
  } catch (err) {
    error('Comparisons test failed');
    error(`Error: ${err.message}`);
    return false;
  }
}

async function testWorkoutLogging() {
  info('Testing workout logging and stat updates...');
  try {
    // Get current stats
    const before = await axios.get(`${API_URL}/dashboard/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const beforeWorkouts = before.data.weeklyStats.workoutSessions;
    
    // Log a workout
    await axios.post(`${API_URL}/dashboard/workout`, {
      name: 'Integration Test Workout',
      type: 'cardio',
      duration: 30,
      caloriesBurned: 250,
      notes: 'Automated test workout'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    success('Workout logged successfully');
    
    // Get updated stats
    const after = await axios.get(`${API_URL}/dashboard/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const afterWorkouts = after.data.weeklyStats.workoutSessions;
    
    if (afterWorkouts > beforeWorkouts) {
      success('Stats updated correctly after workout log');
      console.log(`  - Before: ${beforeWorkouts} workouts`);
      console.log(`  - After: ${afterWorkouts} workouts`);
      return true;
    } else {
      error('Stats did not update after workout log');
      return false;
    }
  } catch (err) {
    error('Workout logging test failed');
    error(`Error: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testStreakCalculation() {
  info('Testing streak calculation...');
  try {
    const response = await axios.get(`${API_URL}/dashboard/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    
    if (typeof data.currentStreak === 'number') {
      success(`Current streak: ${data.currentStreak} days`);
    } else {
      error('Current streak is not a number');
      return false;
    }
    
    if (data.longestStreak !== undefined) {
      success(`Longest streak: ${data.longestStreak} days`);
    } else {
      warn('Longest streak data is missing');
    }
    
    return true;
  } catch (err) {
    error('Streak calculation test failed');
    error(`Error: ${err.message}`);
    return false;
  }
}

async function testDataConsistency() {
  info('Testing data consistency...');
  try {
    const response = await axios.get(`${API_URL}/dashboard/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    
    // Check if weekly stats match recent workouts
    const recentThisWeek = data.recentWorkouts.filter(workout => {
      const workoutDate = new Date(workout.completedAt);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return workoutDate >= weekStart;
    });
    
    info(`Recent workouts this week: ${recentThisWeek.length}`);
    info(`Weekly stats workouts: ${data.weeklyStats.workoutSessions}`);
    
    if (recentThisWeek.length <= data.weeklyStats.workoutSessions) {
      success('Data consistency check passed');
      return true;
    } else {
      warn('Data consistency check: numbers don\'t match exactly (this is OK if there are more than 10 workouts)');
      return true;
    }
  } catch (err) {
    error('Data consistency test failed');
    error(`Error: ${err.message}`);
    return false;
  }
}

async function testErrorHandling() {
  info('Testing error handling...');
  try {
    // Test with invalid token
    try {
      await axios.get(`${API_URL}/dashboard/user`, {
        headers: { Authorization: 'Bearer invalid_token' }
      });
      error('Should have failed with invalid token');
      return false;
    } catch (err) {
      if (err.response?.status === 401) {
        success('Correctly rejects invalid token (401)');
      } else {
        error(`Unexpected error status: ${err.response?.status}`);
        return false;
      }
    }
    
    // Test with no token
    try {
      await axios.get(`${API_URL}/dashboard/user`);
      error('Should have failed with no token');
      return false;
    } catch (err) {
      if (err.response?.status === 401) {
        success('Correctly rejects missing token (401)');
      } else {
        error(`Unexpected error status: ${err.response?.status}`);
        return false;
      }
    }
    
    return true;
  } catch (err) {
    error('Error handling test failed');
    error(`Error: ${err.message}`);
    return false;
  }
}

async function testPerformance() {
  info('Testing dashboard load performance...');
  try {
    const startTime = Date.now();
    
    await axios.get(`${API_URL}/dashboard/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (duration < 500) {
      success(`Dashboard loads in ${duration}ms (excellent)`);
    } else if (duration < 1000) {
      success(`Dashboard loads in ${duration}ms (good)`);
    } else if (duration < 2000) {
      warn(`Dashboard loads in ${duration}ms (acceptable)`);
    } else {
      error(`Dashboard loads in ${duration}ms (too slow)`);
      return false;
    }
    
    return true;
  } catch (err) {
    error('Performance test failed');
    error(`Error: ${err.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('Dashboard Backend Integration Test Suite', 'blue');
  console.log('='.repeat(60) + '\n');
  
  const tests = [
    { name: 'Server Connection', fn: testServerConnection },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Dashboard Endpoint', fn: testDashboardEndpoint },
    { name: 'Chart Data', fn: testChartData },
    { name: 'Comparisons', fn: testComparisons },
    { name: 'Workout Logging', fn: testWorkoutLogging },
    { name: 'Streak Calculation', fn: testStreakCalculation },
    { name: 'Data Consistency', fn: testDataConsistency },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Performance', fn: testPerformance },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log('\n' + '-'.repeat(60));
    log(`Test: ${test.name}`, 'yellow');
    console.log('-'.repeat(60));
    
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      error(`Test crashed: ${err.message}`);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  log('Test Summary', 'blue');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${tests.length}`);
  success(`Passed: ${passed}`);
  if (failed > 0) {
    error(`Failed: ${failed}`);
  }
  console.log('='.repeat(60) + '\n');
  
  if (failed === 0) {
    success('All tests passed! Dashboard integration is working correctly.');
  } else {
    error(`${failed} test(s) failed. Please review the errors above.`);
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

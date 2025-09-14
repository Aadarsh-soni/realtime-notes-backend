#!/usr/bin/env node

// Test script for anonymous collaboration
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function testAnonymousCollaboration() {
  console.log('🔍 Testing Anonymous Collaboration...\n');

  const noteId = process.argv[2] || 1; // Use first argument as noteId or default to 1

  try {
    // 1. Join as anonymous user
    console.log('1. Joining as anonymous user...');
    const joinResponse = await axios.post(`${BASE_URL}/realtime/join`, {
      noteId: parseInt(noteId),
      userName: 'Anonymous User',
      isAnonymous: true
    });
    
    console.log('✅ Anonymous join successful:', joinResponse.data);
    const sessionId = joinResponse.data.sessionId;
    console.log(`   Session ID: ${sessionId}`);

    // 2. Send an operation
    console.log('\n2. Sending operation as anonymous user...');
    const operationResponse = await axios.post(`${BASE_URL}/realtime/operation`, {
      noteId: parseInt(noteId),
      baseVersion: 0,
      position: 0,
      deleteLen: 0,
      insert: 'Hello from anonymous user!',
      isAnonymous: true,
      sessionId: sessionId
    });
    
    console.log('✅ Operation sent successfully:', operationResponse.data);

    // 3. Check active users
    console.log('\n3. Checking active users...');
    const usersResponse = await axios.get(`${BASE_URL}/realtime/users/${noteId}`);
    console.log('✅ Active users:', usersResponse.data);

    // 4. Get recent operations
    console.log('\n4. Getting recent operations...');
    const operationsResponse = await axios.get(`${BASE_URL}/realtime/operations/${noteId}`);
    console.log('✅ Recent operations:', operationsResponse.data);

    // 5. Send heartbeat
    console.log('\n5. Sending heartbeat...');
    const heartbeatResponse = await axios.post(`${BASE_URL}/realtime/heartbeat`, {
      noteId: parseInt(noteId),
      isAnonymous: true,
      sessionId: sessionId
    });
    console.log('✅ Heartbeat sent successfully:', heartbeatResponse.data);

    // 6. Leave collaboration
    console.log('\n6. Leaving collaboration...');
    const leaveResponse = await axios.post(`${BASE_URL}/realtime/leave`, {
      noteId: parseInt(noteId),
      isAnonymous: true,
      sessionId: sessionId
    });
    console.log('✅ Leave successful:', leaveResponse.data);

    console.log('\n🎉 Anonymous collaboration test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('\n💡 Tip: Make sure the note exists and is accessible');
    }
  }
}

// Usage instructions
if (process.argv.includes('--help')) {
  console.log(`
Usage: node test-anonymous-collaboration.js [noteId]

Examples:
  node test-anonymous-collaboration.js          # Test with noteId = 1
  node test-anonymous-collaboration.js 5        # Test with noteId = 5
  API_URL=http://localhost:3000 node test-anonymous-collaboration.js  # Custom API URL

This script tests anonymous collaboration without requiring authentication.
  `);
  process.exit(0);
}

testAnonymousCollaboration().catch(console.error);

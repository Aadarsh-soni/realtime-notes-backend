# 🔓 Anonymous Collaboration Guide

## Overview

Your backend now supports **anonymous collaboration** - users can collaborate on notes without needing to register or log in! This is perfect for quick sharing and collaborative editing sessions.

## 🚀 How It Works

### **Anonymous User Flow:**
1. **Join** - Anonymous user joins with `isAnonymous: true`
2. **Collaborate** - Send operations using the returned `sessionId`
3. **Stay Active** - Send heartbeats to maintain presence
4. **Leave** - Clean exit from collaboration

### **Session Management:**
- Each anonymous user gets a unique `sessionId`
- Anonymous users are identified by `sessionId` (not user ID)
- Sessions are stored in memory (reset on server restart)

## 📡 API Endpoints

All realtime endpoints now support anonymous users:

### **1. Join Collaboration**
```http
POST /realtime/join
Content-Type: application/json

{
  "noteId": 123,
  "userName": "Anonymous User",
  "isAnonymous": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Joined collaboration successfully",
  "activeUsers": [...],
  "sessionId": "session_1234567890_abc123"
}
```

### **2. Send Operation**
```http
POST /realtime/operation
Content-Type: application/json

{
  "noteId": 123,
  "baseVersion": 0,
  "position": 0,
  "deleteLen": 0,
  "insert": "Hello world!",
  "isAnonymous": true,
  "sessionId": "session_1234567890_abc123"
}
```

### **3. Send Heartbeat**
```http
POST /realtime/heartbeat
Content-Type: application/json

{
  "noteId": 123,
  "isAnonymous": true,
  "sessionId": "session_1234567890_abc123"
}
```

### **4. Leave Collaboration**
```http
POST /realtime/leave
Content-Type: application/json

{
  "noteId": 123,
  "isAnonymous": true,
  "sessionId": "session_1234567890_abc123"
}
```

### **5. Get Active Users**
```http
GET /realtime/users/123
```

**Response includes anonymous users:**
```json
{
  "activeUsers": [
    {
      "id": "anon_abc123",
      "name": "Anonymous User",
      "lastSeen": 1234567890,
      "isAnonymous": true,
      "sessionId": "session_1234567890_abc123"
    }
  ]
}
```

### **6. Get Operations**
```http
GET /realtime/operations/123
```

**Response includes anonymous operations:**
```json
{
  "operations": [
    {
      "type": "operation",
      "noteId": 123,
      "baseVersion": 0,
      "position": 0,
      "deleteLen": 0,
      "insert": "Hello world!",
      "userId": "anon_abc123",
      "isAnonymous": true,
      "sessionId": "session_1234567890_abc123",
      "timestamp": 1234567890
    }
  ]
}
```

## 💻 Frontend Integration

### **JavaScript Example:**

```javascript
class AnonymousCollaboration {
  constructor(noteId) {
    this.noteId = noteId;
    this.sessionId = null;
    this.isAnonymous = true;
  }

  async join(userName = 'Anonymous User') {
    try {
      const response = await fetch('/realtime/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: this.noteId,
          userName: userName,
          isAnonymous: true
        })
      });
      
      const data = await response.json();
      this.sessionId = data.sessionId;
      console.log('Joined anonymously:', data);
      return data;
    } catch (error) {
      console.error('Join failed:', error);
      throw error;
    }
  }

  async sendOperation(baseVersion, position, deleteLen, insert) {
    try {
      const response = await fetch('/realtime/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: this.noteId,
          baseVersion: baseVersion,
          position: position,
          deleteLen: deleteLen,
          insert: insert,
          isAnonymous: true,
          sessionId: this.sessionId
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    }
  }

  async sendHeartbeat() {
    try {
      const response = await fetch('/realtime/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: this.noteId,
          isAnonymous: true,
          sessionId: this.sessionId
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Heartbeat failed:', error);
      throw error;
    }
  }

  async leave() {
    try {
      const response = await fetch('/realtime/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: this.noteId,
          isAnonymous: true,
          sessionId: this.sessionId
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Leave failed:', error);
      throw error;
    }
  }

  async getActiveUsers() {
    try {
      const response = await fetch(`/realtime/users/${this.noteId}`);
      return await response.json();
    } catch (error) {
      console.error('Get users failed:', error);
      throw error;
    }
  }

  async getOperations(since) {
    try {
      const url = since 
        ? `/realtime/operations/${this.noteId}?since=${since}`
        : `/realtime/operations/${this.noteId}`;
      
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Get operations failed:', error);
      throw error;
    }
  }
}

// Usage
const collab = new AnonymousCollaboration(123);
await collab.join('My Anonymous Name');
await collab.sendOperation(0, 0, 0, 'Hello!');
```

## 🧪 Testing

Use the provided test script:

```bash
# Test anonymous collaboration
node test-anonymous-collaboration.js

# Test with specific note ID
node test-anonymous-collaboration.js 5

# Test with custom API URL
API_URL=http://localhost:3000 node test-anonymous-collaboration.js
```

## 🔄 Mixed Collaboration

Anonymous and authenticated users can collaborate together:

- **Anonymous users**: Identified by `sessionId`
- **Authenticated users**: Identified by `userId`
- **Both types**: Show up in active users list
- **Operations**: Include user type information

## ⚠️ Important Notes

### **Security Considerations:**
- Anonymous users have **no authentication**
- Anyone can join any note anonymously
- Consider adding rate limiting for production

### **Session Management:**
- Sessions are **in-memory only**
- Sessions **reset on server restart**
- No persistent storage for anonymous users

### **Limitations:**
- Anonymous users **cannot** access protected notes
- No **user-specific** features (like personal settings)
- **Temporary** collaboration only

## 🚀 Production Recommendations

1. **Add Rate Limiting**: Prevent abuse of anonymous endpoints
2. **Session Cleanup**: Implement automatic cleanup of inactive sessions
3. **Note Access Control**: Consider which notes allow anonymous access
4. **Monitoring**: Track anonymous collaboration usage
5. **Redis Storage**: Use Redis for session persistence in production

## 🎯 Use Cases

Perfect for:
- **Quick sharing** of notes
- **Temporary collaboration** sessions
- **Public notes** that anyone can edit
- **Prototyping** and testing
- **Guest access** to collaborative documents

Your anonymous collaboration system is now ready to use! 🎉

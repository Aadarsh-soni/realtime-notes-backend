// Real-time collaboration API endpoints
import express from "express";
import { optionalAuthMiddleware, AuthRequest } from "../middleware/auth";
import { RealtimeService } from "../ws/realtime";

const router = express.Router();
router.use(optionalAuthMiddleware);

// Join a note for collaboration
router.post("/join", (req: AuthRequest, res) => {
  const { noteId, userName, isAnonymous } = req.body;
  const userId = req.userId;

  if (!noteId) {
    return res.status(400).json({ error: "noteId is required" });
  }

  try {
    let finalUserId: number | string;
    let finalUserName: string;
    let sessionId: string | undefined;

    if (isAnonymous) {
      // Generate anonymous user ID and session
      const randomId = Math.random().toString(36).substring(2, 15);
      finalUserId = `anon_${randomId}`;
      finalUserName = userName || `Anonymous User ${randomId.substring(0, 6)}`;
      sessionId = `session_${Date.now()}_${randomId}`;
    } else {
      // Authenticated user
      if (!userId) {
        return res.status(401).json({ error: "Authentication required for non-anonymous users" });
      }
      finalUserId = userId;
      finalUserName = userName || `User ${userId}`;
    }

    const message = RealtimeService.addUser(noteId, finalUserId, finalUserName, isAnonymous || false, sessionId);
    
    res.json({ 
      success: true, 
      message,
      activeUsers: RealtimeService.getActiveUsers(noteId),
      sessionId: sessionId // Return session ID for anonymous users
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to join collaboration" });
  }
});

// Leave a note collaboration
router.post("/leave", (req: AuthRequest, res) => {
  const { noteId, userName, isAnonymous, sessionId } = req.body;
  const userId = req.userId;

  if (!noteId) {
    return res.status(400).json({ error: "noteId is required" });
  }

  try {
    let finalUserId: number | string;
    let finalUserName: string;

    if (isAnonymous) {
      // For anonymous users, we need sessionId to identify them
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required for anonymous users" });
      }
      // Find the user by sessionId
      const activeUsers = RealtimeService.getActiveUsers(noteId);
      const anonymousUser = activeUsers.find(u => u.sessionId === sessionId);
      if (!anonymousUser) {
        return res.status(404).json({ error: "Anonymous session not found" });
      }
      finalUserId = anonymousUser.id;
      finalUserName = anonymousUser.name;
    } else {
      // Authenticated user
      if (!userId) {
        return res.status(401).json({ error: "Authentication required for non-anonymous users" });
      }
      finalUserId = userId;
      finalUserName = userName || `User ${userId}`;
    }

    const message = RealtimeService.removeUser(noteId, finalUserId, finalUserName, isAnonymous || false, sessionId);
    
    res.json({ 
      success: true, 
      message,
      activeUsers: RealtimeService.getActiveUsers(noteId)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to leave collaboration" });
  }
});

// Send operation to other users
router.post("/operation", (req: AuthRequest, res) => {
  const { noteId, baseVersion, position, deleteLen, insert, isAnonymous, sessionId } = req.body;
  const userId = req.userId;

  if (!noteId || baseVersion === undefined || position === undefined || deleteLen === undefined || insert === undefined) {
    return res.status(400).json({ 
      error: "noteId, baseVersion, position, deleteLen, and insert are required" 
    });
  }

  try {
    let finalUserId: number | string;

    if (isAnonymous) {
      // For anonymous users, we need sessionId to identify them
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required for anonymous users" });
      }
      // Find the user by sessionId
      const activeUsers = RealtimeService.getActiveUsers(noteId);
      const anonymousUser = activeUsers.find(u => u.sessionId === sessionId);
      if (!anonymousUser) {
        return res.status(404).json({ error: "Anonymous session not found" });
      }
      finalUserId = anonymousUser.id;
    } else {
      // Authenticated user
      if (!userId) {
        return res.status(401).json({ error: "Authentication required for non-anonymous users" });
      }
      finalUserId = userId;
    }

    const operation = RealtimeService.addOperation(
      noteId, 
      finalUserId,
      baseVersion, 
      position, 
      deleteLen, 
      insert,
      isAnonymous || false,
      sessionId
    );
    
    res.json({ 
      success: true, 
      operation,
      activeUsers: RealtimeService.getActiveUsers(noteId)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to process operation" });
  }
});

// Get active users for a note
router.get("/users/:noteId", (req: AuthRequest, res) => {
  const noteId = parseInt(req.params.noteId);
  
  if (isNaN(noteId)) {
    return res.status(400).json({ error: "Invalid noteId" });
  }

  try {
    const activeUsers = RealtimeService.getActiveUsers(noteId);
    res.json({ activeUsers });
  } catch (error) {
    res.status(500).json({ error: "Failed to get active users" });
  }
});

// Get recent operations for a note
router.get("/operations/:noteId", (req: AuthRequest, res) => {
  const noteId = parseInt(req.params.noteId);
  const since = req.query.since ? parseInt(req.query.since as string) : undefined;
  
  if (isNaN(noteId)) {
    return res.status(400).json({ error: "Invalid noteId" });
  }

  try {
    const operations = RealtimeService.getRecentOperations(noteId, since);
    res.json({ operations });
  } catch (error) {
    res.status(500).json({ error: "Failed to get operations" });
  }
});

// Heartbeat to keep user active
router.post("/heartbeat", (req: AuthRequest, res) => {
  const { noteId, userName, isAnonymous, sessionId } = req.body;
  const userId = req.userId;

  if (!noteId) {
    return res.status(400).json({ error: "noteId is required" });
  }

  try {
    let finalUserId: number | string;
    let finalUserName: string;

    if (isAnonymous) {
      // For anonymous users, we need sessionId to identify them
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required for anonymous users" });
      }
      // Find the user by sessionId
      const activeUsers = RealtimeService.getActiveUsers(noteId);
      const anonymousUser = activeUsers.find(u => u.sessionId === sessionId);
      if (!anonymousUser) {
        return res.status(404).json({ error: "Anonymous session not found" });
      }
      finalUserId = anonymousUser.id;
      finalUserName = anonymousUser.name;
    } else {
      // Authenticated user
      if (!userId) {
        return res.status(401).json({ error: "Authentication required for non-anonymous users" });
      }
      finalUserId = userId;
      finalUserName = userName || `User ${userId}`;
    }

    // Update user's last seen time
    RealtimeService.addUser(noteId, finalUserId, finalUserName, isAnonymous || false, sessionId);
    res.json({ 
      success: true,
      activeUsers: RealtimeService.getActiveUsers(noteId)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update heartbeat" });
  }
});

// Cleanup inactive users (admin endpoint)
router.post("/cleanup", (req: AuthRequest, res) => {
  const { noteId, timeoutMs = 30000 } = req.body;
  
  try {
    if (noteId) {
      RealtimeService.cleanupInactiveUsers(noteId, timeoutMs);
    } else {
      // Cleanup all notes
      // This would need to be implemented to iterate through all notes
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to cleanup inactive users" });
  }
});

export default router;

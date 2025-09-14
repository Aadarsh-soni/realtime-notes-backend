// Real-time collaboration API endpoints
import express from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { RealtimeService } from "../ws/realtime";

const router = express.Router();
router.use(authMiddleware);

// Join a note for collaboration
router.post("/join", (req: AuthRequest, res) => {
  const { noteId } = req.body;
  const userId = req.userId!;
  const userName = req.body.userName || `User ${userId}`;

  if (!noteId) {
    return res.status(400).json({ error: "noteId is required" });
  }

  try {
    const message = RealtimeService.addUser(noteId, userId, userName);
    res.json({ 
      success: true, 
      message,
      activeUsers: RealtimeService.getActiveUsers(noteId)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to join collaboration" });
  }
});

// Leave a note collaboration
router.post("/leave", (req: AuthRequest, res) => {
  const { noteId } = req.body;
  const userId = req.userId!;
  const userName = req.body.userName || `User ${userId}`;

  if (!noteId) {
    return res.status(400).json({ error: "noteId is required" });
  }

  try {
    const message = RealtimeService.removeUser(noteId, userId, userName);
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
  const { noteId, baseVersion, position, deleteLen, insert } = req.body;
  const userId = req.userId!;

  if (!noteId || baseVersion === undefined || position === undefined || deleteLen === undefined || insert === undefined) {
    return res.status(400).json({ 
      error: "noteId, baseVersion, position, deleteLen, and insert are required" 
    });
  }

  try {
    const operation = RealtimeService.addOperation(
      noteId, 
      userId, 
      baseVersion, 
      position, 
      deleteLen, 
      insert
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
  const { noteId } = req.body;
  const userId = req.userId!;
  const userName = req.body.userName || `User ${userId}`;

  if (!noteId) {
    return res.status(400).json({ error: "noteId is required" });
  }

  try {
    // Update user's last seen time
    RealtimeService.addUser(noteId, userId, userName);
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

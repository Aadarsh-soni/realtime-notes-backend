"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Real-time collaboration API endpoints
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const realtime_1 = require("../ws/realtime");
const router = express_1.default.Router();
router.use(auth_1.optionalAuthMiddleware);
// Join a note for collaboration
router.post("/join", (req, res) => {
    const { noteId, userName, isAnonymous } = req.body;
    const userId = req.userId;
    if (!noteId) {
        return res.status(400).json({ error: "noteId is required" });
    }
    try {
        let finalUserId;
        let finalUserName;
        let sessionId;
        if (isAnonymous) {
            // Generate anonymous user ID and session
            const randomId = Math.random().toString(36).substring(2, 15);
            finalUserId = `anon_${randomId}`;
            finalUserName = userName || `Anonymous User ${randomId.substring(0, 6)}`;
            sessionId = `session_${Date.now()}_${randomId}`;
        }
        else {
            // Authenticated user
            if (!userId) {
                return res.status(401).json({ error: "Authentication required for non-anonymous users" });
            }
            finalUserId = userId;
            finalUserName = userName || `User ${userId}`;
        }
        const message = realtime_1.RealtimeService.addUser(noteId, finalUserId, finalUserName, isAnonymous || false, sessionId);
        res.json({
            success: true,
            message,
            activeUsers: realtime_1.RealtimeService.getActiveUsers(noteId),
            sessionId: sessionId // Return session ID for anonymous users
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to join collaboration" });
    }
});
// Leave a note collaboration
router.post("/leave", (req, res) => {
    const { noteId, userName, isAnonymous, sessionId } = req.body;
    const userId = req.userId;
    if (!noteId) {
        return res.status(400).json({ error: "noteId is required" });
    }
    try {
        let finalUserId;
        let finalUserName;
        if (isAnonymous) {
            // For anonymous users, we need sessionId to identify them
            if (!sessionId) {
                return res.status(400).json({ error: "sessionId is required for anonymous users" });
            }
            // Find the user by sessionId
            const activeUsers = realtime_1.RealtimeService.getActiveUsers(noteId);
            const anonymousUser = activeUsers.find(u => u.sessionId === sessionId);
            if (!anonymousUser) {
                return res.status(404).json({ error: "Anonymous session not found" });
            }
            finalUserId = anonymousUser.id;
            finalUserName = anonymousUser.name;
        }
        else {
            // Authenticated user
            if (!userId) {
                return res.status(401).json({ error: "Authentication required for non-anonymous users" });
            }
            finalUserId = userId;
            finalUserName = userName || `User ${userId}`;
        }
        const message = realtime_1.RealtimeService.removeUser(noteId, finalUserId, finalUserName, isAnonymous || false, sessionId);
        res.json({
            success: true,
            message,
            activeUsers: realtime_1.RealtimeService.getActiveUsers(noteId)
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to leave collaboration" });
    }
});
// Send operation to other users
router.post("/operation", (req, res) => {
    const { noteId, baseVersion, position, deleteLen, insert, isAnonymous, sessionId } = req.body;
    const userId = req.userId;
    if (!noteId || baseVersion === undefined || position === undefined || deleteLen === undefined || insert === undefined) {
        return res.status(400).json({
            error: "noteId, baseVersion, position, deleteLen, and insert are required"
        });
    }
    try {
        let finalUserId;
        if (isAnonymous) {
            // For anonymous users, we need sessionId to identify them
            if (!sessionId) {
                return res.status(400).json({ error: "sessionId is required for anonymous users" });
            }
            // Find the user by sessionId
            const activeUsers = realtime_1.RealtimeService.getActiveUsers(noteId);
            const anonymousUser = activeUsers.find(u => u.sessionId === sessionId);
            if (!anonymousUser) {
                return res.status(404).json({ error: "Anonymous session not found" });
            }
            finalUserId = anonymousUser.id;
        }
        else {
            // Authenticated user
            if (!userId) {
                return res.status(401).json({ error: "Authentication required for non-anonymous users" });
            }
            finalUserId = userId;
        }
        const operation = realtime_1.RealtimeService.addOperation(noteId, finalUserId, baseVersion, position, deleteLen, insert, isAnonymous || false, sessionId);
        res.json({
            success: true,
            operation,
            activeUsers: realtime_1.RealtimeService.getActiveUsers(noteId)
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to process operation" });
    }
});
// Get active users for a note
router.get("/users/:noteId", (req, res) => {
    const noteId = parseInt(req.params.noteId);
    if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid noteId" });
    }
    try {
        const activeUsers = realtime_1.RealtimeService.getActiveUsers(noteId);
        res.json({ activeUsers });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to get active users" });
    }
});
// Get recent operations for a note
router.get("/operations/:noteId", (req, res) => {
    const noteId = parseInt(req.params.noteId);
    const since = req.query.since ? parseInt(req.query.since) : undefined;
    if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid noteId" });
    }
    try {
        const operations = realtime_1.RealtimeService.getRecentOperations(noteId, since);
        res.json({ operations });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to get operations" });
    }
});
// Heartbeat to keep user active
router.post("/heartbeat", (req, res) => {
    const { noteId, userName, isAnonymous, sessionId } = req.body;
    const userId = req.userId;
    if (!noteId) {
        return res.status(400).json({ error: "noteId is required" });
    }
    try {
        let finalUserId;
        let finalUserName;
        if (isAnonymous) {
            // For anonymous users, we need sessionId to identify them
            if (!sessionId) {
                return res.status(400).json({ error: "sessionId is required for anonymous users" });
            }
            // Find the user by sessionId
            const activeUsers = realtime_1.RealtimeService.getActiveUsers(noteId);
            const anonymousUser = activeUsers.find(u => u.sessionId === sessionId);
            if (!anonymousUser) {
                return res.status(404).json({ error: "Anonymous session not found" });
            }
            finalUserId = anonymousUser.id;
            finalUserName = anonymousUser.name;
        }
        else {
            // Authenticated user
            if (!userId) {
                return res.status(401).json({ error: "Authentication required for non-anonymous users" });
            }
            finalUserId = userId;
            finalUserName = userName || `User ${userId}`;
        }
        // Update user's last seen time
        realtime_1.RealtimeService.addUser(noteId, finalUserId, finalUserName, isAnonymous || false, sessionId);
        res.json({
            success: true,
            activeUsers: realtime_1.RealtimeService.getActiveUsers(noteId)
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update heartbeat" });
    }
});
// Cleanup inactive users (admin endpoint)
router.post("/cleanup", (req, res) => {
    const { noteId, timeoutMs = 30000 } = req.body;
    try {
        if (noteId) {
            realtime_1.RealtimeService.cleanupInactiveUsers(noteId, timeoutMs);
        }
        else {
            // Cleanup all notes
            // This would need to be implemented to iterate through all notes
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to cleanup inactive users" });
    }
});
exports.default = router;

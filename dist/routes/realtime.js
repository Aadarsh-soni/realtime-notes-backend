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
router.use(auth_1.authMiddleware);
// Join a note for collaboration
router.post("/join", (req, res) => {
    const { noteId } = req.body;
    const userId = req.userId;
    const userName = req.body.userName || `User ${userId}`;
    if (!noteId) {
        return res.status(400).json({ error: "noteId is required" });
    }
    try {
        const message = realtime_1.RealtimeService.addUser(noteId, userId, userName);
        res.json({
            success: true,
            message,
            activeUsers: realtime_1.RealtimeService.getActiveUsers(noteId)
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to join collaboration" });
    }
});
// Leave a note collaboration
router.post("/leave", (req, res) => {
    const { noteId } = req.body;
    const userId = req.userId;
    const userName = req.body.userName || `User ${userId}`;
    if (!noteId) {
        return res.status(400).json({ error: "noteId is required" });
    }
    try {
        const message = realtime_1.RealtimeService.removeUser(noteId, userId, userName);
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
    const { noteId, baseVersion, position, deleteLen, insert } = req.body;
    const userId = req.userId;
    if (!noteId || baseVersion === undefined || position === undefined || deleteLen === undefined || insert === undefined) {
        return res.status(400).json({
            error: "noteId, baseVersion, position, deleteLen, and insert are required"
        });
    }
    try {
        const operation = realtime_1.RealtimeService.addOperation(noteId, userId, baseVersion, position, deleteLen, insert);
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
    const { noteId } = req.body;
    const userId = req.userId;
    const userName = req.body.userName || `User ${userId}`;
    if (!noteId) {
        return res.status(400).json({ error: "noteId is required" });
    }
    try {
        // Update user's last seen time
        realtime_1.RealtimeService.addUser(noteId, userId, userName);
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

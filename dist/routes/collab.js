"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
router.use(auth_1.authMiddleware);
// List currently online users (connected via WS)
// This relies on WS presence endpoint over WebSocket: client should call presence.list.
// For convenience, provide HTTP endpoint that returns all registered users except self.
router.get("/users/online", async (req, res) => {
    try {
        const me = req.userId;
        const users = await prisma_1.prisma.user.findMany({
            where: { id: { not: me } },
            select: { id: true, email: true, name: true }
        });
        res.json({ users });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to list users" });
    }
});
// Share a note with another user (persist collaboration)
router.post("/share", async (req, res) => {
    const { noteId, toUserId } = req.body;
    const userId = req.userId;
    if (!noteId || !toUserId)
        return res.status(400).json({ error: "noteId and toUserId are required" });
    const note = await prisma_1.prisma.note.findUnique({ where: { id: Number(noteId) } });
    if (!note || note.ownerId !== userId)
        return res.status(403).json({ error: "Not authorized" });
    const existing = await prisma_1.prisma.collaboration.findFirst({ where: { noteId: Number(noteId), userId: Number(toUserId) } });
    if (!existing) {
        await prisma_1.prisma.collaboration.create({ data: { noteId: Number(noteId), userId: Number(toUserId), role: "editor" } });
    }
    res.json({ success: true });
});
exports.default = router;

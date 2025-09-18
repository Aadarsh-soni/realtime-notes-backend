import express from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { prisma } from "../prisma";
import { getOnlineUserIds } from "../ws/collab";

const router = express.Router();
router.use(authMiddleware);

// List currently online users (connected via WS), excluding the requester
router.get("/users/online", async (req: AuthRequest, res) => {
  try {
    const me = req.userId!;
    const onlineIds = getOnlineUserIds().filter(id => id !== me);
    if (onlineIds.length === 0) return res.json({ users: [] });
    const users = await prisma.user.findMany({
      where: { id: { in: onlineIds } },
      select: { id: true, email: true, name: true }
    });
    res.json({ users });
  } catch (err) { console.error(err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// Share a note with another user (persist collaboration)
router.post("/share", async (req: AuthRequest, res) => {
  const { noteId, toUserId } = req.body as { noteId: number; toUserId: number };
  const userId = req.userId!;

  if (!noteId || !toUserId) return res.status(400).json({ error: "noteId and toUserId are required" });

  const note = await prisma.note.findUnique({ where: { id: Number(noteId) } });
  if (!note || note.ownerId !== userId) return res.status(403).json({ error: "Not authorized" });

  const existing = await prisma.collaboration.findFirst({ where: { noteId: Number(noteId), userId: Number(toUserId) } });
  if (!existing) {
    await prisma.collaboration.create({ data: { noteId: Number(noteId), userId: Number(toUserId), role: "editor" } });
  }

  res.json({ success: true });
});

export default router;



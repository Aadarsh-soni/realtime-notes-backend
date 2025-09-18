import express from "express";
import { prisma } from "../prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  const notes = await prisma.note.findMany({
    where: { ownerId: req.userId!, isDeleted: false },
    orderBy: { updatedAt: "desc" },
  });
  res.json(notes);
});

router.post("/", async (req: AuthRequest, res) => {
  const { title = "Untitled", content = "", folderId } = req.body;
  const note = await prisma.note.create({
    data: { title, content, ownerId: req.userId!, folderId },
  });
  await prisma.noteVersion.create({ data: { noteId: note.id, content, authorId: req.userId! } });
  res.status(201).json(note);
});

// Search endpoint - MUST come before /:id route
router.get("/search", async (req: AuthRequest, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);
  const results = await prisma.note.findMany({
    where: {
      ownerId: req.userId!,
      isDeleted: false,
      OR: [
        { title: { contains: q } },
        { content: { contains: q } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json(results);
});

router.get("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const note = await prisma.note.findUnique({
    where: { id },
    include: { collaborations: true },
  });
  if (!note || (note.ownerId !== req.userId && !note.collaborations.some((c: { userId: number }) => c.userId === req.userId)))
    return res.status(404).json({ error: "not found" });
  res.json(note);
});

router.put("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { title, content, folderId } = req.body;
  const note = await prisma.note.findUnique({ where: { id }, include: { collaborations: true } });
  if (!note || (note.ownerId !== req.userId && !note.collaborations.some((c: { userId: number }) => c.userId === req.userId)))
    return res.status(404).json({ error: "not found or unauthorized" });
  const updated = await prisma.note.update({ where: { id }, data: { title, content, folderId } });
  await prisma.noteVersion.create({ data: { noteId: id, content: content ?? note.content, authorId: req.userId } });
  res.json(updated);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.ownerId !== req.userId)
    return res.status(404).json({ error: "not found or unauthorized" });
  await prisma.note.update({ where: { id }, data: { isDeleted: true } });
  res.status(204).send();
});

//Version History API
router.get("/:id/versions", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const note = await prisma.note.findUnique({ where: { id }, include: { collaborations: true } });
  if (!note || (note.ownerId !== req.userId && !note.collaborations.some((c: { userId: number }) => c.userId === req.userId)))
    return res.status(404).json({ error: "not found or unauthorized" });
  const versions = await prisma.noteVersion.findMany({
    where: { noteId: id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  res.json(versions);
});

export default router;  
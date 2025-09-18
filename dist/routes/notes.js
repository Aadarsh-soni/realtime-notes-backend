"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authMiddleware);
router.get("/", async (req, res) => {
    const notes = await prisma_1.prisma.note.findMany({
        where: { ownerId: req.userId, isDeleted: false },
        orderBy: { updatedAt: "desc" },
    });
    res.json(notes);
});
router.post("/", async (req, res) => {
    const { title = "Untitled", content = "", folderId } = req.body;
    const note = await prisma_1.prisma.note.create({
        data: { title, content, ownerId: req.userId, folderId },
    });
    await prisma_1.prisma.noteVersion.create({ data: { noteId: note.id, content, authorId: req.userId } });
    res.status(201).json(note);
});
// Search endpoint - MUST come before /:id route
router.get("/search", async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q)
        return res.json([]);
    const results = await prisma_1.prisma.note.findMany({
        where: {
            ownerId: req.userId,
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
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const note = await prisma_1.prisma.note.findUnique({
        where: { id },
        include: { collaborations: true },
    });
    if (!note || (note.ownerId !== req.userId && !note.collaborations.some((c) => c.userId === req.userId)))
        return res.status(404).json({ error: "not found" });
    res.json(note);
});
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { title, content, folderId } = req.body;
    const note = await prisma_1.prisma.note.findUnique({ where: { id }, include: { collaborations: true } });
    if (!note || (note.ownerId !== req.userId && !note.collaborations.some((c) => c.userId === req.userId)))
        return res.status(404).json({ error: "not found or unauthorized" });
    const updated = await prisma_1.prisma.note.update({ where: { id }, data: { title, content, folderId } });
    await prisma_1.prisma.noteVersion.create({ data: { noteId: id, content: content ?? note.content, authorId: req.userId } });
    res.json(updated);
});
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const note = await prisma_1.prisma.note.findUnique({ where: { id } });
    if (!note || note.ownerId !== req.userId)
        return res.status(404).json({ error: "not found or unauthorized" });
    await prisma_1.prisma.note.update({ where: { id }, data: { isDeleted: true } });
    res.status(204).send();
});
//Version History API
router.get("/:id/versions", async (req, res) => {
    const id = Number(req.params.id);
    const note = await prisma_1.prisma.note.findUnique({ where: { id }, include: { collaborations: true } });
    if (!note || (note.ownerId !== req.userId && !note.collaborations.some((c) => c.userId === req.userId)))
        return res.status(404).json({ error: "not found or unauthorized" });
    const versions = await prisma_1.prisma.noteVersion.findMany({
        where: { noteId: id },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, email: true } } },
    });
    res.json(versions);
});
exports.default = router;

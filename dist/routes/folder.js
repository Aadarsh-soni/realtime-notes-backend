"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
//Protect all folder routes with JWT
router.use(auth_1.authMiddleware);
/**
 * GET /folders
 * Fetch all folders owned by the authenticated user
 */
router.get("/", async (req, res) => {
    const userId = req.userId;
    const folders = await prisma_1.prisma.folder.findMany({
        where: { ownerId: userId },
        include: { children: true, notes: true },
        orderBy: { updatedAt: "desc" },
    });
    res.json(folders);
});
/**
 * POST /folders
 * Create a new folder
 */
router.post("/", async (req, res) => {
    const userId = req.userId;
    const { name, parentId } = req.body;
    if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Folder name is required" });
    }
    // Check if parent exists (if provided)
    if (parentId) {
        const parent = await prisma_1.prisma.folder.findUnique({ where: { id: parentId } });
        if (!parent || parent.ownerId !== userId) {
            return res.status(400).json({ error: "Invalid parent folder" });
        }
    }
    const folder = await prisma_1.prisma.folder.create({
        data: { name, parentId, ownerId: userId },
    });
    res.status(201).json(folder);
});
/**
 * GET /folders/:id
 * Fetch a single folder with its notes and children
 */
router.get("/:id", async (req, res) => {
    const userId = req.userId;
    const id = Number(req.params.id);
    const folder = await prisma_1.prisma.folder.findUnique({
        where: { id },
        include: { notes: true, children: true },
    });
    if (!folder || folder.ownerId !== userId) {
        return res.status(404).json({ error: "Folder not found or unauthorized" });
    }
    res.json(folder);
});
/**
 * PUT /folders/:id
 * Update folder name
 */
router.put("/:id", async (req, res) => {
    const userId = req.userId;
    const id = Number(req.params.id);
    const { name } = req.body;
    const folder = await prisma_1.prisma.folder.findUnique({ where: { id } });
    if (!folder || folder.ownerId !== userId) {
        return res.status(404).json({ error: "Folder not found or unauthorized" });
    }
    const updated = await prisma_1.prisma.folder.update({
        where: { id },
        data: { name },
    });
    res.json(updated);
});
/**
 * DELETE /folders/:id
 * Delete a folder (only if empty or reassign notes/children first)
 */
router.delete("/:id", async (req, res) => {
    const userId = req.userId;
    const id = Number(req.params.id);
    const folder = await prisma_1.prisma.folder.findUnique({
        where: { id },
        include: { notes: true, children: true },
    });
    if (!folder || folder.ownerId !== userId) {
        return res.status(404).json({ error: "Folder not found or unauthorized" });
    }
    if (folder.notes.length > 0 || folder.children.length > 0) {
        return res
            .status(400)
            .json({ error: "Folder is not empty. Move or delete contents first." });
    }
    await prisma_1.prisma.folder.delete({ where: { id } });
    res.status(204).send();
});
exports.default = router;

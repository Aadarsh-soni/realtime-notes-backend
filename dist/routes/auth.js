"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const config_1 = require("../config");
const router = express_1.default.Router();
// Register
router.post("/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "email and password required" });
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ error: "email already in use" });
    const hashed = await bcrypt_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({ data: { email, password: hashed, name } });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, config_1.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
// Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "email and password required" });
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: "invalid credentials" });
    const ok = await bcrypt_1.default.compare(password, user.password);
    if (!ok)
        return res.status(401).json({ error: "invalid credentials" });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, config_1.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
exports.default = router;

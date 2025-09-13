"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_1 = __importDefault(require("./routes/auth"));
const notes_1 = __importDefault(require("./routes/notes"));
const folder_1 = __importDefault(require("./routes/folder"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use("/auth", auth_1.default);
app.use("/notes", notes_1.default);
app.use("/folders", folder_1.default);
app.get("/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});
exports.default = app;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_1 = __importDefault(require("./routes/auth"));
const notes_1 = __importDefault(require("./routes/notes"));
const folder_1 = __importDefault(require("./routes/folder"));
// Removed legacy realtime routes in favor of invite-based WS + /collab REST
// Use require to avoid TS module resolution hiccups
// eslint-disable-next-line @typescript-eslint/no-var-requires
const collabRoutes = require("./routes/collab").default;
const collab_1 = require("./ws/collab");
const config_1 = require("./config");
const app_1 = __importDefault(require("./app"));
exports.app = app_1.default;
// Middleware
app_1.default.use((0, cors_1.default)());
app_1.default.use((0, helmet_1.default)());
app_1.default.use(express_1.default.json());
//API Routes
app_1.default.use("/auth", auth_1.default); // Register / Login
app_1.default.use("/notes", notes_1.default); // Notes CRUD + search
app_1.default.use("/folders", folder_1.default); // Folder CRUD
app_1.default.use("/collab", collabRoutes); // Collaboration REST (online users, share)
// Health check endpoint (optional, for deployment)
app_1.default.get("/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});
// Create HTTP server and attach WebSocket (only in non-serverless environments)
const server = http_1.default.createServer(app_1.default);
// WebSocket only works in non-serverless environments
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    (0, collab_1.initCollabWebsocket)(server);
}
// Default export for Vercel
exports.default = app_1.default;
// Start server only when this file is run directly
if (require.main === module) {
    server.listen(config_1.PORT, () => {
        console.log(`🚀 Server running at http://localhost:${config_1.PORT}`);
    });
}

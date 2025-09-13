"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCollabWebsocket = initCollabWebsocket;
const ws_1 = __importStar(require("ws"));
const url_1 = __importDefault(require("url"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const prisma_1 = require("../prisma");
function initCollabWebsocket(server) {
    const wss = new ws_1.Server({ server, path: "/ws" });
    const notesState = new Map();
    const redoStacks = new Map();
    wss.on("connection", async (ws, req) => {
        const parsed = url_1.default.parse(String(req.url), true);
        const token = parsed.query.token || (req.headers["authorization"] ? String(req.headers["authorization"]).replace(/^Bearer /, "") : undefined);
        if (!token)
            return ws.close(4001, "Missing token");
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(String(token), config_1.JWT_SECRET);
        }
        catch {
            return ws.close(4002, "Invalid token");
        }
        const userId = payload.userId;
        let joinedNoteId = null;
        ws.on("message", async (raw) => {
            try {
                const data = JSON.parse(String(raw));
                if (data.type === "join") {
                    const { noteId } = data;
                    joinedNoteId = noteId;
                    const note = await prisma_1.prisma.note.findUnique({ where: { id: noteId }, include: { collaborations: true } });
                    if (!note || (note.ownerId !== userId && !note.collaborations.some((c) => c.userId === userId))) {
                        ws.send(JSON.stringify({ type: "error", message: "not authorized" }));
                        return ws.close(4003, "not authorized");
                    }
                    if (!notesState.has(noteId))
                        notesState.set(noteId, { content: note.content, version: 0, history: [], clients: new Set() });
                    const state = notesState.get(noteId);
                    state.clients.add(ws);
                    ws.send(JSON.stringify({ type: "snapshot", content: state.content, version: state.version }));
                    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
                    for (const c of state.clients)
                        if (c !== ws && c.readyState === ws_1.default.OPEN)
                            c.send(JSON.stringify({ type: "presence", user: { id: user?.id, name: user?.name, email: user?.email }, status: "joined" }));
                }
                if (data.type === "op") {
                    const op = data;
                    const state = notesState.get(op.noteId);
                    if (!state)
                        return ws.send(JSON.stringify({ type: "error", message: "no state" }));
                    let transformedPos = op.position;
                    for (let i = op.baseVersion; i < state.version; i++) {
                        const other = state.history[i];
                        if (other && other.position <= transformedPos)
                            transformedPos += other.insert.length - other.deleteLen;
                    }
                    const before = state.content.slice(0, transformedPos);
                    const after = state.content.slice(transformedPos + op.deleteLen);
                    state.content = before + op.insert + after;
                    state.history.push(op);
                    state.version += 1;
                    prisma_1.prisma.note.update({ where: { id: op.noteId }, data: { content: state.content } }).catch(console.error);
                    for (const client of state.clients)
                        if (client.readyState === ws_1.default.OPEN && client !== ws)
                            client.send(JSON.stringify({ type: "op", position: transformedPos, deleteLen: op.deleteLen, insert: op.insert, version: state.version }));
                    ws.send(JSON.stringify({ type: "ack", version: state.version }));
                    redoStacks.set(op.noteId, []); // clear redo stack on new op
                }
                if (data.type === "undo" && joinedNoteId) {
                    const state = notesState.get(joinedNoteId);
                    if (!state || state.history.length === 0)
                        return;
                    const lastOp = state.history.pop();
                    const before = state.content.slice(0, lastOp.position);
                    const after = state.content.slice(lastOp.position + lastOp.insert.length);
                    state.content = before + after;
                    state.version -= 1;
                    redoStacks.get(joinedNoteId)?.push(lastOp);
                    for (const c of state.clients)
                        if (c.readyState === ws_1.default.OPEN)
                            c.send(JSON.stringify({ type: "undo", version: state.version }));
                }
                if (data.type === "redo" && joinedNoteId) {
                    const redoStack = redoStacks.get(joinedNoteId) || [];
                    if (redoStack.length === 0)
                        return;
                    const redoOp = redoStack.pop();
                    const state = notesState.get(joinedNoteId);
                    const before = state.content.slice(0, redoOp.position);
                    const after = state.content.slice(redoOp.position + redoOp.deleteLen);
                    state.content = before + redoOp.insert + after;
                    state.history.push(redoOp);
                    state.version += 1;
                    for (const c of state.clients)
                        if (c.readyState === ws_1.default.OPEN)
                            c.send(JSON.stringify({ type: "redo", version: state.version }));
                }
            }
            catch (err) {
                ws.send(JSON.stringify({ type: "error", message: "invalid message" }));
            }
        });
        ws.on("close", async () => {
            if (joinedNoteId) {
                const s = notesState.get(joinedNoteId);
                if (s) {
                    s.clients.delete(ws);
                    for (const c of s.clients)
                        if (c.readyState === ws_1.default.OPEN)
                            c.send(JSON.stringify({ type: "presence", user: { id: userId }, status: "left" }));
                }
            }
        });
    });
}

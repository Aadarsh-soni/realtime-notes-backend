import WebSocket, { Server as WSServer } from "ws";
import http from "http";
import url from "url";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { prisma } from "../prisma";

type OpMessage = {
  type: "op";
  noteId: number;
  baseVersion: number;
  position: number;
  deleteLen: number;
  insert: string;
};

type JoinMessage = { type: "join"; noteId: number };

export function initCollabWebsocket(server: http.Server) {
  const wss = new WSServer({ server, path: "/ws" });
  const notesState = new Map<number, { content: string; version: number; history: OpMessage[]; clients: Set<WebSocket> }>();
  const redoStacks = new Map<number, OpMessage[]>();

  wss.on("connection", async (ws: WebSocket, req) => {
    const parsed = url.parse(String(req.url), true);
    const token = parsed.query.token || (req.headers["authorization"] ? String(req.headers["authorization"]).replace(/^Bearer /, "") : undefined);
    if (!token) return ws.close(4001, "Missing token");

    let payload: any;
    try { payload = jwt.verify(String(token), JWT_SECRET) as { userId: number }; }
    catch { return ws.close(4002, "Invalid token"); }
    const userId = payload.userId;
    let joinedNoteId: number | null = null;

    ws.on("message", async raw => {
      try {
        const data = JSON.parse(String(raw));

        if (data.type === "join") {
          const { noteId } = data as JoinMessage;
          joinedNoteId = noteId;
          const note = await prisma.note.findUnique({ where: { id: noteId }, include: { collaborations: true } });
          if (!note || (note.ownerId !== userId && !note.collaborations.some((c: { userId: number }) => c.userId === userId))) {
            ws.send(JSON.stringify({ type: "error", message: "not authorized" }));
            return ws.close(4003, "not authorized");
          }

          if (!notesState.has(noteId)) notesState.set(noteId, { content: note.content, version: 0, history: [], clients: new Set() });
          const state = notesState.get(noteId)!;
          state.clients.add(ws);

          ws.send(JSON.stringify({ type: "snapshot", content: state.content, version: state.version }));

          const user = await prisma.user.findUnique({ where: { id: userId } });
          for (const c of state.clients) if (c !== ws && c.readyState === WebSocket.OPEN)
            c.send(JSON.stringify({ type: "presence", user: { id: user?.id, name: user?.name, email: user?.email }, status: "joined" }));
        }

        if (data.type === "op") {
          const op = data as OpMessage;
          const state = notesState.get(op.noteId);
          if (!state) return ws.send(JSON.stringify({ type: "error", message: "no state" }));

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
          prisma.note.update({ where: { id: op.noteId }, data: { content: state.content } }).catch(console.error);

          for (const client of state.clients) if (client.readyState === WebSocket.OPEN && client !== ws)
            client.send(JSON.stringify({ type: "op", position: transformedPos, deleteLen: op.deleteLen, insert: op.insert, version: state.version }));

          ws.send(JSON.stringify({ type: "ack", version: state.version }));
          redoStacks.set(op.noteId, []); // clear redo stack on new op
        }

        if (data.type === "undo" && joinedNoteId) {
          const state = notesState.get(joinedNoteId);
          if (!state || state.history.length === 0) return;
          const lastOp = state.history.pop()!;
          const before = state.content.slice(0, lastOp.position);
          const after = state.content.slice(lastOp.position + lastOp.insert.length);
          state.content = before + after;
          state.version -= 1;
          redoStacks.get(joinedNoteId)?.push(lastOp);
          for (const c of state.clients) if (c.readyState === WebSocket.OPEN)
            c.send(JSON.stringify({ type: "undo", version: state.version }));
        }

        if (data.type === "redo" && joinedNoteId) {
          const redoStack = redoStacks.get(joinedNoteId) || [];
          if (redoStack.length === 0) return;
          const redoOp = redoStack.pop()!;
          const state = notesState.get(joinedNoteId)!;
          const before = state.content.slice(0, redoOp.position);
          const after = state.content.slice(redoOp.position + redoOp.deleteLen);
          state.content = before + redoOp.insert + after;
          state.history.push(redoOp);
          state.version += 1;
          for (const c of state.clients) if (c.readyState === WebSocket.OPEN)
            c.send(JSON.stringify({ type: "redo", version: state.version }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: "error", message: "invalid message" }));
      }
    });

    ws.on("close", async () => {
      if (joinedNoteId) {
        const s = notesState.get(joinedNoteId);
        if (s) {
          s.clients.delete(ws);
          for (const c of s.clients) if (c.readyState === WebSocket.OPEN)
            c.send(JSON.stringify({ type: "presence", user: { id: userId }, status: "left" }));
        }
      }
    });
  });
}
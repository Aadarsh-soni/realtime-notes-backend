import WebSocket, { Server as WSServer } from "ws";
import http from "http";
import url from "url";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { prisma } from "../prisma";

type Client = {
  ws: WebSocket;
  userId: number;
};

type InviteMessage = { type: "invite.send"; noteId: number; toUserId: number };
type InviteAcceptMessage = { type: "invite.accept"; noteId: number };
type RoomJoinMessage = { type: "room.join"; noteId: number };
type OperationMessage = { type: "op.apply"; noteId: number; position: number; deleteLen: number; insert: string };
type PresenceListRequest = { type: "presence.list" };

// Presence registry (module-level) so REST can read online users
const userIdToClients = new Map<number, Set<WebSocket>>();
export function getOnlineUserIds(): number[] {
  return Array.from(userIdToClients.keys());
}

export function initCollabWebsocket(server: http.Server) {
  const wss = new WSServer({ server, path: "/ws" });

  const noteIdToRoom = new Map<number, Set<WebSocket>>();

  function broadcastToRoom(noteId: number, payload: unknown, except?: WebSocket) {
    const clients = noteIdToRoom.get(noteId);
    if (!clients) return;
    for (const c of clients) if (c.readyState === WebSocket.OPEN && c !== except) c.send(JSON.stringify(payload));
  }

  function sendToUser(userId: number, payload: unknown) {
    const set = userIdToClients.get(userId);
    if (!set) return;
    for (const c of set) if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(payload));
  }

  wss.on("connection", async (ws: WebSocket, req) => {
    const parsed = url.parse(String(req.url), true);
    const token = parsed.query.token || (req.headers["authorization"] ? String(req.headers["authorization"]).replace(/^Bearer /, "") : undefined);
    if (!token) return ws.close(4001, "Missing token");

    let payload: any;
    try { payload = jwt.verify(String(token), JWT_SECRET) as { userId: number }; }
    catch { return ws.close(4002, "Invalid token"); }
    const userId = payload.userId as number;

    if (!userIdToClients.has(userId)) userIdToClients.set(userId, new Set());
    userIdToClients.get(userId)!.add(ws);

    ws.on("message", async raw => {
      let data: any;
      try { data = JSON.parse(String(raw)); } catch { return ws.send(JSON.stringify({ type: "error", message: "invalid json" })); }

      // List online users (by currently connected)
      if (data.type === "presence.list") {
        const users = Array.from(userIdToClients.keys());
        return ws.send(JSON.stringify({ type: "presence.users", users }));
      }

      // Invite: persist collaboration and notify recipient if online
      if (data.type === "invite.send") {
        const { noteId, toUserId } = data as InviteMessage;
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note || note.ownerId !== userId) return ws.send(JSON.stringify({ type: "error", message: "not authorized" }));
        const exists = await prisma.collaboration.findFirst({ where: { noteId, userId: toUserId } });
        if (!exists) {
          await prisma.collaboration.create({ data: { noteId, userId: toUserId, role: "editor" } });
        }
        sendToUser(toUserId, { type: "invite.received", noteId, fromUserId: userId });
        return ws.send(JSON.stringify({ type: "invite.sent", noteId, toUserId }));
      }

      // Accept invite: just acknowledge; authorization enforced on join
      if (data.type === "invite.accept") {
        const { noteId } = data as InviteAcceptMessage;
        return ws.send(JSON.stringify({ type: "invite.accepted", noteId }));
      }

      // Join a note room if owner or collaborator
      if (data.type === "room.join") {
        const { noteId } = data as RoomJoinMessage;
        const note = await prisma.note.findUnique({ where: { id: noteId }, include: { collaborations: true } });
        if (!note || (note.ownerId !== userId && !note.collaborations.some(c => c.userId === userId))) {
          return ws.send(JSON.stringify({ type: "error", message: "not authorized" }));
        }
        if (!noteIdToRoom.has(noteId)) noteIdToRoom.set(noteId, new Set());
        noteIdToRoom.get(noteId)!.add(ws);
        ws.send(JSON.stringify({ type: "room.snapshot", noteId, content: note.content }));
        broadcastToRoom(noteId, { type: "room.user_joined", noteId, userId }, ws);
        return;
      }

      // Simple operation broadcast (no OT for now)
      if (data.type === "op.apply") {
        const { noteId, position, deleteLen, insert } = data as OperationMessage;
        const room = noteIdToRoom.get(noteId);
        if (!room || !room.has(ws)) return ws.send(JSON.stringify({ type: "error", message: "join room first" }));
        const note = await prisma.note.findUnique({ where: { id: noteId }, include: { collaborations: true } });
        if (!note || (note.ownerId !== userId && !note.collaborations.some(c => c.userId === userId))) {
          return ws.send(JSON.stringify({ type: "error", message: "not authorized" }));
        }
        const before = note.content.slice(0, position);
        const after = note.content.slice(position + deleteLen);
        const updated = before + insert + after;
        await prisma.note.update({ where: { id: noteId }, data: { content: updated } });
        broadcastToRoom(noteId, { type: "op.applied", noteId, position, deleteLen, insert, userId }, ws);
        return ws.send(JSON.stringify({ type: "op.ack", noteId }));
      }

      return ws.send(JSON.stringify({ type: "error", message: "unknown type" }));
    });

    ws.on("close", () => {
      userIdToClients.get(userId)?.delete(ws);
      for (const [noteId, set] of noteIdToRoom.entries()) {
        if (set.delete(ws)) broadcastToRoom(noteId, { type: "room.user_left", noteId, userId });
      }
    });
  });
}
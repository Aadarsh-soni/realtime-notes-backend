"use strict";
// Real-time collaboration service for Vercel
// This works with external WebSocket services like Pusher
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
// In-memory store for development (use Redis in production)
const collaborationStates = new Map();
class RealtimeService {
    // Get or create collaboration state for a note
    static getCollaborationState(noteId) {
        if (!collaborationStates.has(noteId)) {
            collaborationStates.set(noteId, {
                noteId,
                activeUsers: new Map(),
                operations: []
            });
        }
        return collaborationStates.get(noteId);
    }
    // Add user to note collaboration
    static addUser(noteId, userId, userName) {
        const state = this.getCollaborationState(noteId);
        state.activeUsers.set(userId, {
            id: userId,
            name: userName,
            lastSeen: Date.now()
        });
        return {
            type: "user_join",
            noteId,
            userId,
            userName,
            timestamp: Date.now()
        };
    }
    // Remove user from note collaboration
    static removeUser(noteId, userId, userName) {
        const state = this.getCollaborationState(noteId);
        state.activeUsers.delete(userId);
        return {
            type: "user_leave",
            noteId,
            userId,
            userName,
            timestamp: Date.now()
        };
    }
    // Add operation to note
    static addOperation(noteId, userId, baseVersion, position, deleteLen, insert) {
        const state = this.getCollaborationState(noteId);
        const operation = {
            type: "operation",
            noteId,
            baseVersion,
            position,
            deleteLen,
            insert,
            userId,
            timestamp: Date.now()
        };
        state.operations.push(operation);
        // Keep only last 100 operations to prevent memory bloat
        if (state.operations.length > 100) {
            state.operations = state.operations.slice(-100);
        }
        return operation;
    }
    // Get active users for a note
    static getActiveUsers(noteId) {
        const state = this.getCollaborationState(noteId);
        return Array.from(state.activeUsers.values());
    }
    // Get recent operations for a note
    static getRecentOperations(noteId, since) {
        const state = this.getCollaborationState(noteId);
        if (!since)
            return state.operations;
        return state.operations.filter(op => op.timestamp > since);
    }
    // Clean up inactive users (call periodically)
    static cleanupInactiveUsers(noteId, timeoutMs = 30000) {
        const state = this.getCollaborationState(noteId);
        const now = Date.now();
        for (const [userId, user] of state.activeUsers.entries()) {
            if (now - user.lastSeen > timeoutMs) {
                state.activeUsers.delete(userId);
            }
        }
    }
}
exports.RealtimeService = RealtimeService;

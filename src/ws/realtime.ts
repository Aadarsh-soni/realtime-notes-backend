// Real-time collaboration service for Vercel
// This works with external WebSocket services like Pusher

export interface OperationMessage {
  type: "operation";
  noteId: number;
  baseVersion: number;
  position: number;
  deleteLen: number;
  insert: string;
  userId: number | string; // Can be number for authenticated users or string for anonymous
  isAnonymous: boolean;
  sessionId?: string; // For anonymous users
  timestamp: number;
}

export interface UserPresenceMessage {
  type: "user_join" | "user_leave";
  noteId: number;
  userId: number | string; // Can be number for authenticated users or string for anonymous
  userName: string;
  isAnonymous: boolean;
  sessionId?: string; // For anonymous users
  timestamp: number;
}

export interface CollaborationState {
  noteId: number;
  activeUsers: Map<number | string, { 
    id: number | string; 
    name: string; 
    lastSeen: number; 
    isAnonymous: boolean;
    sessionId?: string;
  }>;
  operations: OperationMessage[];
}

// In-memory store for development (use Redis in production)
const collaborationStates = new Map<number, CollaborationState>();

export class RealtimeService {
  // Get or create collaboration state for a note
  static getCollaborationState(noteId: number): CollaborationState {
    if (!collaborationStates.has(noteId)) {
      collaborationStates.set(noteId, {
        noteId,
        activeUsers: new Map(),
        operations: []
      });
    }
    return collaborationStates.get(noteId)!;
  }

  // Add user to note collaboration
  static addUser(noteId: number, userId: number | string, userName: string, isAnonymous: boolean = false, sessionId?: string): UserPresenceMessage {
    const state = this.getCollaborationState(noteId);
    state.activeUsers.set(userId, {
      id: userId,
      name: userName,
      lastSeen: Date.now(),
      isAnonymous,
      sessionId
    });

    return {
      type: "user_join",
      noteId,
      userId,
      userName,
      isAnonymous,
      sessionId,
      timestamp: Date.now()
    };
  }

  // Remove user from note collaboration
  static removeUser(noteId: number, userId: number | string, userName: string, isAnonymous: boolean = false, sessionId?: string): UserPresenceMessage {
    const state = this.getCollaborationState(noteId);
    state.activeUsers.delete(userId);

    return {
      type: "user_leave",
      noteId,
      userId,
      userName,
      isAnonymous,
      sessionId,
      timestamp: Date.now()
    };
  }

  // Add operation to note
  static addOperation(
    noteId: number,
    userId: number | string,
    baseVersion: number,
    position: number,
    deleteLen: number,
    insert: string,
    isAnonymous: boolean = false,
    sessionId?: string
  ): OperationMessage {
    const state = this.getCollaborationState(noteId);
    
    const operation: OperationMessage = {
      type: "operation",
      noteId,
      baseVersion,
      position,
      deleteLen,
      insert,
      userId,
      isAnonymous,
      sessionId,
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
  static getActiveUsers(noteId: number): Array<{ 
    id: number | string; 
    name: string; 
    lastSeen: number; 
    isAnonymous: boolean;
    sessionId?: string;
  }> {
    const state = this.getCollaborationState(noteId);
    return Array.from(state.activeUsers.values());
  }

  // Get recent operations for a note
  static getRecentOperations(noteId: number, since?: number): OperationMessage[] {
    const state = this.getCollaborationState(noteId);
    if (!since) return state.operations;
    return state.operations.filter(op => op.timestamp > since);
  }

  // Clean up inactive users (call periodically)
  static cleanupInactiveUsers(noteId: number, timeoutMs: number = 30000): void {
    const state = this.getCollaborationState(noteId);
    const now = Date.now();
    
    for (const [userId, user] of state.activeUsers.entries()) {
      if (now - user.lastSeen > timeoutMs) {
        state.activeUsers.delete(userId);
      }
    }
  }
}

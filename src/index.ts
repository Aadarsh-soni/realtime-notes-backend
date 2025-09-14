import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth";
import notesRoutes from "./routes/notes";
import foldersRoutes from "./routes/folder";
import realtimeRoutes from "./routes/realtime";
import { initCollabWebsocket } from "./ws/collab";
import { PORT } from "./config";
import app from "./app";

// Middleware
app.use(cors());
app.use(helmet());  
app.use(express.json());

//API Routes
app.use("/auth", authRoutes);      // Register / Login
app.use("/notes", notesRoutes);    // Notes CRUD + search
app.use("/folders", foldersRoutes); // Folder CRUD
app.use("/realtime", realtimeRoutes); // Real-time collaboration

// Health check endpoint (optional, for deployment)
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Create HTTP server and attach WebSocket (only in non-serverless environments)
const server = http.createServer(app);

// WebSocket only works in non-serverless environments
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  initCollabWebsocket(server);
}

// Export app for testing
export { app };

// Default export for Vercel
export default app;

// Start server only when this file is run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
} 
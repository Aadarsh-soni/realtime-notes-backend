import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth";
import notesRoutes from "./routes/notes";
import foldersRoutes from "./routes/folder";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/notes", notesRoutes);
app.use("/folders", foldersRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

export default app; 
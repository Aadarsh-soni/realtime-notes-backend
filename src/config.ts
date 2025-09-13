import dotenv from "dotenv";

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me" as string;
export const PORT = Number(process.env.PORT || 4000);   
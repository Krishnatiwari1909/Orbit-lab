import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import aiRoute from "./routes/ai.js";

dotenv.config();

const app = express();

// Explicit CORS: allow the frontend dev server on port 8000
app.use(cors({
    origin: ["http://localhost:8000", "http://127.0.0.1:8000"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Handle preflight requests for all routes
app.options("*", cors());

app.use(express.json());

app.use("/api/ai", aiRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
    console.log(`🚀 Backend running on port ${PORT}`)
);

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

// ─── Gemini Client ────────────────────────────────────────────────────────────

function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
}

function respondUnavailable(res, message) {
    return res.status(503).json({
        status: "unavailable",
        message: message || "AI service is temporarily unavailable. Please try again later.",
        reply: message || "Mission AI unavailable."
    });
}

// ─── Structured Output Schema ─────────────────────────────────────────────────

const satelliteLaunchSchema = {
    type: Type.OBJECT,
    properties: {
        mass_kg: {
            type: Type.NUMBER,
            description: "Mass of the satellite in kilograms"
        },
        altitude_km: {
            type: Type.NUMBER,
            description: "Orbital altitude above Earth surface in kilometers"
        },
        velocity_km_s: {
            type: Type.NUMBER,
            description: "Orbital velocity in kilometers per second"
        },
        inclination_deg: {
            type: Type.NUMBER,
            description: "Orbital inclination in degrees (0-180)"
        },
        satellite_type: {
            type: Type.STRING,
            description: "Category of satellite (e.g. Earth Observation, Communication, Weather)"
        }
    },
    required: [
        "mass_kg",
        "altitude_km",
        "velocity_km_s",
        "inclination_deg",
        "satellite_type"
    ]
};

// ─── POST /launch ─────────────────────────────────────────────────────────────

router.post("/launch", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({ error: "A non-empty prompt string is required." });
        }

        const client = getGeminiClient();
        if (!client) {
            return respondUnavailable(res, "Mission AI is not configured. Set GEMINI_API_KEY in backend/.env");
        }

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: satelliteLaunchSchema
            }
        });

        const rawText = response.text;

        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            return res.status(502).json({ error: "Failed to parse structured response from Gemini.", raw: rawText });
        }

        return res.json(parsed);

    } catch (err) {
        console.error("Gemini /launch error:", err?.message || err);
        return respondUnavailable(res);
    }
});

// ─── POST /analyze (Mission Advisor — backward compat) ────────────────────────

router.post("/analyze", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "prompt is required" });
        }

        const client = getGeminiClient();
        if (!client) {
            return respondUnavailable(res, "Mission AI is not configured for this demo right now.");
        }

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a satellite operations AI. Answer in one short sentence.\n\n${prompt}`
        });

        return res.json({ reply: response.text});

    } catch (err) {
        console.error("Gemini /analyze error:", err?.message || err);
        return respondUnavailable(res);
    }
});

export default router;

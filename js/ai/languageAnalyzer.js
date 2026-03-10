import { API_BASE_URL } from '../config.js';

const LANGUAGE_PATH = 'languageAnalyze';

export async function analyzeText(text) {
    try {
        const url = `${API_BASE_URL}/${LANGUAGE_PATH}`;

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn("Language AI unavailable:", e.message);
        return {
            sentiment: "unavailable",
            confidence: 0,
            error: "AI service unavailable. Please try again later."
        };
    }
}







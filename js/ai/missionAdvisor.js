import { API_BASE_URL } from '../config.js';

export async function getMissionAdvice(context) {
    try {
        const res = await fetch(`${API_BASE_URL}/missionAdvisor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: context })
        });

        const data = await res.json();
        return data.reply || "No AI response.";
    } catch {
        return "AI service unavailable. Please try again later.";
    }
}

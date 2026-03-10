import { API_BASE_URL } from '../config.js';

const VISION_PATH = 'visionAnalyze';

export async function analyzeImage(imageFile) {
    try {
        const form = new FormData();
        form.append("image", imageFile);

        const url = `${API_BASE_URL}/${VISION_PATH}`;

        const res = await fetch(url, {
            method: "POST",
            body: form
        });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return await res.json();
    } catch (e) {
        console.warn("Vision AI unavailable:", e.message);
        throw new Error("AI service unavailable. Please try again later.");
    }
}







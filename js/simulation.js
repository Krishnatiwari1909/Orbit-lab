import { API_BASE_URL } from './config.js';
import { getMissionAdvice } from "./ai/missionAdvisor.js";

let lastAIQueryTime = -Infinity;

export const STATE = {
    mode: 'build',
    running: false,
    paused: false,
    battery: 100,
    simTime: 0,
    timeScale: 1,
    orbitDuration: 5400,
    eclipseDuration: 2000,
    installed: {
        battery: false, solar: false, obc: false, comm: false, payload: false
    }
};

// Power drain values (units: Watts)
const DRAIN = { base: 0.5, obc: 2.0, comm: 5.0, payload: 8.0 };

// Energy model constants
export const BATTERY_CAPACITY_WH = 30.0; // battery capacity in Wh (100% -> 30 Wh)
export const SOLAR_FULL_OUTPUT_W = 30.0; // solar panel full output in Watts

// ─── Active satellites array for multi-object collision detection ─────────────
// Each entry: { id: string, mesh: THREE.Object3D }
// Populated externally via addTrackedSatellite() / removeTrackedSatellite()
export const satellites = [];

export function addTrackedSatellite(id, mesh) {
    satellites.push({ id, mesh });
}

export function removeTrackedSatellite(id) {
    const idx = satellites.findIndex(s => s.id === id);
    if (idx !== -1) satellites.splice(idx, 1);
}

// ─── Collision Detection Threshold ───────────────────────────────────────────
const COLLISION_THRESHOLD = 5; // units (Three.js world space)

// ─── Collision Alert Dismiss ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const collisionAlert = document.getElementById("collision-alert");
    const dismissBtn = document.getElementById("collision-dismiss-btn");

    // Dismiss collision alert on button click
    if (dismissBtn && collisionAlert) {
        dismissBtn.addEventListener("click", () => {
            collisionAlert.style.display = "none";
        });
    }
});

// ─── Collision Detection (call each frame from the render loop) ───────────────
export function checkCollisions() {
    const collisionAlert = document.getElementById("collision-alert");
    if (!collisionAlert) return;

    for (let i = 0; i < satellites.length; i++) {
        for (let j = i + 1; j < satellites.length; j++) {
            const a = satellites[i].mesh?.position;
            const b = satellites[j].mesh?.position;
            if (!a || !b) continue;

            // 3D Euclidean distance: d = sqrt((x2-x1)² + (y2-y1)² + (z2-z1)²)
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dz = b.z - a.z;
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (d < COLLISION_THRESHOLD) {
                collisionAlert.style.display = "flex";
                return; // show once per frame is enough
            }
        }
    }
}

export function resetSimulation() {
    STATE.running = false;
    STATE.paused = false;
    STATE.simTime = 0;
    STATE.battery = 100;
}

export function updateSimulation(dt, sunLight, ambientLight, coreLight) {

    const isStatic = STATE.mode === 'build' || !STATE.running;

    if (isStatic) {
        sunLight.intensity += (8.0 - sunLight.intensity) * 0.1;
        ambientLight.intensity += (0.55 - ambientLight.intensity) * 0.1;

        STATE.battery = 100;
        if (coreLight) coreLight.intensity = 1.5;

        return { input: 0, timeStr: "READY", phase: "PRE-LAUNCH", isEclipse: false };
    }

    if (!STATE.paused) {
        STATE.simTime += dt * STATE.timeScale;
    }

    const orbitPos = STATE.simTime % STATE.orbitDuration;
    const sunlightDuration = STATE.orbitDuration - STATE.eclipseDuration;
    const isEclipse = orbitPos > sunlightDuration;

    const targetSun = isEclipse ? 1.2 : 8.0;     // brighter in shadow
    const targetAmb = isEclipse ? 0.35 : 0.55;  // bright ambient

    const lerpSpeed = STATE.timeScale > 10 ? 0.5 : 0.05;

    sunLight.intensity += (targetSun - sunLight.intensity) * lerpSpeed;
    ambientLight.intensity += (targetAmb - ambientLight.intensity) * lerpSpeed;

    // solarInput is in Watts
    let solarInput = 0;
    if (STATE.installed.solar && !isEclipse) solarInput = SOLAR_FULL_OUTPUT_W;

    let totalDrain = DRAIN.base;
    if (STATE.installed.obc) totalDrain += DRAIN.obc;
    if (STATE.installed.comm) totalDrain += DRAIN.comm;
    if (STATE.installed.payload) totalDrain += DRAIN.payload;

    if (!STATE.paused) {
        if (STATE.installed.battery) {
            // Convert current percent to stored Wh
            let storedWh = (STATE.battery / 100.0) * BATTERY_CAPACITY_WH;
            // netPower in Watts (positive -> charging, negative -> discharging)
            const netPowerW = solarInput - totalDrain;
            // energy change in Wh = power (W) * time (h)
            const deltaWh = netPowerW * (dt * STATE.timeScale) / 3600.0;
            storedWh = Math.min(BATTERY_CAPACITY_WH, Math.max(0, storedWh + deltaWh));
            STATE.battery = (storedWh / BATTERY_CAPACITY_WH) * 100.0;
        } else {
            // No storage: system is either powered or not based on instantaneous balance
            STATE.battery = (solarInput >= totalDrain) ? 100 : 0;
        }
    }

    const isDead = STATE.battery <= 0;
    if (coreLight) {
        const hasBrain = STATE.installed.obc;
        coreLight.intensity = (!isDead && hasBrain) ? 1.5 : 0;
    }

    const totalSeconds = Math.floor(STATE.simTime);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');

    // 🧠 AI Mission Advisor — auto-polling DISABLED to prevent API rate-limit exhaustion.
    // The advisor was firing on every frame tick (up to hundreds of times/sec at high time warp).
    // Use the Mission Copilot panel instead for on-demand AI queries.
    const aiBox = document.getElementById("ai-text");
    if (aiBox && aiBox.innerText === "Awaiting live telemetry…") {
        aiBox.innerText = "Use the Mission Copilot panel for AI analysis.";
    }




    return {
        input: solarInput,
        timeStr: STATE.paused ? "PAUSED" : `T+${h}:${m}:${s}`,
        phase: isEclipse ? "ECLIPSE (SHADOW)" : "SUNLIGHT",
        isEclipse
    };
}




export async function askMissionAI(context) {
    try {
        const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt: context })
        });

        const data = await res.json();
        return data.reply ?? "No recommendation available.";
    } catch (e) {
        console.warn("AI unavailable:", e.message);
        return "AI service unavailable. Please try again later.";
    }
}








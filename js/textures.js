// 7. City Lights Texture (procedural, subtle yellow dots)
export function createCityLightsTexture() {
    return createProceduralTexture(1024, 512, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < 1200; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.random() * 1.2 + 0.3;
            ctx.fillStyle = `rgba(255, 220, 120, ${Math.random() * 0.5 + 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}
import * as THREE from 'three';

// Base procedural generator
function createProceduralTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// 1. Improved MLI Gold Foil
export function createMLINormalTexture() {
    return createProceduralTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = "#8080ff";
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 6000; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.random() * 20 + 5;

            ctx.fillStyle =
                Math.random() > 0.5
                    ? "#9090ff"
                    : "#7070ff";

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// 2. Darker Realistic Solar Panel
export function createSolarTexture() {
    return createProceduralTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = "#0b0f2a";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "#4f5f90";
        ctx.lineWidth = 3;

        const cols = 4, rows = 8;
        const pad = 10;
        const cw = w / cols, ch = h / rows;

        ctx.fillStyle = "#0d1a4d";
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                ctx.fillRect(i * cw + pad, j * ch + pad, cw - pad * 2, ch - pad * 2);
                ctx.strokeRect(i * cw + pad, j * ch + pad, cw - pad * 2, ch - pad * 2);
            }
        }
    });
}

// 3. Realistic PCB
export function createPCBTexture() {
    return createProceduralTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = "#003300";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "#50cc50";
        ctx.lineWidth = 4;
        for (let i = 0; i < 60; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * w, Math.random() * h);
            ctx.lineTo(Math.random() * w, Math.random() * h);
            ctx.stroke();
        }

        ctx.fillStyle = "#ccaa33";
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// 4. NEW — Better Industrial Battery texture
export function createBatteryTexture() {
    return createProceduralTexture(512, 256, (ctx, w, h) => {
        ctx.fillStyle = "#1b1b1b"; // Dark grey industrial shell
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#333";
        ctx.fillRect(0, h * 0.35, w, h * 0.3);

        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(w - 120, h * 0.4, 80, 40);

        ctx.fillStyle = "#eee";
        ctx.fillRect(40, h * 0.45, 220, 8);
        ctx.fillRect(40, h * 0.60, 150, 8);
    });
}

// 5. Map-style Earth texture (blue ocean, green land, white borders)
export function createEarthTexture() {
    return createProceduralTexture(1024, 512, (ctx, w, h) => {
        // --- Realistic Ocean Gradient (deep to light blue) ---
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
        oceanGrad.addColorStop(0, '#1a4d7a');      // Dark blue (pole)
        oceanGrad.addColorStop(0.35, '#2d6ba8');   // Mid blue
        oceanGrad.addColorStop(0.5, '#4a8fd8');    // Bright blue (equator)
        oceanGrad.addColorStop(0.65, '#2d6ba8');   // Mid blue
        oceanGrad.addColorStop(1, '#1a4d7a');      // Dark blue (pole)
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, 0, w, h);

        // --- Add subtle ocean texture with waves ---
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 4 + 1;
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- More realistic Continents with better colors ---
        function drawLand(cx, cy, rx, ry, rot, color, subColor = null) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot);
            
            // Main landmass
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.92;
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Add variation with secondary color
            if (subColor) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = subColor;
                for (let i = 0; i < 5; i++) {
                    const sr = rx * (0.3 + Math.random() * 0.4);
                    const sy = ry * (0.2 + Math.random() * 0.5);
                    const sx = sr * (0.4 + Math.random() * 0.6);
                    ctx.beginPath();
                    ctx.ellipse(sr * (Math.random() - 0.5), sy * (Math.random() - 0.5), sx, sy/2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
            ctx.globalAlpha = 1.0;
        }

        // Realistic land colors - greens for vegetation, browns for deserts/mountains
        drawLand(w*0.28, h*0.38, 90, 180, -0.2, '#6b8e3d', '#a8c168'); // Eurasia (green)
        drawLand(w*0.7, h*0.65, 70, 120, 0.3, '#8b9d5e', '#9db070');   // Australia (muted green)
        drawLand(w*0.18, h*0.7, 60, 100, 0.1, '#6b8e3d', '#d4a574');   // Africa (green + brown for Sahara)
        drawLand(w*0.55, h*0.45, 80, 110, -0.4, '#7aa361', '#a8c168'); // Asia (green)
        drawLand(w*0.45, h*0.8, 50, 60, 0.2, '#8b9d5e', '#e8e4d0');    // Antarctica (white-ish)
        
        // Additional smaller landmasses for visual interest
        drawLand(w*0.08, h*0.45, 20, 35, 0.5, '#6b8e3d', '#d4a574');   // North America
        drawLand(w*0.65, h*0.35, 25, 40, -0.3, '#7aa361', '#a8c168');  // South America

        // --- Enhanced Cloud System ---
        // Layer 1: Large cloud formations
        for (let i = 0; i < 8; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const rx = 60 + Math.random() * 90;
            const ry = 20 + Math.random() * 40;
            ctx.save();
            ctx.globalAlpha = 0.22 + Math.random() * 0.12;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Layer 2: Medium clouds with slight blur
        for (let i = 0; i < 16; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const rx = 35 + Math.random() * 50;
            const ry = 10 + Math.random() * 25;
            ctx.save();
            ctx.globalAlpha = 0.15 + Math.random() * 0.1;
            ctx.filter = 'blur(1px)';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.filter = 'none';
            ctx.restore();
        }

        // Layer 3: Small wispy clouds
        for (let i = 0; i < 24; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const rx = 15 + Math.random() * 30;
            const ry = 5 + Math.random() * 15;
            ctx.save();
            ctx.globalAlpha = 0.1 + Math.random() * 0.08;
            ctx.filter = 'blur(2px)';
            ctx.fillStyle = '#f5f5f5';
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.filter = 'none';
            ctx.restore();
        }

        // --- Enhanced Atmosphere Glow ---
        // Inner atmosphere (subtle blue)
        const atmosphereInner = ctx.createRadialGradient(w/2, h/2, w*0.48, w/2, h/2, w*0.5);
        atmosphereInner.addColorStop(0, 'rgba(74, 143, 216, 0)');
        atmosphereInner.addColorStop(1, 'rgba(74, 143, 216, 0.15)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = atmosphereInner;
        ctx.beginPath();
        ctx.arc(w/2, h/2, w*0.5, 0, Math.PI*2);
        ctx.fill();

        // Outer glow (cyan)
        const atmosphereOuter = ctx.createRadialGradient(w/2, h/2, w*0.48, w/2, h/2, w*0.52);
        atmosphereOuter.addColorStop(0, 'rgba(63, 209, 255, 0)');
        atmosphereOuter.addColorStop(1, 'rgba(63, 209, 255, 0.25)');
        ctx.fillStyle = atmosphereOuter;
        ctx.beginPath();
        ctx.arc(w/2, h/2, w*0.52, 0, Math.PI*2);
        ctx.fill();
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // --- Subtle specular highlights (water reflection) ---
        ctx.save();
        ctx.globalAlpha = 0.08;
        const highlight = ctx.createRadialGradient(w*0.3, h*0.35, 0, w*0.3, h*0.35, w*0.2);
        highlight.addColorStop(0, 'rgba(255,255,255,0.6)');
        highlight.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = highlight;
        ctx.beginPath();
        ctx.arc(w*0.3, h*0.35, w*0.2, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    });
}

// 6. Lens texture unchanged
export function createLensTexture() {
    return createProceduralTexture(256, 256, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.2, "#d3faff");
        g.addColorStop(0.55, "#5b45c9");
        g.addColorStop(1, "#000000");

        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
}
// ADD THIS TO THE BOTTOM OF textures.js

export function createEarthRoughnessMap() {
    return createProceduralTexture(1024, 512, (ctx, w, h) => {
        // 1. Base Ocean (Black = Smooth/Shiny)
        ctx.fillStyle = '#111111'; 
        ctx.fillRect(0, 0, w, h);

        // 2. Draw Land (White = Rough/Matte)
        // We reuse the land drawing logic to match the color map
        const drawLandMask = (cx, cy, rx, ry, rot) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot);
            ctx.fillStyle = '#a0a0a0'; // Grey/White for roughness
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        // Same coordinates as your createEarthTexture
        drawLandMask(w*0.28, h*0.38, 90, 180, -0.2); 
        drawLandMask(w*0.7, h*0.65, 70, 120, 0.3);
        drawLandMask(w*0.18, h*0.7, 60, 100, 0.1);
        drawLandMask(w*0.55, h*0.45, 80, 110, -0.4);
        drawLandMask(w*0.45, h*0.8, 50, 60, 0.2);
    });
}
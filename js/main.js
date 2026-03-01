import * as THREE from 'three';
import { initScene, updateEnvironment } from './scene.js';
import { createSatellite, getCoreLight, getGroup } from './satellite.js';
import { initUI, updateUIStats, resetAIUIState } from './ui.js';
import { STATE, updateSimulation, checkCollisions } from './simulation.js';

try {
    const container = document.getElementById('canvas-container');
    const loader = document.getElementById('loader');

    // Only initialize if container exists (simulator page loaded)
    if (!container) {
        console.log('Simulator not loaded yet - landing page may be displayed');
        throw new Error('Waiting for simulator to load');
    }

    const { scene, camera, renderer, controls, sunLight, ambientLight } = initScene(container);
    const satellite = createSatellite();
    scene.add(satellite);

    // Export controls and simulation state globally for mission setup access
    window.orbitControls = controls;
    window.simState = STATE;

    console.log('main.js: initializing simulator (debug logs enabled)');

    initUI((mode, btn) => {
        STATE.mode = mode;
        document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (mode === 'sim') {
            const startPos = camera.position.clone();
            const endPos = new THREE.Vector3(0, 0, 8);
            let t = 0;
            const zoomIn = setInterval(() => {
                t += 0.05;
                camera.position.lerpVectors(startPos, endPos, t);
                if (t >= 1) clearInterval(zoomIn);
            }, 16);
            controls.autoRotate = false;
        } else {
            // Force reset on mode switch
            STATE.running = false;
            STATE.simTime = 0;
            satellite.rotation.set(0, 0, 0);
            controls.autoRotate = false;
        }

        // Reset all AI UI panels and re-apply availability rules
        resetAIUIState();
        if (window.updateAIAvailability) window.updateAIAvailability();
    });

    controls.autoRotate = false;

    const clock = new THREE.Clock();
    let frames = 0;

    function animate() {
        requestAnimationFrame(animate);

        // increment frames early so loader can be hidden even if an error occurs later
        frames++;
        try {
            if (frames === 5 && loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }

            const dt = clock.getDelta();
            updateEnvironment();
            controls.update();

            const simData = updateSimulation(dt, sunLight, ambientLight, getCoreLight());
            updateUIStats(simData);

            // ─── Collision detection (runs every frame) ───────────────────
            checkCollisions();

            if (STATE.mode === 'sim' && STATE.running && !STATE.installed.obc && !STATE.paused) {
                satellite.rotation.x += 0.005;
                satellite.rotation.y += 0.01;
            } else if (STATE.mode === 'build') {
                satellite.rotation.set(0, 0, 0);
            }

            renderer.render(scene, camera);
        } catch (innerErr) {
            console.error('Error in animation loop:', innerErr);
            // ensure loader is removed so user can see the error overlay
            if (loader) { loader.style.opacity = '0'; loader.style.display = 'none'; }
            const errDiv = document.getElementById('error-overlay');
            if (errDiv) {
                errDiv.style.display = 'block';
                errDiv.innerHTML = `<div style="background:rgba(50,0,0,0.95); padding:20px; border:1px solid red; color:#fff; max-width:800px;">` +
                    `<strong>Runtime error:</strong> ${String(innerErr.message || innerErr)}<br><pre style="white-space:pre-wrap; color:#ddd;">${String(innerErr.stack || '')}</pre></div>`;
            }
        }
    }
    animate();

} catch (err) {
    throw err;
}
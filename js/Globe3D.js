import * as THREE from 'three';
import { createEarthTexture, createCityLightsTexture } from './textures.js';

// ===============================
// INTERNAL STATE
// ===============================
let earthGroup = null;
let earthMesh = null;
let starSystem = null;

let rotationEnabled = true;
let rotationSpeed = 0.00008; // realistic slow rotation

// ===============================
// CREATE GLOBE (ONCE)
// ===============================
export function createGlobe(scene) {

    // -------- Earth Group --------
   earthGroup = new THREE.Group();
earthGroup.position.set(0, -4, -18); // push back + slightly down
scene.add(earthGroup);


    // -------- Earth Surface --------
    const earthGeo = new THREE.SphereGeometry(9.5, 128, 128);
    const earthMat = new THREE.MeshStandardMaterial({
        map: createEarthTexture(),
        roughness: 0.5,       // More water reflection
        metalness: 0.15,      // Better specular highlights on oceans
        emissive: 0x0a1a28,   // Darker, more natural emissive
        emissiveIntensity: 0.12,
        envMapIntensity: 1.5  // Enhanced environment reflection
    });
    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.receiveShadow = true;
    earthGroup.add(earthMesh);

    // -------- Clouds Layer (realistic) --------
    const cloudGeo = new THREE.SphereGeometry(9.52, 128, 128);
    const cloudMat = new THREE.MeshStandardMaterial({
        alphaMap: createCityLightsTexture(), // Reusing for cloud pattern
        transparent: true,
        opacity: 0.3,
        roughness: 1.0,
        metalness: 0.0,
        color: 0xffffff,
        depthWrite: false
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(cloudMesh);

    // -------- City Lights Layer (subtle) --------
    const cityGeo = new THREE.SphereGeometry(9.501, 128, 128);
    const cityMat = new THREE.MeshBasicMaterial({
        map: createCityLightsTexture(),
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const cityMesh = new THREE.Mesh(cityGeo, cityMat);
    earthGroup.add(cityMesh);

    // -------- Atmosphere (Layer 1 - Inner Glow) --------
    const atmoGeo = new THREE.SphereGeometry(10.1, 128, 128);
    const atmoMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(atmosphere);

    // -------- Atmosphere (Layer 2 - Middle Glow) --------
    const atmo2 = new THREE.Mesh(
        new THREE.SphereGeometry(10.5, 128, 128),
        new THREE.MeshBasicMaterial({
            color: 0x4d9fff,
            transparent: true,
            opacity: 0.18,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    earthGroup.add(atmo2);

    // -------- Atmosphere (Layer 3 - Outer Rim) --------
    const atmo3 = new THREE.Mesh(
        new THREE.SphereGeometry(11.2, 128, 128),
        new THREE.MeshBasicMaterial({
            color: 0x3d8fff,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    earthGroup.add(atmo3);

    // Star field removed for simulation page background cleanup

    return earthGroup;
}

// ===============================
// UPDATE (CALL EACH FRAME)
// ===============================
export function updateGlobe() {
    if (rotationEnabled && earthGroup) {
        earthGroup.rotation.y += rotationSpeed;
    }

    if (starSystem) {
        starSystem.rotation.y -= 0.00002;
    }
}

// ===============================
// CONTROLS
// ===============================
export function setRotation(enabled) {
    rotationEnabled = enabled;
}

export function setRotationSpeed(speed) {
    rotationSpeed = speed;
}

export function setVisible(visible) {
    if (earthGroup) earthGroup.visible = visible;
    if (starSystem) starSystem.visible = visible;
}

export function getEarthGroup() {
    return earthGroup;
}
export function setLandingMode() {
    setRotationSpeed(0.00015);
}

export function setSimMode() {
    if (!earthGroup) return;

    earthGroup.position.set(0, -3.5, -25);
    earthGroup.scale.set(1, 1, 1);
    setRotationSpeed(0.00008);
}

export function setLandingView() {
    if (!earthGroup) return;

    earthGroup.visible = true;

    // 🔥 BRING IT IN FRONT OF CAMERA
    earthGroup.position.set(0, -1.5, -10);
    earthGroup.scale.set(1.6, 1.6, 1.6);

    setRotationSpeed(0.00015);
}

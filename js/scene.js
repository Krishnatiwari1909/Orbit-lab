import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// REPLACE THE TOP IMPORT LINE WITH THIS:
import { createEarthTexture, createCityLightsTexture, createEarthRoughnessMap } from './textures.js';

let scene, camera, renderer, controls;
let sunLight, ambientLight, rimLight, earthLight, fillLight;
let earthGroup, starSystem;
let earthMesh, cloudMesh;
export function initScene(container) {

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);

    // CAMERA
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(7, 5, 12);

    // RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;  // brighter exposure
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;  // Better color accuracy

    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3;
    controls.maxDistance = 25;

    setupLights();
    setupEarth();
    setupStars();

    return { scene, camera, renderer, controls, sunLight, ambientLight };
}


// --------------------------------------------------
// LIGHTING (Updated)
// --------------------------------------------------


function setupLights() {
    // 1. Ambient Light (Background space light)
    ambientLight = new THREE.AmbientLight(0xffffff, 0.12);
    scene.add(ambientLight);

    // 2. The Sun (Directional Light)
    sunLight = new THREE.DirectionalLight(0xffffff, 1.4); 
    sunLight.position.set(20, 5, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // 3. Backlight (Atmosphere bounce)
    earthLight = new THREE.DirectionalLight(0x224488, 0.6);
    earthLight.position.set(-10, -2, -10);
    scene.add(earthLight);

    // 4. Soft fill to lift satellite shadows
    const fill = new THREE.HemisphereLight(0x7fbfff, 0x080808, 0.35);
    fill.position.set(0, 4, 0);
    scene.add(fill);
}

// --------------------------------------------------
// EARTH (Smaller + darker + realistic)
// --------------------------------------------------


// REPLACE THE ENTIRE setupEarth FUNCTION IN scene.js

function setupEarth() {
    earthGroup = new THREE.Group();
    earthGroup.position.set(0, -3.5, -14); 
    scene.add(earthGroup);

    const textureLoader = new THREE.TextureLoader();

    // --- 1. THE EARTH SURFACE  ---
    const earthGeo = new THREE.SphereGeometry(9.5, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
    map: textureLoader.load('assets/earth_daymap.jpg'),
    specularMap: textureLoader.load('assets/earth_specular_map.jpg'),
    specular: new THREE.Color(0x222222), // Greyish reflection (realistic water)
    shininess: 10,
    // --- NEW: NIGHT LIGHTS ---
    emissiveMap: textureLoader.load('assets/earth_nightmap.jpg'),
    emissive: new THREE.Color(0xffff88), // Yellowish-white light color
    emissiveIntensity: 0.9
    });
    earthMesh = new THREE.Mesh(earthGeo, earthMat); 
    earthMesh.receiveShadow = true;
    earthGroup.add(earthMesh);

    // --- 2. THE CLOUDS (Real Cloud Texture) ---
    const cloudGeo = new THREE.SphereGeometry(9.6, 64, 64); // Slightly bigger than earth
    const cloudMat = new THREE.MeshStandardMaterial({
        map: textureLoader.load('assets/earth_clouds.jpg'),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false, // Prevents clouds from blocking the glow
        
    });
    cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(cloudMesh);
    // --- 3. THE ATMOSPHERE (Cinematic Glow Shader) ---
    const vertexShader = `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec3 vNormal;
        void main() {
            // Calculate intensity based on angle to camera
            float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
            gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
    `;

    const atmoGeo = new THREE.SphereGeometry(10.5, 64, 64); // Large outer shell
    const atmoMat = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
    });

    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(atmosphere);
}

// --------------------------------------------------
// STAR FIELD
// --------------------------------------------------
function setupStars() {

    const geo = new THREE.BufferGeometry();
    const pos = [];

    for (let i = 0; i < 5000; i++) {
        const r = 120 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        pos.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,
        opacity: 1,
        transparent: true
    });

    starSystem = new THREE.Points(geo, mat);
    scene.add(starSystem);
}


// --------------------------------------------------
// UPDATE ENVIRONMENT
// --------------------------------------------------
// Inside scene.js

export function updateEnvironment() {
    // ROTATE EARTH (Standard Speed)
    if (earthMesh) {
        earthMesh.rotation.y += 0.0002;
    }

    // ROTATE CLOUDS (Slightly Faster = Parallax Effect)
    if (cloudMesh) {
        cloudMesh.rotation.y += 0.00028; 
    }

    // ROTATE STARS (Background)
    if (starSystem) {
        starSystem.rotation.y -= 0.00005;
    }
}
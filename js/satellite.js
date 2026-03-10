import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as Tex from './textures.js';

let satelliteGroup;
let components = {};

export function createSatellite() {
    const mats = {
        // UPDATE: Brighter, more reflective Gold Foil
        mli: new THREE.MeshStandardMaterial({
            color: 0xffb43a,
            metalness: 1.0,
            roughness: 0.1, // shinier
            emissive: 0x222222,
            emissiveIntensity: 0.25,
            normalMap: Tex.createMLINormalTexture(),
            normalScale: new THREE.Vector2(0.5, 0.5),
            envMapIntensity: 2.0 // stronger reflections
        }),
        frame: new THREE.MeshStandardMaterial({
            color: 0xcccccc, metalness: 0.8, roughness: 0.4, wireframe: true, transparent: true, opacity: 0.15
        }),
        // UPDATE: Brighter Solar Cells
        solarCell: new THREE.MeshStandardMaterial({
            map: Tex.createSolarTexture(),
            roughness: 0.2,
            metalness: 0.5,
            emissive: 0x000033,
            emissiveIntensity: 0.4 // Improved visibility in dark
        }),
        alu: new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.5 }),
        battery: new THREE.MeshStandardMaterial({ map: Tex.createBatteryTexture(), roughness: 0.4, metalness: 0.1, color: 0xffffff }),
        pcb: new THREE.MeshStandardMaterial({ map: Tex.createPCBTexture(), roughness: 0.6 }),
        black: new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.6 }),

        // UPDATE: Realistic Physical Lens Material
        glass: new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.0,
            transmission: 1.0,  // Glass-like transparency
            thickness: 0.5,
            ior: 1.5,
            clearcoat: 1.0,     // Shiny coating
            clearcoatRoughness: 0.1,
            map: Tex.createLensTexture() // New procedural texture applied here
        }),
        whiteComposite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
        gold: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.2 })
    };

    satelliteGroup = new THREE.Group();

    // ... (Rest of the geometry construction logic remains unchanged) ...
    // Note: Ensuring the createPayload function uses the new 'glass' material defined above.

    // Bus
    const bus = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.0, 1.0, 4, 0.05), mats.mli);
    bus.castShadow = true; bus.receiveShadow = true;
    satelliteGroup.add(bus);
    satelliteGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), mats.frame));
    // small local fill light to ensure the satellite is visible
    const light = new THREE.PointLight(0xffffff, 1.6, 6);
    light.castShadow = false;
    satelliteGroup.add(light);
    components['coreLight'] = light;

    // Add multiple non-shadowing omni lights around the satellite to simulate
    // a spotlight-from-all-directions effect without affecting global scene
    const omniPositions = [
        [1.5, 0, 0], [-1.5, 0, 0], [0, 1.5, 0], [0, -1.5, 0], [0, 0, 1.5], [0, 0, -1.5]
    ];
    components['omniLights'] = [];
    omniPositions.forEach(pos => {
        const l = new THREE.PointLight(0xffffff, 1.4, 5);
        l.position.set(pos[0], pos[1], pos[2]);
        l.castShadow = false;
        satelliteGroup.add(l);
        components['omniLights'].push(l);
    });

    const createSolar = () => {
        const group = new THREE.Group();

        // Panel with visible frame + cells
        const panelGeo = new THREE.BoxGeometry(3.2, 0.05, 0.8);
        const panel = new THREE.Mesh(panelGeo, [mats.alu, mats.alu, mats.solarCell, mats.solarCell, mats.alu, mats.alu]);
        panel.castShadow = true; panel.receiveShadow = true;
        group.add(panel);

        // Hinges/arms
        const armMat = mats.alu;
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 12), armMat);
        hinge.rotation.z = Math.PI / 2;
        hinge.position.set(-1.7, -0.03, 0);
        group.add(hinge);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.8), armMat);
        arm.position.set(-1.9, -0.03, 0);
        group.add(arm);

        group.visible = false;
        satelliteGroup.add(group);
        components['solar'] = group;
    };

    const createBattery = () => {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.6), mats.battery);
        body.position.y = -0.58;
        group.add(body);

        // Terminals
        const terminalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1, roughness: 0.2 });
        const posCap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), terminalMat);
        posCap.position.set(0.18, -0.44, 0.22);
        const negCap = posCap.clone();
        negCap.position.set(-0.18, -0.44, 0.22);
        const posMark = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 12), new THREE.MeshStandardMaterial({ color: 0xff4444 }));
        posMark.position.copy(posCap.position).y += 0.03;
        const negMark = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 12), new THREE.MeshStandardMaterial({ color: 0x4444ff }));
        negMark.position.copy(negCap.position).y += 0.03;
        group.add(posCap, negCap, posMark, negMark);

        group.visible = false;
        satelliteGroup.add(group);
        components['battery'] = group;
    };

    const createOBC = () => {
        const group = new THREE.Group();

        // Base PCB
        const pcbBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.9), mats.pcb);
        pcbBase.position.y = 0.53;
        group.add(pcbBase);

        // Processor with heatsink fins
        const soc = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.22), mats.black);
        soc.position.set(0.08, 0.61, 0.08);
        group.add(soc);

        const finMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.35 });
        for (let i = -2; i <= 2; i++) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.20), finMat);
            fin.position.set(0.08 + i * 0.03, 0.64, 0.08);
            group.add(fin);
        }

        // Connectors along an edge
        const connMat = new THREE.MeshStandardMaterial({ color: 0xdcc27a, metalness: 1, roughness: 0.2 });
        for (let i = 0; i < 5; i++) {
            const conn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.02), connMat);
            conn.position.set(-0.35 + i * 0.18, 0.57, -0.43);
            group.add(conn);
        }

        // Secondary daughter board
        const daughter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.35), new THREE.MeshStandardMaterial({ color: 0x114411, metalness: 0.2, roughness: 0.6 }));
        daughter.position.set(-0.15, 0.59, 0.25);
        group.add(daughter);

        group.visible = false;
        satelliteGroup.add(group);
        components['obc'] = group;
    };

    const createAntenna = () => {
        const group = new THREE.Group();

        // Base mount
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16), mats.alu);
        base.position.y = 0.65;
        group.add(base);

        // Mast
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 16), mats.alu);
        rod.position.y = 0.95;
        group.add(rod);

        // Support struts
        const strutMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.3 });
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i;
            const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 8), strutMat);
            strut.position.set(Math.cos(angle) * 0.06, 0.8, Math.sin(angle) * 0.06);
            strut.rotation.z = Math.PI / 5;
            group.add(strut);
        }

        // Dish with rim
        const dish = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.15, 64, 1, true), mats.whiteComposite);
        dish.position.y = 1.18; dish.rotation.x = Math.PI;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.012, 12, 48), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 0.6, roughness: 0.25 }));
        rim.position.copy(dish.position);
        rim.rotation.x = Math.PI / 2;
        group.add(dish, rim);

        // Feed horn
        const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.045, 0.12, 24), mats.gold);
        feed.position.y = 1.18; feed.rotation.x = Math.PI;
        group.add(feed);

        group.visible = false;
        satelliteGroup.add(group);
        components['comm'] = group;
    };

    // Enhanced payload camera with professional details
    const createPayload = () => {
        const group = new THREE.Group();
        
        // Main camera body (cylindrical housing) - darker matte black
        const housingMat = new THREE.MeshStandardMaterial({ 
            color: 0x0a0a0a, 
            roughness: 0.6, 
            metalness: 0.2 
        });
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 32), housingMat);
        housing.rotation.x = Math.PI / 2;
        group.add(housing);
        
        // Front lens mount ring (metallic)
        const ringMat = new THREE.MeshStandardMaterial({ 
            color: 0x333333, 
            metalness: 0.9, 
            roughness: 0.3 
        });
        const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.03, 16, 32), ringMat);
        lensRing.position.z = 0.225;
        group.add(lensRing);
        
        // Primary lens (enhanced glass material with blue tint) - full coverage
        const primaryLensMat = new THREE.MeshPhysicalMaterial({
            color: 0xeef5ff,
            metalness: 0.0,
            roughness: 0.05,
            transmission: 0.95,
            thickness: 0.5,
            ior: 1.52,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            map: Tex.createLensTexture(),
            transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
        });
        const lens = new THREE.Mesh(
                new THREE.CircleGeometry(0.22, 64), 
            primaryLensMat
        );
        lens.position.z = 0.225;
        group.add(lens);
        
        // Inner lens element (multi-element lens system)
        const innerLens = new THREE.Mesh(
                new THREE.CircleGeometry(0.18, 64),
            new THREE.MeshPhysicalMaterial({
                color: 0xccddff,
                metalness: 0.0,
                roughness: 0.1,
                transmission: 0.9,
                ior: 1.5,
                transparent: true,
                    opacity: 0.7,
                    side: THREE.DoubleSide
            })
        );
            innerLens.position.z = 0.20;
        group.add(innerLens);
        
        // Lens coating reflection (subtle blue/purple tint)
        const coatingMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending
        });
        const coating = new THREE.Mesh(
                new THREE.CircleGeometry(0.22, 64),
            coatingMat
        );
            coating.position.z = 0.226;
        group.add(coating);
        
        // Sensor indicator LED (tiny red light)
        const ledMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8,
            roughness: 0.3
        });
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), ledMat);
        led.position.set(0.18, 0, -0.1);
        group.add(led);
        
        // Side mounting brackets (aluminum)
        const bracketMat = new THREE.MeshStandardMaterial({ 
            color: 0x666666, 
            metalness: 0.8, 
            roughness: 0.4 
        });
        const bracket1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.03), bracketMat);
        bracket1.position.set(0.2, 0, -0.05);
        const bracket2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.03), bracketMat);
        bracket2.position.set(-0.2, 0, -0.05);
        group.add(bracket1, bracket2);
        
        // Back panel with connectors
        const backPanel = new THREE.Mesh(
            new THREE.CircleGeometry(0.21, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a, 
                roughness: 0.8,
                metalness: 0.1 
            })
        );
        backPanel.position.z = -0.225;
        backPanel.rotation.y = Math.PI;
        group.add(backPanel);
        
        // Cable connector ports (gold pins)
        const connectorMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, 
            metalness: 1.0, 
            roughness: 0.2 
        });
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            const x = Math.cos(angle) * 0.15;
            const y = Math.sin(angle) * 0.15;
            const connector = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.01, 0.02, 8),
                connectorMat
            );
            connector.position.set(x, y, -0.23);
            connector.rotation.x = Math.PI / 2;
            group.add(connector);
        }
        
        group.position.z = 0.55; 
        group.visible = false;
        satelliteGroup.add(group); 
        components['payload'] = group;
    };

    createSolar(); createBattery(); createOBC(); createAntenna(); createPayload();
    return satelliteGroup;
}

export function toggleComponent(id, state) { if (components[id]) components[id].visible = state; }
export function getCoreLight() { return components['coreLight']; }
export function getGroup() { return satelliteGroup; }






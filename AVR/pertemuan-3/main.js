import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, orbit;
const controllers = [];
const interactables = [];
const initialTransforms = new Map();
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();
const pointer = new THREE.Vector2();
const logBox = document.getElementById('log');
const lines = [];

let dropZone;

function log(msg) {
    console.log(msg);
    lines.unshift(msg);
    lines.length = Math.min(lines.length, 5);
    logBox.textContent = lines.join(' | ');
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b1f2a);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
    camera.position.set(0, 1.6, 2);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(2, 4, 2);
    scene.add(sun);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0x2e3447 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(10, 20, 0x555a6e, 0x3a3f52));

    // Pengayaan 1: Drop Zone (kotak transparan di lantai)
    const dropZoneGeo = new THREE.BoxGeometry(0.8, 0.05, 0.8);
    const dropZoneMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 });
    dropZone = new THREE.Mesh(dropZoneGeo, dropZoneMat);
    dropZone.position.set(0, 0.025, -1);
    scene.add(dropZone);

    // Objek standar modul
    addObject(new THREE.BoxGeometry(0.3, 0.3, 0.3), 0xe74c3c, -0.6, 1.2, -1);
    addObject(new THREE.SphereGeometry(0.18, 32, 16), 0x3498db, 0, 1.2, -1);
    addObject(new THREE.ConeGeometry(0.16, 0.35, 32), 0x2ecc71, 0.6, 1.2, -1);

    // Pengayaan 4: Tambah 3 objek baru geometri berbeda
    addObject(new THREE.TorusGeometry(0.12, 0.05, 16, 32), 0x9b59b6, -0.6, 0.8, -1);
    addObject(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32), 0xf1c40f, 0, 0.8, -1);
    addObject(new THREE.DodecahedronGeometry(0.15), 0xe67e22, 0.6, 0.8, -1);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 1.2, -1);
    orbit.update();

    setupControllers();
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.setAnimationLoop(render);
}

function addObject(geometry, color, x, y, z) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color }));
    mesh.position.set(x, y, z);
    scene.add(mesh);
    interactables.push(mesh);
    initialTransforms.set(mesh, {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
        scale: mesh.scale.clone()
    });
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupControllers() {
    const modelFactory = new XRControllerModelFactory();

    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);

        controller.addEventListener('connected', (e) => {
            controller.userData.gamepad = e.data.gamepad;
            controller.add(buildRay());
            log('Controller ' + i + ' terhubung (' + e.data.handedness + ')');
        });
        controller.addEventListener('disconnected', () => controller.clear());
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        controller.addEventListener('squeezestart', onSqueezeStart);

        scene.add(controller);
        controllers.push(controller);

        const grip = renderer.xr.getControllerGrip(i);
        grip.add(modelFactory.createControllerModel(grip));
        scene.add(grip);
    }
}

function buildRay() {
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff }));
    line.name = 'ray';
    line.scale.z = 5;
    return line;
}

function getIntersections(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(interactables, false);
}

function pulse(controller, strength = 0.5, ms = 80) {
    const gp = controller.userData.gamepad;
    const actuator = gp && gp.hapticActuators && gp.hapticActuators[0];
    if (actuator && actuator.pulse) actuator.pulse(strength, ms);
}

function onSelectStart(event) {
    const controller = event.target;
    const hits = getIntersections(controller);
    if (hits.length > 0) {
        const obj = hits[0].object;
        controller.attach(obj);
        controller.userData.selected = obj;
        pulse(controller);
        log('GRAB: ' + obj.geometry.type);
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    const obj = controller.userData.selected;
    if (obj) {
        scene.attach(obj);
        controller.userData.selected = undefined;

        // Pengayaan 1: Cek apakah objek dilepas di dalam Drop Zone
        const objPos = obj.position;
        const dzPos = dropZone.position;
        const dist = Math.hypot(objPos.x - dzPos.x, objPos.z - dzPos.z);
        if (dist < 0.4) {
            dropZone.material.color.setHex(0x2ecc71); // hijau
            log('DROP ZONE: Objek masuk zona!');
        } else {
            dropZone.material.color.setHex(0xffaa00); // reset kuning
        }

        log('RELEASE: ' + obj.geometry.type);
    }
}

function onSqueezeStart(event) {
    const controller = event.target;
    const hits = getIntersections(controller);
    if (hits.length > 0) {
        hits[0].object.material.color.setHex(Math.floor(Math.random() * 0xffffff));
        pulse(controller, 0.3, 50);
        log('SQUEEZE: warna diubah');
    }
}

function render() {
    interactables.forEach((o) => o.material.emissive.setHex(0x000000));

    controllers.forEach((c) => {
        const held = c.userData.selected;
        const gp = c.userData.gamepad;

        // Pengayaan 3: Reset scene tombol 4 (misalnya A/X button)
        if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) {
            interactables.forEach((obj) => {
                const init = initialTransforms.get(obj);
                if (init) {
                    if (obj.parent) obj.parent.remove(obj);
                    scene.add(obj);
                    obj.position.copy(init.position);
                    obj.rotation.copy(init.rotation);
                    obj.scale.copy(init.scale);
                }
            });
            log('RESET: Scene dikembalikan ke awal');
        }

        if (held) {
            held.material.emissive.setHex(0x222222);
            if (gp && gp.axes.length >= 4) {
                const y = gp.axes[3]; // Skala via sumbu Y thumbstick
                if (Math.abs(y) > 0.15) {
                    held.scale.multiplyScalar(1 - y * 0.02).clampScalar(0.3, 3);
                }

                // Pengayaan 2: Rotasi objek via sumbu X thumbstick (axes[2])
                const x = gp.axes[2];
                if (Math.abs(x) > 0.15) {
                    held.rotation.y += x * 0.05;
                }
            }
        } else if (c.children.length > 0) {
            const hits = getIntersections(c);
            if (hits.length > 0) hits[0].object.material.emissive.setHex(0x444444);
        }
    });

    if (!renderer.xr.isPresenting) orbit.update();
    renderer.render(scene, camera);
}

function onPointerDown(e) {
    if (renderer.xr.isPresenting) return;

    pointer.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactables, false);
    if (hits.length > 0) {
        hits[0].object.material.color.setHex(Math.floor(Math.random() * 0xffffff));
        log('CLICK (desktop): warna diubah');
    }
}

init();

import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6f8799);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 1.7, 5);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(camera);

// світло
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(5, 10, 5);
scene.add(sun);

const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);

// земля
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x344034 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// тестовий куб, щоб точно бачити, що гра працює
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x777777 })
);
cube.position.set(0, 1, -8);
scene.add(cube);

// M4
let gun = null;

const loader = new OBJLoader();

loader.load(
  "./models/m4a1_s.obj",
  (obj) => {
    gun = obj;

    gun.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({ color: 0x222222 });
      }
    });

    gun.scale.set(0.08, 0.08, 0.08);
    gun.position.set(0.35, -0.35, -0.85);
    gun.rotation.set(0, Math.PI, 0);

    camera.add(gun);
    console.log("M4 loaded");
  },
  undefined,
  (error) => {
    console.error("M4 load error:", error);
  }
);

// звук
const shotSound = new Audio("./sound/universfield-gunshot-352466.mp3");
shotSound.volume = 0.6;

// керування
const keys = {};
let yaw = 0;
let pitch = 0;

document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

document.body.addEventListener("click", () => {
  document.body.requestPointerLock?.();
});

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === document.body) {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-1.4, Math.min(1.4, pitch));
  }
});

document.addEventListener("contextmenu", e => e.preventDefault());

document.addEventListener("mousedown", (e) => {
  if (e.button === 2) shoot();
});

let canShoot = true;

function shoot() {
  if (!canShoot) return;
  canShoot = false;

  shotSound.currentTime = 0;
  shotSound.play().catch(() => {});

  if (gun) {
    gun.position.z += 0.08;
    setTimeout(() => gun.position.z -= 0.08, 70);
  }

  setTimeout(() => canShoot = true, 120);
}

// мобільний джойстик
let joyX = 0;
let joyY = 0;

const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

joystick.addEventListener("touchmove", (e) => {
  e.preventDefault();

  const touch = e.touches[0];
  const rect = joystick.getBoundingClientRect();

  const x = touch.clientX - rect.left - 60;
  const y = touch.clientY - rect.top - 60;
  const max = 40;

  joyX = Math.max(-1, Math.min(1, x / max));
  joyY = Math.max(-1, Math.min(1, y / max));

  stick.style.left = `${35 + joyX * max}px`;
  stick.style.top = `${35 + joyY * max}px`;
});

joystick.addEventListener("touchend", () => {
  joyX = 0;
  joyY = 0;
  stick.style.left = "35px";
  stick.style.top = "35px";
});

// камера на телефоні
const lookArea = document.getElementById("lookArea");
let lastX = null;
let lastY = null;

lookArea.addEventListener("touchmove", (e) => {
  e.preventDefault();

  const touch = e.touches[0];

  if (lastX !== null) {
    const dx = touch.clientX - lastX;
    const dy = touch.clientY - lastY;

    yaw -= dx * 0.006;
    pitch -= dy * 0.006;
    pitch = Math.max(-1.4, Math.min(1.4, pitch));
  }

  lastX = touch.clientX;
  lastY = touch.clientY;
});

lookArea.addEventListener("touchend", () => {
  lastX = null;
  lastY = null;
});

document.getElementById("fireButton").addEventListener("touchstart", (e) => {
  e.preventDefault();
  shoot();
});

const speed = 0.08;

function animate() {
  requestAnimationFrame(animate);

  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  if (keys["KeyW"]) camera.position.add(forward.clone().multiplyScalar(speed));
  if (keys["KeyS"]) camera.position.add(forward.clone().multiplyScalar(-speed));
  if (keys["KeyA"]) camera.position.add(right.clone().multiplyScalar(-speed));
  if (keys["KeyD"]) camera.position.add(right.clone().multiplyScalar(speed));

  camera.position.add(forward.clone().multiplyScalar(-joyY * speed));
  camera.position.add(right.clone().multiplyScalar(joyX * speed));

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

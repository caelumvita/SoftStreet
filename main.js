import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xaed0e5, 90, 300);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 5);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

scene.add(camera);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/* SKYBOX */
function createSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#80b9dc");
  g.addColorStop(0.55, "#b8d9eb");
  g.addColorStop(1, "#e6f4ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * canvas.width,
      70 + Math.random() * 170,
      50 + Math.random() * 90,
      12 + Math.random() * 24,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(600, 64, 32),
  new THREE.MeshBasicMaterial({
    map: createSkyTexture(),
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  })
);
scene.add(sky);

/* LIGHT */
scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x445533, 1.1));

const sun = new THREE.DirectionalLight(0xfff0cf, 2.4);
sun.position.set(70, 120, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -120;
sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -120;
scene.add(sun);

scene.add(new THREE.AmbientLight(0xffffff, 0.18));

/* BASEPLATE */
const baseSize = 180;
const baseLimit = 88;

const baseplate = new THREE.Mesh(
  new THREE.BoxGeometry(baseSize, 2, baseSize),
  new THREE.MeshStandardMaterial({ color: 0x405a39, roughness: 1 })
);
baseplate.position.y = -1;
baseplate.receiveShadow = true;
scene.add(baseplate);

/* COLLISION OBJECTS */
const colliders = [];
const shootables = [];

function addBox(x, y, z, sx, sy, sz) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 })
  );

  box.position.set(x, y, z);
  box.castShadow = true;
  box.receiveShadow = true;
  box.userData.size = new THREE.Vector3(sx, sy, sz);

  scene.add(box);
  colliders.push(box);
  shootables.push(box);
}

addBox(0, 1, -8, 3, 2, 3);
addBox(7, 1.5, -15, 5, 3, 2);
addBox(-7, 1, -18, 4, 2, 4);

/* M4 */
let gun = null;
let gunBase = new THREE.Vector3(0.28, -0.58, -0.72);

new OBJLoader().load("./models/m4a1_s.obj", (obj) => {
  gun = obj;

  gun.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.65,
        metalness: 0.25
      });
    }
  });

  gun.scale.set(0.075, 0.075, 0.075);
  gun.position.copy(gunBase);
  gun.rotation.set(0, Math.PI, 0);
  gun.userData.recoil = 0;
  gun.userData.sway = 0;

  camera.add(gun);
});

/* SOUND */
const shotSound = new Audio("./sound/universfield-gunshot-352466.mp3");
shotSound.volume = 0.5;

/* CONTROLS */
const keys = {};
let yaw = 0;
let pitch = 0;
let isShooting = false;
let canShoot = true;

document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

document.body.addEventListener("click", () => {
  document.body.requestPointerLock?.();
});

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === document.body) {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = clamp(pitch, -1.35, 1.35);
  }
});

document.addEventListener("contextmenu", e => e.preventDefault());

document.addEventListener("mousedown", (e) => {
  if (e.button === 0) isShooting = true;
});

document.addEventListener("mouseup", (e) => {
  if (e.button === 0) isShooting = false;
});

/* MOBILE */
let joyX = 0;
let joyY = 0;

const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
const fireButton = document.getElementById("fireButton");
const lookArea = document.getElementById("lookArea");

joystick.addEventListener("touchmove", (e) => {
  e.preventDefault();

  const t = e.touches[0];
  const r = joystick.getBoundingClientRect();

  const x = t.clientX - r.left - 60;
  const y = t.clientY - r.top - 60;
  const max = 40;

  joyX = clamp(x / max, -1, 1);
  joyY = clamp(y / max, -1, 1);

  stick.style.left = `${35 + joyX * max}px`;
  stick.style.top = `${35 + joyY * max}px`;
});

joystick.addEventListener("touchend", () => {
  joyX = 0;
  joyY = 0;
  stick.style.left = "35px";
  stick.style.top = "35px";
});

fireButton.addEventListener("touchstart", (e) => {
  e.preventDefault();
  isShooting = true;
});

fireButton.addEventListener("touchend", (e) => {
  e.preventDefault();
  isShooting = false;
});

let lastTouchX = null;
let lastTouchY = null;

lookArea.addEventListener("touchmove", (e) => {
  e.preventDefault();

  const t = e.touches[0];

  if (lastTouchX !== null) {
    yaw -= (t.clientX - lastTouchX) * 0.006;
    pitch -= (t.clientY - lastTouchY) * 0.006;
    pitch = clamp(pitch, -1.35, 1.35);
  }

  lastTouchX = t.clientX;
  lastTouchY = t.clientY;
});

lookArea.addEventListener("touchend", () => {
  lastTouchX = null;
  lastTouchY = null;
});

/* COLLISION */
function isColliding(pos) {
  const radius = 0.55;

  if (pos.x < -baseLimit || pos.x > baseLimit || pos.z < -baseLimit || pos.z > baseLimit) {
    return true;
  }

  for (const box of colliders) {
    const s = box.userData.size;

    const minX = box.position.x - s.x / 2 - radius;
    const maxX = box.position.x + s.x / 2 + radius;
    const minZ = box.position.z - s.z / 2 - radius;
    const maxZ = box.position.z + s.z / 2 + radius;

    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      return true;
    }
  }

  return false;
}

function movePlayer(move) {
  const nextX = camera.position.clone();
  nextX.x += move.x;
  if (!isColliding(nextX)) camera.position.x = nextX.x;

  const nextZ = camera.position.clone();
  nextZ.z += move.z;
  if (!isColliding(nextZ)) camera.position.z = nextZ.z;

  camera.position.y = 1.7;
}

/* BULLET HOLE */
function createBulletHole(point, normal) {
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    })
  );

  hole.position.copy(point).add(normal.clone().multiplyScalar(0.02));
  hole.lookAt(point.clone().add(normal));
  scene.add(hole);

  setTimeout(() => {
    scene.remove(hole);
    hole.geometry.dispose();
    hole.material.dispose();
  }, 5000);
}

/* ORANGE TRACER */
function createTracer(start, end) {
  const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
  const mat = new THREE.LineBasicMaterial({
    color: 0xff8a00,
    transparent: true,
    opacity: 1
  });

  const line = new THREE.Line(geo, mat);
  scene.add(line);

  let opacity = 1;

  const fade = setInterval(() => {
    opacity -= 0.18;
    mat.opacity = opacity;

    if (opacity <= 0) {
      clearInterval(fade);
      scene.remove(line);
      geo.dispose();
      mat.dispose();
    }
  }, 20);
}

/* SHOOT */
function shoot() {
  if (!canShoot) return;
  canShoot = false;

  shotSound.currentTime = 0;
  shotSound.play().catch(() => {});

  if (gun) gun.userData.recoil = 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const start = camera.localToWorld(new THREE.Vector3(0.18, -0.18, -0.9));
  let end = camera.localToWorld(new THREE.Vector3(0, 0, -70));

  const hits = raycaster.intersectObjects(shootables, true);

  if (hits.length > 0) {
    const hit = hits[0];
    end = hit.point.clone();

    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    createBulletHole(hit.point, normal);
  }

  createTracer(start, end);

  setTimeout(() => {
    canShoot = true;
  }, 95);
}

/* LOOP */
const clock = new THREE.Clock();
const walkSpeed = 4.1;
let walkTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.033);

  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  const move = new THREE.Vector3();

  if (keys["KeyW"]) move.add(forward);
  if (keys["KeyS"]) move.add(forward.clone().multiplyScalar(-1));
  if (keys["KeyA"]) move.add(right.clone().multiplyScalar(-1));
  if (keys["KeyD"]) move.add(right);

  move.add(forward.clone().multiplyScalar(-joyY));
  move.add(right.clone().multiplyScalar(joyX));

  const moving = move.length() > 0;

  if (moving) {
    move.normalize().multiplyScalar(walkSpeed * dt);
    movePlayer(move);
    walkTime += dt * 8;
  } else {
    walkTime = 0;
  }

  if (isShooting) shoot();

  if (gun) {
    gun.userData.recoil *= 0.84;

    const bobY = moving ? Math.sin(walkTime) * 0.018 : 0;
    const bobX = moving ? Math.cos(walkTime * 0.5) * 0.012 : 0;

    gun.position.x = gunBase.x + bobX;
    gun.position.y = gunBase.y + bobY + gun.userData.recoil * 0.035;
    gun.position.z = gunBase.z + gun.userData.recoil * 0.13;

    gun.rotation.x = gun.userData.recoil * -0.075 + (moving ? Math.sin(walkTime) * 0.01 : 0);
    gun.rotation.y = Math.PI + (moving ? Math.cos(walkTime * 0.5) * 0.01 : 0);
    gun.rotation.z = moving ? Math.sin(walkTime * 0.5) * 0.008 : 0;
  }

  sky.position.copy(camera.position);

  renderer.render(scene, camera);
}

animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

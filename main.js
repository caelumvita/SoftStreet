import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x86bee8);
scene.fog = new THREE.Fog(0x86bee8, 100, 300);

const playerHeight = 2.15;
const playerRadius = 0.48;
const baseLimit = 88;

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, playerHeight, 5);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

scene.add(camera);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/* LIGHT */
scene.add(new THREE.HemisphereLight(0xe7f7ff, 0x405030, 1.35));

const sun = new THREE.DirectionalLight(0xfff1d0, 3.4);
sun.position.set(55, 95, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 260;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.035;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xbfdcff, 0.4);
fill.position.set(-40, 35, -40);
scene.add(fill);

/* WORLD */
const colliders = [];
const shootables = [];

const baseplate = new THREE.Mesh(
  new THREE.BoxGeometry(180, 2, 180),
  new THREE.MeshStandardMaterial({ color: 0x49693f, roughness: 0.95 })
);
baseplate.position.y = -1;
baseplate.receiveShadow = true;
scene.add(baseplate);

function addBox(x, y, z, sx, sy, sz, color = 0x6f7270) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.02 })
  );

  box.position.set(x, y, z);
  box.castShadow = true;
  box.receiveShadow = true;

  box.userData.size = new THREE.Vector3(sx, sy, sz);
  box.userData.isWall = true;

  scene.add(box);
  colliders.push(box);
  shootables.push(box);
}

addBox(0, 1, -9, 3, 2, 3);
addBox(7, 1.5, -16, 5, 3, 2);
addBox(-7, 1, -19, 4, 2, 4);
addBox(0, 2, -32, 20, 4, 1, 0x5f6360);

/* M4 */
let gun = null;
const gunBase = new THREE.Vector3(0.28, -0.48, -0.72);

new OBJLoader().load("./models/m4a1_s.obj", (obj) => {
  gun = obj;

  gun.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.48,
        metalness: 0.45
      });
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  gun.scale.set(0.075, 0.075, 0.075);
  gun.position.copy(gunBase);
  gun.rotation.set(0, Math.PI, 0);
  gun.userData.recoil = 0;

  camera.add(gun);
});

/* SOUND */
const shotSound = new Audio("./sound/universfield-gunshot-352466.mp3");
shotSound.volume = 0.5;

/* INPUT */
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
function resolveCollisions(pos) {
  pos.x = clamp(pos.x, -baseLimit, baseLimit);
  pos.z = clamp(pos.z, -baseLimit, baseLimit);

  for (const box of colliders) {
    const s = box.userData.size;

    const minX = box.position.x - s.x / 2;
    const maxX = box.position.x + s.x / 2;
    const minZ = box.position.z - s.z / 2;
    const maxZ = box.position.z + s.z / 2;

    const closestX = clamp(pos.x, minX, maxX);
    const closestZ = clamp(pos.z, minZ, maxZ);

    let dx = pos.x - closestX;
    let dz = pos.z - closestZ;

    let distSq = dx * dx + dz * dz;

    if (distSq < playerRadius * playerRadius) {
      if (distSq === 0) {
        const left = Math.abs(pos.x - minX);
        const right = Math.abs(maxX - pos.x);
        const front = Math.abs(pos.z - minZ);
        const back = Math.abs(maxZ - pos.z);

        const min = Math.min(left, right, front, back);

        if (min === left) dx = -1;
        else if (min === right) dx = 1;
        else if (min === front) dz = -1;
        else dz = 1;

        distSq = 1;
      }

      const dist = Math.sqrt(distSq);
      const push = playerRadius - dist;

      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
    }
  }

  pos.x = clamp(pos.x, -baseLimit, baseLimit);
  pos.z = clamp(pos.z, -baseLimit, baseLimit);
  pos.y = playerHeight;

  return pos;
}

function movePlayer(move) {
  const next = camera.position.clone().add(move);
  camera.position.copy(resolveCollisions(next));
}

/* BULLET HOLES */
function createBulletHole(point, normal) {
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.025, 14),
    new THREE.MeshBasicMaterial({
      color: 0x050505,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    })
  );

  hole.position.copy(point).add(normal.clone().multiplyScalar(0.025));
  hole.lookAt(point.clone().add(normal));
  scene.add(hole);

  setTimeout(() => {
    scene.remove(hole);
    hole.geometry.dispose();
    hole.material.dispose();
  }, 5000);
}

/* TRACER */
function createTracer(start, end) {
  const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
  const mat = new THREE.LineBasicMaterial({
    color: 0xff8a00,
    transparent: true,
    opacity: 0.95
  });

  const line = new THREE.Line(geo, mat);
  scene.add(line);

  let opacity = 0.95;

  const fade = setInterval(() => {
    opacity -= 0.22;
    mat.opacity = opacity;

    if (opacity <= 0) {
      clearInterval(fade);
      scene.remove(line);
      geo.dispose();
      mat.dispose();
    }
  }, 18);
}

/* SHOOT */
function shoot() {
  if (!canShoot) return;
  canShoot = false;

  shotSound.currentTime = 0;
  shotSound.play().catch(() => {});

  if (gun) gun.userData.recoil = 1;

  camera.updateMatrixWorld(true);

  const muzzleWorld = new THREE.Vector3(0.42, -0.36, -1.05);
  camera.localToWorld(muzzleWorld);

  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion).normalize();

  const raycaster = new THREE.Raycaster(muzzleWorld, direction, 0, 80);
  const hits = raycaster.intersectObjects(shootables, true);

  let end = muzzleWorld.clone().add(direction.clone().multiplyScalar(80));

  if (hits.length > 0) {
    const hit = hits[0];
    end = hit.point.clone();

    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    createBulletHole(hit.point, normal);
  }

  createTracer(muzzleWorld, end);

  setTimeout(() => {
    canShoot = true;
  }, 92);
}

/* LOOP */
const clock = new THREE.Clock();
const walkSpeed = 3.45;
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
    walkTime += dt * 7.5;
  } else {
    walkTime *= 0.88;
  }

  if (isShooting) shoot();

  if (gun) {
    gun.userData.recoil *= 0.84;

    const bobY = moving ? Math.sin(walkTime) * 0.014 : 0;
    const bobX = moving ? Math.cos(walkTime * 0.5) * 0.01 : 0;

    gun.position.x = gunBase.x + bobX;
    gun.position.y = gunBase.y + bobY + gun.userData.recoil * 0.035;
    gun.position.z = gunBase.z + gun.userData.recoil * 0.13;

    gun.rotation.x = gun.userData.recoil * -0.075 + (moving ? Math.sin(walkTime) * 0.008 : 0);
    gun.rotation.y = Math.PI + (moving ? Math.cos(walkTime * 0.5) * 0.008 : 0);
    gun.rotation.z = moving ? Math.sin(walkTime * 0.5) * 0.006 : 0;
  }

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

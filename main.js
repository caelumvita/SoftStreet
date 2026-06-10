import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xaed0e5, 80, 260);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 5);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

scene.add(camera);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// SKYBOX
function makeSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#7fb4d6");
  sky.addColorStop(0.55, "#b9d7e8");
  sky.addColorStop(1, "#e4f2fb");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.55)";

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * canvas.width;
    const y = 60 + Math.random() * 180;
    const w = 60 + Math.random() * 120;
    const h = 14 + Math.random() * 26;

    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const skyTexture = makeSkyTexture();

const skyMesh = new THREE.Mesh(
  new THREE.SphereGeometry(550, 48, 24),
  new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  })
);

skyMesh.renderOrder = -999;
scene.add(skyMesh);

// LIGHT
const hemi = new THREE.HemisphereLight(0xe8f6ff, 0x53733f, 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0cf, 2.2);
sun.position.set(80, 110, 46);
sun.castShadow = true;
scene.add(sun);

scene.add(new THREE.AmbientLight(0xffffff, 0.18));

// BASEPLATE
const baseplate = new THREE.Mesh(
  new THREE.BoxGeometry(180, 2, 180),
  new THREE.MeshStandardMaterial({
    color: 0x3f5939,
    roughness: 1
  })
);

baseplate.position.y = -1;
baseplate.receiveShadow = true;
scene.add(baseplate);

const baseEdge = new THREE.Mesh(
  new THREE.BoxGeometry(181.2, 0.65, 181.2),
  new THREE.MeshStandardMaterial({
    color: 0x67804d,
    roughness: 1
  })
);

baseEdge.position.y = -1.82;
baseEdge.receiveShadow = true;
scene.add(baseEdge);

const baseLimit = 88;

// COLLISION OBJECTS
const colliders = [];
const shootables = [];

function addBox(x, y, z, sx, sy, sz) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 1
    })
  );

  box.position.set(x, y, z);
  box.castShadow = true;
  box.receiveShadow = true;
  box.userData.size = new THREE.Vector3(sx, sy, sz);

  scene.add(box);
  colliders.push(box);
  shootables.push(box);
}

addBox(0, 1, -8, 2, 2, 2);
addBox(5, 1, -14, 4, 2, 2);
addBox(-6, 1, -18, 3, 2, 3);

// TEXTURES
const textureLoader = new THREE.TextureLoader();

const muzzleTexture = textureLoader.load("./textures/fire-sparks-png-transparent-11563012040mvvgsgvryo.png");
const bulletTexture = textureLoader.load("./textures/bullet-1.png");

// M4
let gun = null;

const objLoader = new OBJLoader();

objLoader.load(
  "./models/m4a1_s.obj",
  (obj) => {
    gun = obj;

    gun.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x111111,
          roughness: 0.75
        });
      }
    });

    gun.scale.set(0.08, 0.08, 0.08);
    gun.position.set(0.25, -0.55, -0.65);
    gun.rotation.set(0, Math.PI, 0);
    gun.userData.recoil = 0;

    camera.add(gun);
    console.log("M4 loaded");
  },
  undefined,
  (error) => {
    console.error("M4 load error:", error);
  }
);

// MUZZLE FLASH
const muzzleFlash = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: muzzleTexture,
    transparent: true,
    depthWrite: false
  })
);

muzzleFlash.position.set(0.1, -0.23, -1.15);
muzzleFlash.scale.set(0.35, 0.35, 0.35);
muzzleFlash.visible = false;
camera.add(muzzleFlash);

// SOUND
const shotSound = new Audio("./sound/universfield-gunshot-352466.mp3");
shotSound.volume = 0.55;

// CONTROLS
const keys = {};
let yaw = 0;
let pitch = 0;

let isShooting = false;
let canShoot = true;

document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

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

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

// LEFT MOUSE HOLD SHOOT
document.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    isShooting = true;
  }
});

document.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    isShooting = false;
  }
});

// MOBILE CONTROLS
let joyX = 0;
let joyY = 0;

const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
const fireButton = document.getElementById("fireButton");
const lookArea = document.getElementById("lookArea");

joystick.addEventListener("touchmove", (e) => {
  e.preventDefault();

  const touch = e.touches[0];
  const rect = joystick.getBoundingClientRect();

  const x = touch.clientX - rect.left - 60;
  const y = touch.clientY - rect.top - 60;
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

  const touch = e.touches[0];

  if (lastTouchX !== null && lastTouchY !== null) {
    yaw -= (touch.clientX - lastTouchX) * 0.006;
    pitch -= (touch.clientY - lastTouchY) * 0.006;
    pitch = clamp(pitch, -1.35, 1.35);
  }

  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
});

lookArea.addEventListener("touchend", () => {
  lastTouchX = null;
  lastTouchY = null;
});

// COLLISION
function checkCollision(pos) {
  if (pos.x < -baseLimit || pos.x > baseLimit || pos.z < -baseLimit || pos.z > baseLimit) {
    return true;
  }

  const radius = 0.45;

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

  if (!checkCollision(nextX)) {
    camera.position.x = nextX.x;
  }

  const nextZ = camera.position.clone();
  nextZ.z += move.z;

  if (!checkCollision(nextZ)) {
    camera.position.z = nextZ.z;
  }

  camera.position.y = 1.7;
}

// SHOOTING
function createBulletHole(point, normal) {
  const hole = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.45),
    new THREE.MeshBasicMaterial({
      map: bulletTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    })
  );

  hole.position.copy(point).add(normal.clone().multiplyScalar(0.015));
  hole.lookAt(point.clone().add(normal));

  scene.add(hole);

  setTimeout(() => {
    scene.remove(hole);
    hole.geometry.dispose();
    hole.material.dispose();
  }, 5000);
}

function shoot() {
  if (!canShoot) return;

  canShoot = false;

  shotSound.currentTime = 0;
  shotSound.play().catch(() => {});

  muzzleFlash.visible = true;
  muzzleFlash.material.rotation = Math.random() * Math.PI;
  muzzleFlash.scale.setScalar(0.25 + Math.random() * 0.18);

  setTimeout(() => {
    muzzleFlash.visible = false;
  }, 45);

  if (gun) {
    gun.userData.recoil = 1;
  }

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const hits = raycaster.intersectObjects(shootables, true);

  if (hits.length > 0) {
    const hit = hits[0];
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    createBulletHole(hit.point, normal);
  }

  setTimeout(() => {
    canShoot = true;
  }, 90);
}

// GAME LOOP
const clock = new THREE.Clock();
const speed = 7.5;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.033);

  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const forward = new THREE.Vector3(
    -Math.sin(yaw),
    0,
    -Math.cos(yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(yaw),
    0,
    -Math.sin(yaw)
  );

  const move = new THREE.Vector3();

  if (keys["KeyW"]) move.add(forward);
  if (keys["KeyS"]) move.add(forward.clone().multiplyScalar(-1));
  if (keys["KeyA"]) move.add(right.clone().multiplyScalar(-1));
  if (keys["KeyD"]) move.add(right);

  move.add(forward.clone().multiplyScalar(-joyY));
  move.add(right.clone().multiplyScalar(joyX));

  if (move.length() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    movePlayer(move);
  }

  if (isShooting) {
    shoot();
  }

  if (gun) {
    gun.userData.recoil *= 0.82;

    const baseX = 0.25;
    const baseY = -0.55;
    const baseZ = -0.65;

    gun.position.x = baseX;
    gun.position.y = baseY + gun.userData.recoil * 0.035;
    gun.position.z = baseZ + gun.userData.recoil * 0.12;

    gun.rotation.x = gun.userData.recoil * -0.08;
    gun.rotation.y = Math.PI;
    gun.rotation.z = 0;
  }

  skyMesh.position.copy(camera.position);

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

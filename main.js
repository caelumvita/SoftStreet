import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/OBJLoader.js";

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

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Світло
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(5, 10, 5);
scene.add(sun);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

// Земля
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x344034
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Декілька тестових кубів
for (let i = 0; i < 10; i++) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );

  box.position.set(
    Math.random() * 30 - 15,
    1,
    Math.random() * -30
  );

  scene.add(box);
}

// Автомат у руці
let gun = null;

const objLoader = new OBJLoader();

objLoader.load(
  "./models/m4a1_s.obj",
  (obj) => {
    gun = obj;

    gun.scale.set(0.08, 0.08, 0.08);

    // Позиція автомата перед камерою
    gun.position.set(0.35, -0.32, -0.8);

    // Якщо модель дивиться не туди — ці rotation треба буде міняти
    gun.rotation.set(0, Math.PI, 0);

    camera.add(gun);
  },
  undefined,
  (error) => {
    console.error("Не вдалося завантажити M4 OBJ:", error);
  }
);

scene.add(camera);

// Звук пострілу
const shotSound = new Audio("./sound/universfield-gunshot-352466.mp3");
shotSound.volume = 0.6;

// Клавіатура
const keys = {};

document.addEventListener("keydown", (event) => {
  keys[event.code] = true;
});

document.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

// Мишка
let yaw = 0;
let pitch = 0;

document.body.addEventListener("click", () => {
  document.body.requestPointerLock();
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;

    pitch = Math.max(-1.4, Math.min(1.4, pitch));
  }
});

// Забороняємо меню правої кнопки
document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

// Стрільба правою кнопкою миші
document.addEventListener("mousedown", (event) => {
  if (event.button === 2) {
    shoot();
  }
});

// Стрільба
let canShoot = true;

function shoot() {
  if (!canShoot) return;

  canShoot = false;

  shotSound.currentTime = 0;
  shotSound.play();

  // Простий відкат зброї назад
  if (gun) {
    gun.position.z += 0.08;

    setTimeout(() => {
      gun.position.z -= 0.08;
    }, 70);
  }

  // Простий raycast пострілу
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const hits = raycaster.intersectObjects(scene.children, true);

  if (hits.length > 0) {
    console.log("Попадання в:", hits[0].object);
  }

  setTimeout(() => {
    canShoot = true;
  }, 120);
}

// Джойстик
let joyX = 0;
let joyY = 0;

const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

joystick.addEventListener("touchmove", (event) => {
  event.preventDefault();

  const touch = event.touches[0];
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

// Камера на телефоні
const lookArea = document.getElementById("lookArea");

let lastTouchX = null;
let lastTouchY = null;

lookArea.addEventListener("touchmove", (event) => {
  event.preventDefault();

  const touch = event.touches[0];

  if (lastTouchX !== null && lastTouchY !== null) {
    const dx = touch.clientX - lastTouchX;
    const dy = touch.clientY - lastTouchY;

    yaw -= dx * 0.006;
    pitch -= dy * 0.006;

    pitch = Math.max(-1.4, Math.min(1.4, pitch));
  }

  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
});

lookArea.addEventListener("touchend", () => {
  lastTouchX = null;
  lastTouchY = null;
});

// Кнопка стрільби на телефоні
const fireButton = document.getElementById("fireButton");

fireButton.addEventListener("touchstart", (event) => {
  event.preventDefault();
  shoot();
});

// Рух
const speed = 0.08;

function animate() {
  requestAnimationFrame(animate);

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

  if (keys["KeyW"]) {
    camera.position.add(forward.clone().multiplyScalar(speed));
  }

  if (keys["KeyS"]) {
    camera.position.add(forward.clone().multiplyScalar(-speed));
  }

  if (keys["KeyA"]) {
    camera.position.add(right.clone().multiplyScalar(-speed));
  }

  if (keys["KeyD"]) {
    camera.position.add(right.clone().multiplyScalar(speed));
  }

  camera.position.add(forward.clone().multiplyScalar(-joyY * speed));
  camera.position.add(right.clone().multiplyScalar(joyX * speed));

  renderer.render(scene, camera);
}

animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// PWA Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

/* -------------------------------------------------------
   BASIC SETTINGS
------------------------------------------------------- */

const PLAYER_HEIGHT = 2.25;
const PLAYER_RADIUS = 0.45;

const BASE_SIZE = 120;
const BASE_HALF = BASE_SIZE / 2;

const WALK_SPEED = 5.0;
const ACCELERATION = 11;
const DECELERATION = 14;

const MOUSE_SENSITIVITY = 0.002;
const TOUCH_SENSITIVITY = 0.0045;

const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const desktopHint = document.getElementById("desktopHint");
const mobileHint = document.getElementById("mobileHint");

const isMobile =
  window.matchMedia("(pointer: coarse)").matches ||
  navigator.maxTouchPoints > 0;

/* -------------------------------------------------------
   LOADING MANAGER
------------------------------------------------------- */

const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (_url, loaded, total) => {
  const percent = Math.round((loaded / Math.max(total, 1)) * 100);
  loadingText.textContent = `Завантаження світу: ${percent}%`;
};

loadingManager.onLoad = () => {
  loadingText.textContent = "Готово";

  setTimeout(() => {
    loadingScreen.classList.add("hidden");
  }, 350);

  setTimeout(() => {
    desktopHint.style.opacity = "0";
    mobileHint.style.opacity = "0";
  }, 6000);
};

loadingManager.onError = (url) => {
  console.error("Не вдалося завантажити:", url);
  loadingText.textContent = "Деякі файли не завантажилися";
};

/* -------------------------------------------------------
   SCENE
------------------------------------------------------- */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7895a8);
scene.fog = new THREE.Fog(0x7895a8, 70, 190);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

document.body.appendChild(renderer.domElement);

/* -------------------------------------------------------
   PLAYER STRUCTURE

   player = horizontal rotation and position
   pitchPivot = vertical camera rotation
   camera = player's eyes
------------------------------------------------------- */

const player = new THREE.Group();
player.position.set(0, 0, 18);
scene.add(player);

const pitchPivot = new THREE.Group();
player.add(pitchPivot);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.08,
  500
);

camera.position.set(0, PLAYER_HEIGHT, 0);
pitchPivot.add(camera);

let yaw = 0;
let pitch = 0;

/* -------------------------------------------------------
   EXR SKY AND ENVIRONMENT
------------------------------------------------------- */

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const exrLoader = new EXRLoader(loadingManager);

exrLoader.load(
  "./textures/qwantani_dusk_2_puresky_1k.exr",

  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;

    scene.background = texture;

    const environment =
      pmremGenerator.fromEquirectangular(texture).texture;

    scene.environment = environment;

    pmremGenerator.dispose();
  },

  undefined,

  (error) => {
    console.error("Помилка EXR skybox:", error);

    scene.background = new THREE.Color(0x7895a8);
    scene.fog.color.set(0x7895a8);
  }
);

/* -------------------------------------------------------
   LIGHTING
------------------------------------------------------- */

const hemisphereLight = new THREE.HemisphereLight(
  0xcde8ff,
  0x303928,
  1.15
);

scene.add(hemisphereLight);

const sun = new THREE.DirectionalLight(0xffd7ad, 2.45);
sun.position.set(-35, 55, 28);
sun.castShadow = true;

sun.shadow.mapSize.set(2048, 2048);

sun.shadow.camera.near = 1;
sun.shadow.camera.far = 150;

sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;

sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.025;

scene.add(sun);

const ambientLight = new THREE.AmbientLight(0x8ca4b5, 0.22);
scene.add(ambientLight);

/* -------------------------------------------------------
   GRASS BASEPLATE
------------------------------------------------------- */

const grassMaterial = new THREE.MeshStandardMaterial({
  color: 0x668258,
  roughness: 1,
  metalness: 0
});

const textureLoader = new THREE.TextureLoader(loadingManager);

textureLoader.load(
  "./textures/grass.jpg",

  (grassTexture) => {
    grassTexture.colorSpace = THREE.SRGBColorSpace;

    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;

    grassTexture.repeat.set(18, 18);

    grassTexture.anisotropy =
      renderer.capabilities.getMaxAnisotropy();

    grassMaterial.map = grassTexture;
    grassMaterial.needsUpdate = true;
  },

  undefined,

  (error) => {
    console.error("Помилка текстури трави:", error);
  }
);

const baseplate = new THREE.Mesh(
  new THREE.BoxGeometry(BASE_SIZE, 1, BASE_SIZE),
  grassMaterial
);

baseplate.position.y = -0.5;
baseplate.receiveShadow = true;
baseplate.castShadow = false;

scene.add(baseplate);

/* -------------------------------------------------------
   BUILDING
------------------------------------------------------- */

const buildingMaterial = new THREE.MeshStandardMaterial({
  color: 0xb0a99a,
  roughness: 0.82,
  metalness: 0.03
});

const objLoader = new OBJLoader(loadingManager);

objLoader.load(
  "./models/building_04.obj",

  (building) => {
    building.traverse((child) => {
      if (!child.isMesh) return;

      child.material = buildingMaterial;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    /*
      Автоматично підбираємо розмір будинку.
      Найбільша сторона моделі стане приблизно 24 units.
    */

    const originalBox = new THREE.Box3().setFromObject(building);
    const originalSize = new THREE.Vector3();

    originalBox.getSize(originalSize);

    const largestSide = Math.max(
      originalSize.x,
      originalSize.y,
      originalSize.z
    );

    if (largestSide > 0) {
      const scale = 24 / largestSide;
      building.scale.setScalar(scale);
    }

    /*
      Після масштабування вирівнюємо будинок по центру
      і ставимо його точно на поверхню baseplate.
    */

    building.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(building);
    const center = new THREE.Vector3();

    scaledBox.getCenter(center);

    building.position.x -= center.x;
    building.position.z -= center.z;

    building.updateMatrixWorld(true);

    const groundedBox = new THREE.Box3().setFromObject(building);
    building.position.y -= groundedBox.min.y;

    building.position.z -= 22;

    scene.add(building);
  },

  undefined,

  (error) => {
    console.error("Помилка building_04.obj:", error);
  }
);

/* -------------------------------------------------------
   SIMPLE DECORATIVE LAMPS
------------------------------------------------------- */

function createLamp(x, z) {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 3.3, 10),
    new THREE.MeshStandardMaterial({
      color: 0x20252a,
      roughness: 0.65,
      metalness: 0.6
    })
  );

  pole.position.y = 1.65;
  pole.castShadow = true;
  group.add(pole);

  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.28, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0xffd39b,
      emissive: 0xff9c45,
      emissiveIntensity: 2
    })
  );

  lamp.position.y = 3.35;
  group.add(lamp);

  const light = new THREE.PointLight(
    0xffa557,
    7,
    14,
    2
  );

  light.position.y = 3.25;
  light.castShadow = false;
  group.add(light);

  group.position.set(x, 0, z);
  scene.add(group);
}

createLamp(-7, -10);
createLamp(7, -10);

/* -------------------------------------------------------
   KEYBOARD AND DESKTOP CAMERA
------------------------------------------------------- */

const keys = new Set();

document.addEventListener("keydown", (event) => {
  keys.add(event.code);
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

renderer.domElement.addEventListener("click", () => {
  if (isMobile) return;

  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener("mousemove", (event) => {
  if (isMobile) return;
  if (document.pointerLockElement !== renderer.domElement) return;

  yaw -= event.movementX * MOUSE_SENSITIVITY;
  pitch -= event.movementY * MOUSE_SENSITIVITY;

  pitch = THREE.MathUtils.clamp(
    pitch,
    -Math.PI * 0.47,
    Math.PI * 0.47
  );
});

/* -------------------------------------------------------
   MOBILE JOYSTICK
------------------------------------------------------- */

const joystick = document.getElementById("joystick");
const joystickStick = document.getElementById("joystickStick");

const joystickInput = new THREE.Vector2();

let joystickPointerId = null;

function updateJoystick(clientX, clientY) {
  const rect = joystick.getBoundingClientRect();

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let dx = clientX - centerX;
  let dy = clientY - centerY;

  const maxDistance = 38;
  const distance = Math.hypot(dx, dy);

  if (distance > maxDistance) {
    dx = (dx / distance) * maxDistance;
    dy = (dy / distance) * maxDistance;
  }

  joystickStick.style.transform =
    `translate(${dx}px, ${dy}px)`;

  joystickInput.x = dx / maxDistance;
  joystickInput.y = -dy / maxDistance;

  const deadZone = 0.08;

  if (Math.abs(joystickInput.x) < deadZone) {
    joystickInput.x = 0;
  }

  if (Math.abs(joystickInput.y) < deadZone) {
    joystickInput.y = 0;
  }
}

function resetJoystick() {
  joystickPointerId = null;

  joystickInput.set(0, 0);
  joystickStick.style.transform = "translate(0, 0)";
}

joystick.addEventListener("pointerdown", (event) => {
  if (joystickPointerId !== null) return;

  event.preventDefault();

  joystickPointerId = event.pointerId;
  joystick.setPointerCapture(event.pointerId);

  updateJoystick(event.clientX, event.clientY);
});

joystick.addEventListener("pointermove", (event) => {
  if (event.pointerId !== joystickPointerId) return;

  event.preventDefault();
  updateJoystick(event.clientX, event.clientY);
});

joystick.addEventListener("pointerup", (event) => {
  if (event.pointerId !== joystickPointerId) return;
  resetJoystick();
});

joystick.addEventListener("pointercancel", (event) => {
  if (event.pointerId !== joystickPointerId) return;
  resetJoystick();
});

/* -------------------------------------------------------
   MOBILE LOOK AREA
------------------------------------------------------- */

const lookZone = document.getElementById("lookZone");

let lookPointerId = null;
let previousLookX = 0;
let previousLookY = 0;

function stopLooking() {
  lookPointerId = null;
}

lookZone.addEventListener("pointerdown", (event) => {
  if (lookPointerId !== null) return;

  event.preventDefault();

  lookPointerId = event.pointerId;
  previousLookX = event.clientX;
  previousLookY = event.clientY;

  lookZone.setPointerCapture(event.pointerId);
});

lookZone.addEventListener("pointermove", (event) => {
  if (event.pointerId !== lookPointerId) return;

  event.preventDefault();

  const dx = event.clientX - previousLookX;
  const dy = event.clientY - previousLookY;

  previousLookX = event.clientX;
  previousLookY = event.clientY;

  yaw -= dx * TOUCH_SENSITIVITY;
  pitch -= dy * TOUCH_SENSITIVITY;

  pitch = THREE.MathUtils.clamp(
    pitch,
    -Math.PI * 0.47,
    Math.PI * 0.47
  );
});

lookZone.addEventListener("pointerup", (event) => {
  if (event.pointerId !== lookPointerId) return;
  stopLooking();
});

lookZone.addEventListener("pointercancel", (event) => {
  if (event.pointerId !== lookPointerId) return;
  stopLooking();
});

/* -------------------------------------------------------
   MOVEMENT
------------------------------------------------------- */

const velocity = new THREE.Vector3();
const targetVelocity = new THREE.Vector3();

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const movementDirection = new THREE.Vector3();

function getMovementInput() {
  let inputX = joystickInput.x;
  let inputY = joystickInput.y;

  if (keys.has("KeyW") || keys.has("ArrowUp")) {
    inputY += 1;
  }

  if (keys.has("KeyS") || keys.has("ArrowDown")) {
    inputY -= 1;
  }

  if (keys.has("KeyD") || keys.has("ArrowRight")) {
    inputX += 1;
  }

  if (keys.has("KeyA") || keys.has("ArrowLeft")) {
    inputX -= 1;
  }

  const length = Math.hypot(inputX, inputY);

  if (length > 1) {
    inputX /= length;
    inputY /= length;
  }

  return { inputX, inputY };
}

function updateMovement(deltaTime) {
  const { inputX, inputY } = getMovementInput();

  forward.set(
    -Math.sin(yaw),
    0,
    -Math.cos(yaw)
  );

  right.set(
    Math.cos(yaw),
    0,
    -Math.sin(yaw)
  );

  movementDirection.set(0, 0, 0);

  movementDirection.addScaledVector(forward, inputY);
  movementDirection.addScaledVector(right, inputX);

  if (movementDirection.lengthSq() > 1) {
    movementDirection.normalize();
  }

  targetVelocity
    .copy(movementDirection)
    .multiplyScalar(WALK_SPEED);

  const hasInput = movementDirection.lengthSq() > 0.001;

  const smoothing = hasInput
    ? ACCELERATION
    : DECELERATION;

  const blend =
    1 - Math.exp(-smoothing * deltaTime);

  velocity.lerp(targetVelocity, blend);

  player.position.addScaledVector(
    velocity,
    deltaTime
  );

  /*
    Baseplate collision:
    гравець завжди залишається на поверхні
    та не може вийти за краї.
  */

  const movementLimit =
    BASE_HALF - PLAYER_RADIUS;

  player.position.x = THREE.MathUtils.clamp(
    player.position.x,
    -movementLimit,
    movementLimit
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z,
    -movementLimit,
    movementLimit
  );

  player.position.y = 0;
}

/* -------------------------------------------------------
   SUBTLE WALKING BOB
------------------------------------------------------- */

let walkingTime = 0;

function updateWalkingBob(deltaTime) {
  const horizontalSpeed = Math.hypot(
    velocity.x,
    velocity.z
  );

  const walkingAmount = THREE.MathUtils.clamp(
    horizontalSpeed / WALK_SPEED,
    0,
    1
  );

  walkingTime +=
    deltaTime *
    horizontalSpeed *
    2.15;

  const targetBobY =
    Math.sin(walkingTime * 2) *
    0.025 *
    walkingAmount;

  const targetBobX =
    Math.cos(walkingTime) *
    0.014 *
    walkingAmount;

  const blend =
    1 - Math.exp(-12 * deltaTime);

  camera.position.y = THREE.MathUtils.lerp(
    camera.position.y,
    PLAYER_HEIGHT + targetBobY,
    blend
  );

  camera.position.x = THREE.MathUtils.lerp(
    camera.position.x,
    targetBobX,
    blend
  );
}

/* -------------------------------------------------------
   GAME LOOP
------------------------------------------------------- */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(
    clock.getDelta(),
    0.033
  );

  player.rotation.y = yaw;
  pitchPivot.rotation.x = pitch;

  updateMovement(deltaTime);
  updateWalkingBob(deltaTime);

  renderer.render(scene, camera);
}

animate();

/* -------------------------------------------------------
   RESIZE
------------------------------------------------------- */

window.addEventListener("resize", () => {
  camera.aspect =
    window.innerWidth /
    window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});

/* -------------------------------------------------------
   SERVICE WORKER
------------------------------------------------------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => {
        console.error(
          "Service worker error:",
          error
        );
      });
  });
}

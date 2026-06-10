import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

/* =========================================================
   FILES
========================================================= */

const FILES = {
  sky: "./textures/qwantani_dusk_2_puresky_1k.exr",

  grass: [
    "./textures/aerial_grass_rock_diff_1k.jpg",
    "./textures/aerial_grass_rock_diff_1k.png",
    "./textures/aerial_grass_rock_diff_1k.jpeg",
    "./textures/aerial_grass_rock_diff_1k.webp"
  ],

  concrete: [
    "./textures/concrete_floor_worn_001_diff_1k.jpg",
    "./textures/concrete_floor_worn_001_diff_1k.png",
    "./textures/concrete_floor_worn_001_diff_1k.jpeg",
    "./textures/concrete_floor_worn_001_diff_1k.webp"
  ],

  house: "./models/Bambo_House.obj",
  bottle: "./models/Corona.obj",
  bottleTexture: "./textures/BotellaText.jpg",

  footsteps:
    "./sound/soundreality-footsteps-walking-boots-parquet-1-420135.mp3",

  drink:
    "./sound/nahtt-drink-323882.mp3"
};

/* =========================================================
   SETTINGS
========================================================= */

const PLAYER_HEIGHT = 2.3;
const PLAYER_RADIUS = 0.48;

const BASE_WIDTH = 72;
const BASE_LENGTH = 96;

const WALK_SPEED = 5.2;
const ACCELERATION = 12;
const DECELERATION = 15;

const MOUSE_SENSITIVITY = 0.002;
const TOUCH_SENSITIVITY = 0.0043;

const HOUSE_LEFT_X = -23;
const HOUSE_RIGHT_X = 23;

const HOUSE_Z_POSITIONS = [-30, 0, 30];

const HOUSE_LEFT_ROTATION = Math.PI / 2;
const HOUSE_RIGHT_ROTATION = -Math.PI / 2;

const SIDEWALK_LEFT_X = -8;
const SIDEWALK_RIGHT_X = 8;
const SIDEWALK_WIDTH = 4.3;

const DRINK_DURATION = 4;

/* =========================================================
   HTML
========================================================= */

const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");

const desktopHint = document.getElementById("desktopHint");
const mobileHint = document.getElementById("mobileHint");

const joystick = document.getElementById("joystick");
const joystickStick = document.getElementById("joystickStick");
const lookZone = document.getElementById("lookZone");
const drinkButton = document.getElementById("drinkButton");

const isMobile =
  window.matchMedia("(pointer: coarse)").matches ||
  navigator.maxTouchPoints > 0;

let loadingHidden = false;

function setLoadingText(text) {
  if (loadingText) {
    loadingText.textContent = text;
  }
}

function hideLoadingScreen() {
  if (loadingHidden) {
    return;
  }

  loadingHidden = true;
  setLoadingText("Готово!");

  setTimeout(() => {
    loadingScreen?.classList.add("hidden");
  }, 250);

  setTimeout(() => {
    if (desktopHint) {
      desktopHint.style.opacity = "0";
    }

    if (mobileHint) {
      mobileHint.style.opacity = "0";
    }
  }, 6500);
}

/* =========================================================
   SCENE
========================================================= */

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x7895a8);
scene.fog = new THREE.Fog(0x7895a8, 75, 195);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 1.5)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

document.body.appendChild(renderer.domElement);

/* =========================================================
   PLAYER AND CAMERA
========================================================= */

const player = new THREE.Group();

player.position.set(0, 0, 40);
scene.add(player);

/*
  eyePivot знаходиться на висоті голови.
  Камера всередині нього має позицію 0,0,0.
  Завдяки цьому погляд униз не опускає голову в землю.
*/

const eyePivot = new THREE.Group();

eyePivot.position.set(0, PLAYER_HEIGHT, 0);
player.add(eyePivot);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.06,
  500
);

camera.position.set(0, 0, 0);
eyePivot.add(camera);

let yaw = 0;
let pitch = 0;

/* =========================================================
   LIGHTING
========================================================= */

const hemisphereLight = new THREE.HemisphereLight(
  0xd7ecff,
  0x343c2e,
  0.9
);

scene.add(hemisphereLight);

const sun = new THREE.DirectionalLight(
  0xffd6ab,
  2.25
);

sun.position.set(-42, 62, 36);
sun.castShadow = true;

sun.shadow.mapSize.set(2048, 2048);

sun.shadow.camera.near = 1;
sun.shadow.camera.far = 190;

sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;

sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.025;

sun.target.position.set(0, 0, 0);

scene.add(sun);
scene.add(sun.target);

const ambientLight = new THREE.AmbientLight(
  0x8fa6b6,
  0.12
);

scene.add(ambientLight);

/* =========================================================
   TEXTURE HELPERS
========================================================= */

const textureLoader = new THREE.TextureLoader();

async function loadFirstTexture(candidates) {
  for (const file of candidates) {
    try {
      const texture = await textureLoader.loadAsync(file);

      console.log("Texture loaded:", file);

      return texture;
    } catch (error) {
      console.warn("Texture not found:", file);
    }
  }

  throw new Error("No matching texture was found");
}

function prepareRepeatingTexture(
  texture,
  repeatX,
  repeatY
) {
  texture.colorSpace = THREE.SRGBColorSpace;

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  texture.repeat.set(repeatX, repeatY);

  texture.anisotropy =
    renderer.capabilities.getMaxAnisotropy();

  texture.needsUpdate = true;

  return texture;
}

/* =========================================================
   SKY
========================================================= */

async function loadSky() {
  const generator = new THREE.PMREMGenerator(renderer);

  generator.compileEquirectangularShader();

  try {
    const texture =
      await new EXRLoader().loadAsync(FILES.sky);

    texture.mapping =
      THREE.EquirectangularReflectionMapping;

    scene.background = texture;

    scene.environment =
      generator.fromEquirectangular(texture).texture;

    console.log("Sky loaded");
  } catch (error) {
    console.error("Sky error:", error);

    scene.background = new THREE.Color(0x7895a8);
  } finally {
    generator.dispose();
  }
}

/* =========================================================
   BASEPLATE
========================================================= */

const grassMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x68875b,
    roughness: 1,
    metalness: 0
  });

const baseplate = new THREE.Mesh(
  new THREE.BoxGeometry(
    BASE_WIDTH,
    1,
    BASE_LENGTH
  ),
  grassMaterial
);

baseplate.position.y = -0.5;

baseplate.receiveShadow = true;
baseplate.castShadow = false;

scene.add(baseplate);

async function loadGrass() {
  try {
    const texture =
      await loadFirstTexture(FILES.grass);

    prepareRepeatingTexture(
      texture,
      10,
      14
    );

    grassMaterial.map = texture;
    grassMaterial.color.set(0xffffff);
    grassMaterial.needsUpdate = true;

    console.log("Grass loaded");
  } catch (error) {
    console.error("Grass error:", error);
  }
}

/* =========================================================
   SIDEWALKS
========================================================= */

const concreteMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xb9b9b9,
    roughness: 0.97,
    metalness: 0
  });

function createSidewalk(x) {
  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(
      SIDEWALK_WIDTH,
      0.18,
      BASE_LENGTH - 5
    ),
    concreteMaterial
  );

  sidewalk.position.set(x, 0.09, 0);

  sidewalk.castShadow = true;
  sidewalk.receiveShadow = true;

  scene.add(sidewalk);
}

createSidewalk(SIDEWALK_LEFT_X);
createSidewalk(SIDEWALK_RIGHT_X);

async function loadConcrete() {
  try {
    const texture =
      await loadFirstTexture(FILES.concrete);

    prepareRepeatingTexture(
      texture,
      1.4,
      20
    );

    concreteMaterial.map = texture;
    concreteMaterial.color.set(0xffffff);
    concreteMaterial.needsUpdate = true;

    console.log("Concrete loaded");
  } catch (error) {
    console.error("Concrete error:", error);
  }
}

/* =========================================================
   COLLISION
========================================================= */

const staticColliders = [];

function addColliderFromObject(object) {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(
    object,
    true
  );

  /*
    Трохи зменшуємо collider,
    щоб край даху не блокував гравця.
  */

  const shrink = 0.45;

  if (box.max.x - box.min.x > shrink * 2) {
    box.min.x += shrink;
    box.max.x -= shrink;
  }

  if (box.max.z - box.min.z > shrink * 2) {
    box.min.z += shrink;
    box.max.z -= shrink;
  }

  staticColliders.push(box.clone());
}

function playerCollidesAt(x, z) {
  for (const box of staticColliders) {
    const closestX = THREE.MathUtils.clamp(
      x,
      box.min.x,
      box.max.x
    );

    const closestZ = THREE.MathUtils.clamp(
      z,
      box.min.z,
      box.max.z
    );

    const dx = x - closestX;
    const dz = z - closestZ;

    if (
      dx * dx + dz * dz <
      PLAYER_RADIUS * PLAYER_RADIUS
    ) {
      return true;
    }
  }

  return false;
}

/* =========================================================
   MODEL HELPERS
========================================================= */

function enableShadows(
  object,
  material = null
) {
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    if (material) {
      child.material = material;
    }

    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function scaleHorizontal(
  object,
  targetSize
) {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(
    object,
    true
  );

  const size = new THREE.Vector3();

  box.getSize(size);

  const currentSize = Math.max(
    size.x,
    size.z
  );

  if (currentSize > 0) {
    object.scale.multiplyScalar(
      targetSize / currentSize
    );
  }

  object.updateMatrixWorld(true);
}

function centerAndGround(object) {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(
    object,
    true
  );

  const center = new THREE.Vector3();

  box.getCenter(center);

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;

  object.updateMatrixWorld(true);
}

/* =========================================================
   HOUSES
========================================================= */

const houseMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xa89f90,
    roughness: 0.82,
    metalness: 0.02
  });

async function createHouses() {
  try {
    const loadedHouse =
      await new OBJLoader().loadAsync(
        FILES.house
      );

    enableShadows(
      loadedHouse,
      houseMaterial
    );

    scaleHorizontal(
      loadedHouse,
      15
    );

    centerAndGround(loadedHouse);

    const template = new THREE.Group();

    template.add(loadedHouse);

    function placeHouse(
      x,
      z,
      rotationY
    ) {
      const copy = template.clone(true);

      copy.position.set(x, 0, z);
      copy.rotation.y = rotationY;

      scene.add(copy);

      copy.updateMatrixWorld(true);

      addColliderFromObject(copy);
    }

    for (const z of HOUSE_Z_POSITIONS) {
      placeHouse(
        HOUSE_LEFT_X,
        z,
        HOUSE_LEFT_ROTATION
      );

      placeHouse(
        HOUSE_RIGHT_X,
        z,
        HOUSE_RIGHT_ROTATION
      );
    }

    console.log("Houses loaded");
  } catch (error) {
    console.error("House error:", error);
  }
}

/* =========================================================
   CORONA BOTTLE
========================================================= */

const bottleRoot = new THREE.Group();
camera.add(bottleRoot);

const bottleModelPivot =
  new THREE.Group();

bottleRoot.add(bottleModelPivot);

/*
  Положення пляшки у руці.
*/

const bottleBasePosition =
  new THREE.Vector3(
    0.39,
    -0.5,
    -0.72
  );

const bottleBaseEuler =
  new THREE.Euler(
    0.08,
    -0.18,
    0.08,
    "XYZ"
  );

/*
  Положення пляшки під час пиття.
*/

const bottleDrinkPosition =
  new THREE.Vector3(
    0.08,
    -0.08,
    -0.32
  );

const bottleDrinkEuler =
  new THREE.Euler(
    1.08,
    -0.08,
    -0.28,
    "XYZ"
  );

const bottleBaseQuaternion =
  new THREE.Quaternion().setFromEuler(
    bottleBaseEuler
  );

const bottleDrinkQuaternion =
  new THREE.Quaternion().setFromEuler(
    bottleDrinkEuler
  );

bottleRoot.position.copy(
  bottleBasePosition
);

bottleRoot.quaternion.copy(
  bottleBaseQuaternion
);

bottleRoot.visible = false;

let bottleLoaded = false;

async function loadBottle() {
  try {
    let bottleMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xd7a644,
        roughness: 0.38,
        metalness: 0.03,
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide
      });

    try {
      const texture =
        await textureLoader.loadAsync(
          FILES.bottleTexture
        );

      texture.colorSpace =
        THREE.SRGBColorSpace;

      texture.anisotropy =
        renderer.capabilities
          .getMaxAnisotropy();

      bottleMaterial =
        new THREE.MeshStandardMaterial({
          map: texture,
          color: 0xffffff,
          roughness: 0.38,
          metalness: 0.03,
          transparent: true,
          opacity: 0.96,
          side: THREE.DoubleSide
        });
    } catch (error) {
      console.warn(
        "Bottle texture error:",
        error
      );
    }

    const bottle =
      await new OBJLoader().loadAsync(
        FILES.bottle
      );

    bottle.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.material = bottleMaterial;

      child.castShadow = false;
      child.receiveShadow = false;
    });

    bottle.updateMatrixWorld(true);

    let box = new THREE.Box3().setFromObject(
      bottle,
      true
    );

    let size = new THREE.Vector3();

    box.getSize(size);

    const largestSide = Math.max(
      size.x,
      size.y,
      size.z
    );

    if (largestSide > 0) {
      bottle.scale.setScalar(
        0.58 / largestSide
      );
    }

    bottle.updateMatrixWorld(true);

    box = new THREE.Box3().setFromObject(
      bottle,
      true
    );

    size = new THREE.Vector3();
    box.getSize(size);

    const center = new THREE.Vector3();
    box.getCenter(center);

    bottle.position.set(
      -center.x,
      -center.y,
      -center.z
    );

    bottleModelPivot.rotation.set(
      0,
      0,
      0
    );

    /*
      Ставимо найдовшу сторону моделі вертикально.
    */

    if (
      size.x >= size.y &&
      size.x >= size.z
    ) {
      bottleModelPivot.rotation.z =
        Math.PI / 2;
    } else if (
      size.z >= size.x &&
      size.z >= size.y
    ) {
      bottleModelPivot.rotation.x =
        -Math.PI / 2;
    }

    bottleModelPivot.rotation.y +=
      Math.PI;

    bottleModelPivot.add(bottle);

    bottleRoot.visible = true;
    bottleLoaded = true;

    console.log("Corona bottle loaded");
  } catch (error) {
    console.error("Bottle error:", error);
  }
}

/* =========================================================
   AUDIO
========================================================= */

const footsteps = new Audio(
  FILES.footsteps
);

footsteps.loop = true;
footsteps.volume = 0.22;
footsteps.playbackRate = 0.96;
footsteps.preload = "auto";

const drinkSoundTemplate = new Audio(
  FILES.drink
);

drinkSoundTemplate.volume = 0.65;
drinkSoundTemplate.preload = "auto";

let audioUnlocked = false;

async function primeAudio(audio) {
  const oldVolume = audio.volume;

  audio.volume = 0;

  try {
    await audio.play();

    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    console.log(
      "Audio is waiting for interaction"
    );
  }

  audio.volume = oldVolume;
}

async function unlockAudio() {
  if (audioUnlocked) {
    return;
  }

  await Promise.allSettled([
    primeAudio(footsteps),
    primeAudio(drinkSoundTemplate)
  ]);

  audioUnlocked = true;
}

window.addEventListener(
  "pointerdown",
  unlockAudio,
  { once: true }
);

window.addEventListener(
  "keydown",
  unlockAudio,
  { once: true }
);

function playDrinkSound() {
  const sound =
    drinkSoundTemplate.cloneNode(true);

  sound.volume = 0.65;
  sound.currentTime = 0;

  sound.play().catch((error) => {
    console.warn(
      "Drink sound error:",
      error
    );
  });
}

function updateFootsteps(speed) {
  if (
    speed > 0.35 &&
    audioUnlocked
  ) {
    footsteps.playbackRate =
      0.9 +
      Math.min(
        speed / WALK_SPEED,
        1
      ) *
        0.12;

    if (footsteps.paused) {
      footsteps.play().catch(() => {});
    }
  } else if (!footsteps.paused) {
    footsteps.pause();
  }
}

/* =========================================================
   DRINK ANIMATION
========================================================= */

let drinking = false;
let drinkStart = 0;

const drinkTimers = [];

function smoothStep(value) {
  const x = THREE.MathUtils.clamp(
    value,
    0,
    1
  );

  return x * x * (3 - 2 * x);
}

function clearDrinkTimers() {
  while (drinkTimers.length > 0) {
    clearTimeout(drinkTimers.pop());
  }
}

function startDrinking() {
  if (
    drinking ||
    !bottleLoaded
  ) {
    return;
  }

  unlockAudio();

  drinking = true;

  drinkStart =
    performance.now() / 1000;

  clearDrinkTimers();

  /*
    Звук приблизно секундний,
    тому запускаємо його чотири рази.
  */

  for (let i = 0; i < 4; i++) {
    const timer = setTimeout(
      playDrinkSound,
      i * 1000
    );

    drinkTimers.push(timer);
  }
}

function updateDrinking() {
  if (!drinking) {
    return;
  }

  const now =
    performance.now() / 1000;

  const elapsed = now - drinkStart;

  let blend = 0;

  if (elapsed < 0.65) {
    blend = smoothStep(
      elapsed / 0.65
    );
  } else if (elapsed < 3.35) {
    blend = 1;
  } else if (
    elapsed < DRINK_DURATION
  ) {
    blend =
      1 -
      smoothStep(
        (elapsed - 3.35) / 0.65
      );
  } else {
    drinking = false;

    bottleRoot.position.copy(
      bottleBasePosition
    );

    bottleRoot.quaternion.copy(
      bottleBaseQuaternion
    );

    return;
  }

  bottleRoot.position.lerpVectors(
    bottleBasePosition,
    bottleDrinkPosition,
    blend
  );

  bottleRoot.quaternion.slerpQuaternions(
    bottleBaseQuaternion,
    bottleDrinkQuaternion,
    blend
  );

  if (
    elapsed >= 0.65 &&
    elapsed < 3.35
  ) {
    bottleRoot.position.y +=
      Math.sin(elapsed * 6) * 0.003;

    bottleRoot.position.x +=
      Math.sin(elapsed * 4) * 0.002;
  }
}

/* =========================================================
   DESKTOP INPUT
========================================================= */

const keys = new Set();

document.addEventListener(
  "keydown",
  (event) => {
    keys.add(event.code);
  }
);

document.addEventListener(
  "keyup",
  (event) => {
    keys.delete(event.code);
  }
);

renderer.domElement.addEventListener(
  "click",
  () => {
    if (isMobile) {
      return;
    }

    if (
      document.pointerLockElement !==
      renderer.domElement
    ) {
      renderer.domElement.requestPointerLock();
    }
  }
);

document.addEventListener(
  "mousemove",
  (event) => {
    if (isMobile) {
      return;
    }

    if (
      document.pointerLockElement !==
      renderer.domElement
    ) {
      return;
    }

    yaw -=
      event.movementX *
      MOUSE_SENSITIVITY;

    pitch -=
      event.movementY *
      MOUSE_SENSITIVITY;

    pitch = THREE.MathUtils.clamp(
      pitch,
      -Math.PI * 0.47,
      Math.PI * 0.47
    );
  }
);

document.addEventListener(
  "mousedown",
  (event) => {
    if (
      event.button !== 0 ||
      isMobile
    ) {
      return;
    }

    if (
      document.pointerLockElement ===
      renderer.domElement
    ) {
      startDrinking();
    }
  }
);

/* =========================================================
   MOBILE JOYSTICK
========================================================= */

const joystickInput =
  new THREE.Vector2();

let joystickPointerId = null;

function updateJoystick(
  clientX,
  clientY
) {
  if (
    !joystick ||
    !joystickStick
  ) {
    return;
  }

  const rect =
    joystick.getBoundingClientRect();

  const centerX =
    rect.left + rect.width / 2;

  const centerY =
    rect.top + rect.height / 2;

  let dx = clientX - centerX;
  let dy = clientY - centerY;

  const maxDistance = 38;

  const distance = Math.hypot(
    dx,
    dy
  );

  if (distance > maxDistance) {
    dx =
      (dx / distance) *
      maxDistance;

    dy =
      (dy / distance) *
      maxDistance;
  }

  joystickStick.style.transform =
    `translate(${dx}px, ${dy}px)`;

  joystickInput.x =
    dx / maxDistance;

  joystickInput.y =
    -dy / maxDistance;

  const deadZone = 0.08;

  if (
    Math.abs(joystickInput.x) <
    deadZone
  ) {
    joystickInput.x = 0;
  }

  if (
    Math.abs(joystickInput.y) <
    deadZone
  ) {
    joystickInput.y = 0;
  }
}

function resetJoystick() {
  joystickPointerId = null;

  joystickInput.set(0, 0);

  if (joystickStick) {
    joystickStick.style.transform =
      "translate(0, 0)";
  }
}

joystick?.addEventListener(
  "pointerdown",
  (event) => {
    if (
      joystickPointerId !== null
    ) {
      return;
    }

    event.preventDefault();

    joystickPointerId =
      event.pointerId;

    joystick.setPointerCapture(
      event.pointerId
    );

    updateJoystick(
      event.clientX,
      event.clientY
    );
  }
);

joystick?.addEventListener(
  "pointermove",
  (event) => {
    if (
      event.pointerId !==
      joystickPointerId
    ) {
      return;
    }

    event.preventDefault();

    updateJoystick(
      event.clientX,
      event.clientY
    );
  }
);

joystick?.addEventListener(
  "pointerup",
  (event) => {
    if (
      event.pointerId ===
      joystickPointerId
    ) {
      resetJoystick();
    }
  }
);

joystick?.addEventListener(
  "pointercancel",
  resetJoystick
);

/* =========================================================
   MOBILE CAMERA
========================================================= */

let lookPointerId = null;
let previousLookX = 0;
let previousLookY = 0;

function stopLooking() {
  lookPointerId = null;
}

lookZone?.addEventListener(
  "pointerdown",
  (event) => {
    if (lookPointerId !== null) {
      return;
    }

    event.preventDefault();

    lookPointerId =
      event.pointerId;

    previousLookX =
      event.clientX;

    previousLookY =
      event.clientY;

    lookZone.setPointerCapture(
      event.pointerId
    );
  }
);

lookZone?.addEventListener(
  "pointermove",
  (event) => {
    if (
      event.pointerId !==
      lookPointerId
    ) {
      return;
    }

    event.preventDefault();

    const dx =
      event.clientX -
      previousLookX;

    const dy =
      event.clientY -
      previousLookY;

    previousLookX =
      event.clientX;

    previousLookY =
      event.clientY;

    yaw -=
      dx *
      TOUCH_SENSITIVITY;

    pitch -=
      dy *
      TOUCH_SENSITIVITY;

    pitch = THREE.MathUtils.clamp(
      pitch,
      -Math.PI * 0.47,
      Math.PI * 0.47
    );
  }
);

lookZone?.addEventListener(
  "pointerup",
  (event) => {
    if (
      event.pointerId ===
      lookPointerId
    ) {
      stopLooking();
    }
  }
);

lookZone?.addEventListener(
  "pointercancel",
  stopLooking
);

drinkButton?.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    unlockAudio();
    startDrinking();
  }
);

/* =========================================================
   MOVEMENT
========================================================= */

const velocity =
  new THREE.Vector3();

const targetVelocity =
  new THREE.Vector3();

const movementDirection =
  new THREE.Vector3();

const forward =
  new THREE.Vector3();

const right =
  new THREE.Vector3();

let currentMovementSpeed = 0;

function getMovementInput() {
  let inputX = joystickInput.x;
  let inputY = joystickInput.y;

  if (
    keys.has("KeyW") ||
    keys.has("ArrowUp")
  ) {
    inputY += 1;
  }

  if (
    keys.has("KeyS") ||
    keys.has("ArrowDown")
  ) {
    inputY -= 1;
  }

  if (
    keys.has("KeyD") ||
    keys.has("ArrowRight")
  ) {
    inputX += 1;
  }

  if (
    keys.has("KeyA") ||
    keys.has("ArrowLeft")
  ) {
    inputX -= 1;
  }

  const length =
    Math.hypot(
      inputX,
      inputY
    );

  if (length > 1) {
    inputX /= length;
    inputY /= length;
  }

  return {
    inputX,
    inputY
  };
}

function movePlayerWithCollision(
  movement
) {
  const movementLength = Math.hypot(
    movement.x,
    movement.z
  );

  const steps = Math.max(
    1,
    Math.ceil(
      movementLength / 0.12
    )
  );

  const stepX =
    movement.x / steps;

  const stepZ =
    movement.z / steps;

  const limitX =
    BASE_WIDTH / 2 -
    PLAYER_RADIUS;

  const limitZ =
    BASE_LENGTH / 2 -
    PLAYER_RADIUS;

  for (
    let index = 0;
    index < steps;
    index++
  ) {
    const nextX =
      THREE.MathUtils.clamp(
        player.position.x +
          stepX,
        -limitX,
        limitX
      );

    if (
      !playerCollidesAt(
        nextX,
        player.position.z
      )
    ) {
      player.position.x =
        nextX;
    } else {
      velocity.x = 0;
    }

    const nextZ =
      THREE.MathUtils.clamp(
        player.position.z +
          stepZ,
        -limitZ,
        limitZ
      );

    if (
      !playerCollidesAt(
        player.position.x,
        nextZ
      )
    ) {
      player.position.z =
        nextZ;
    } else {
      velocity.z = 0;
    }
  }

  player.position.y = 0;
}

function updateMovement(
  deltaTime
) {
  const {
    inputX,
    inputY
  } = getMovementInput();

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

  movementDirection.addScaledVector(
    forward,
    inputY
  );

  movementDirection.addScaledVector(
    right,
    inputX
  );

  if (
    movementDirection.lengthSq() > 1
  ) {
    movementDirection.normalize();
  }

  const speedMultiplier =
    drinking ? 0.65 : 1;

  targetVelocity
    .copy(movementDirection)
    .multiplyScalar(
      WALK_SPEED *
      speedMultiplier
    );

  const hasInput =
    movementDirection.lengthSq() >
    0.001;

  const smoothing =
    hasInput
      ? ACCELERATION
      : DECELERATION;

  const blend =
    1 -
    Math.exp(
      -smoothing *
      deltaTime
    );

  velocity.lerp(
    targetVelocity,
    blend
  );

  const previousPosition =
    player.position.clone();

  const movement =
    velocity
      .clone()
      .multiplyScalar(deltaTime);

  movePlayerWithCollision(
    movement
  );

  const movedDistance =
    player.position.distanceTo(
      previousPosition
    );

  currentMovementSpeed =
    deltaTime > 0
      ? movedDistance /
        deltaTime
      : 0;

  updateFootsteps(
    currentMovementSpeed
  );
}

/* =========================================================
   WALKING BOB
========================================================= */

let walkingTime = 0;

function updateWalkingBob(
  deltaTime
) {
  const amount =
    THREE.MathUtils.clamp(
      currentMovementSpeed /
        WALK_SPEED,
      0,
      1
    );

  walkingTime +=
    deltaTime *
    currentMovementSpeed *
    2.1;

  const targetY =
    PLAYER_HEIGHT +
    Math.sin(
      walkingTime * 2
    ) *
      0.025 *
      amount;

  const targetX =
    Math.cos(walkingTime) *
    0.014 *
    amount;

  const blend =
    1 -
    Math.exp(
      -12 *
      deltaTime
    );

  eyePivot.position.y =
    THREE.MathUtils.lerp(
      eyePivot.position.y,
      targetY,
      blend
    );

  eyePivot.position.x =
    THREE.MathUtils.lerp(
      eyePivot.position.x,
      targetX,
      blend
    );
}

/* =========================================================
   SAFE LOADING
========================================================= */

async function safeLoad(name, task) {
  try {
    await task();

    console.log(
      `${name}: loaded`
    );
  } catch (error) {
    console.error(
      `${name}: failed`,
      error
    );
  }
}

function loadWorld() {
  setLoadingText(
    "Завантаження SoftStreer…"
  );

  /*
    Кожен ресурс завантажується окремо.
    Гра не чекає на проблемний файл.
  */

  safeLoad("Sky", loadSky);
  safeLoad("Grass", loadGrass);
  safeLoad("Concrete", loadConcrete);
  safeLoad("Houses", createHouses);
  safeLoad("Bottle", loadBottle);

  /*
    Відкриваємо сцену швидко.
    Моделі можуть з’явитися трохи пізніше.
  */

  setTimeout(
    hideLoadingScreen,
    1200
  );
}

loadWorld();

/*
  Додатковий аварійний захист.
*/

setTimeout(
  hideLoadingScreen,
  3000
);

/* =========================================================
   GAME LOOP
========================================================= */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(
    clock.getDelta(),
    0.033
  );

  player.rotation.y = yaw;
  eyePivot.rotation.x = pitch;

  updateMovement(deltaTime);
  updateWalkingBob(deltaTime);
  updateDrinking();

  renderer.render(
    scene,
    camera
  );
}

animate();

/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);

/*
  Service worker тут навмисно
  тимчасово не реєструється.
*/

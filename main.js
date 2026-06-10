import * as THREE from "three";

import { EXRLoader } from
  "three/addons/loaders/EXRLoader.js";

import { OBJLoader } from
  "three/addons/loaders/OBJLoader.js";

import { MTLLoader } from
  "three/addons/loaders/MTLLoader.js";

import { TDSLoader } from
  "three/addons/loaders/TDSLoader.js";

/* ======================================================
   FILES
====================================================== */

const SKYBOX_FILE =
  "./textures/qwantani_dusk_2_puresky_1k.exr";

const HOUSE_FOLDER = "./models/";
const HOUSE_OBJ_FILE = "Bambo_House.obj";
const HOUSE_MTL_FILE = "Bambo_House.mtl";

const BARRIER_FILE =
  "./models/barrier.3ds";

const FOOTSTEPS_FILE =
  "./sound/soundreality-footsteps-walking-boots-parquet-1-420135.mp3";

const GRASS_TEXTURES = [
  "./textures/aerial_grass_rock_diff_1k.jpg",
  "./textures/aerial_grass_rock_diff_1k.png",
  "./textures/aerial_grass_rock_diff_1k.jpeg",
  "./textures/aerial_grass_rock_diff_1k.webp"
];

const CONCRETE_TEXTURES = [
  "./textures/concrete_floor_worn_001_diff_1k.jpg",
  "./textures/concrete_floor_worn_001_diff_1k.png",
  "./textures/concrete_floor_worn_001_diff_1k.jpeg",
  "./textures/concrete_floor_worn_001_diff_1k.webp"
];

/* ======================================================
   WORLD SETTINGS
====================================================== */

const PLAYER_HEIGHT = 2.25;
const PLAYER_RADIUS = 0.48;

const BASE_WIDTH = 72;
const BASE_LENGTH = 96;

const WALK_SPEED = 5.2;
const ACCELERATION = 11;
const DECELERATION = 14;

const MOUSE_SENSITIVITY = 0.002;
const TOUCH_SENSITIVITY = 0.0045;

/*
  Будинки стоять у два ряди.
*/

const LEFT_HOUSE_X = -23;
const RIGHT_HOUSE_X = 23;

const HOUSE_Z_POSITIONS = [
  -30,
  0,
  30
];

/*
  Будинки повернуті фасадами
  до центральної частини карти.
*/

const LEFT_HOUSE_ROTATION =
  Math.PI / 2;

const RIGHT_HOUSE_ROTATION =
  -Math.PI / 2;

/*
  Два довгі тротуари.
*/

const LEFT_SIDEWALK_X = -8;
const RIGHT_SIDEWALK_X = 8;

const SIDEWALK_WIDTH = 4.3;

/*
  Паркани стоять на двох кінцях
  кожного тротуару.
*/

const BARRIER_Z_POSITIONS = [
  -44,
  44
];

const BARRIER_X_POSITIONS = [
  LEFT_SIDEWALK_X,
  RIGHT_SIDEWALK_X
];

/* ======================================================
   HTML
====================================================== */

const loadingScreen =
  document.getElementById("loadingScreen");

const loadingText =
  document.getElementById("loadingText");

const desktopHint =
  document.getElementById("desktopHint");

const mobileHint =
  document.getElementById("mobileHint");

const joystick =
  document.getElementById("joystick");

const joystickStick =
  document.getElementById("joystickStick");

const lookZone =
  document.getElementById("lookZone");

const isMobile =
  window.matchMedia("(pointer: coarse)").matches ||
  navigator.maxTouchPoints > 0;

function setLoadingText(text) {
  if (loadingText) {
    loadingText.textContent = text;
  }
}

function hideLoadingScreen() {
  setLoadingText("Готово");

  setTimeout(() => {
    loadingScreen?.classList.add("hidden");
  }, 350);

  setTimeout(() => {
    if (desktopHint) {
      desktopHint.style.opacity = "0";
    }

    if (mobileHint) {
      mobileHint.style.opacity = "0";
    }
  }, 6000);
}

/* ======================================================
   SCENE
====================================================== */

const scene = new THREE.Scene();

scene.background =
  new THREE.Color(0x7895a8);

scene.fog =
  new THREE.Fog(
    0x7895a8,
    75,
    190
  );

const renderer =
  new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    1.5
  )
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
  THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.toneMapping =
  THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.05;

document.body.appendChild(
  renderer.domElement
);

/* ======================================================
   PLAYER
====================================================== */

const player =
  new THREE.Group();

player.position.set(
  0,
  0,
  39
);

scene.add(player);

const pitchPivot =
  new THREE.Group();

player.add(pitchPivot);

const camera =
  new THREE.PerspectiveCamera(
    72,
    window.innerWidth /
      window.innerHeight,
    0.08,
    500
  );

camera.position.set(
  0,
  PLAYER_HEIGHT,
  0
);

pitchPivot.add(camera);

let yaw = 0;
let pitch = 0;

/* ======================================================
   STATIC COLLIDERS
====================================================== */

/*
  Тут зберігаються світові Box3
  будинків і парканів.
*/

const staticColliders = [];

/*
  Створює collider на основі
  справжнього розміру моделі.
*/

function addColliderFromObject(
  object,
  padding = 0.18
) {
  object.updateMatrixWorld(true);

  const box =
    new THREE.Box3()
      .setFromObject(
        object,
        true
      );

  /*
    Трохи збільшуємо collider,
    щоб камера не заходила в стіни.
  */

  box.min.x -= padding;
  box.min.z -= padding;

  box.max.x += padding;
  box.max.z += padding;

  staticColliders.push(box);
}

/*
  Перевірка circle-player проти Box3.
*/

function playerCollidesAt(x, z) {
  for (
    const box of staticColliders
  ) {
    const closestX =
      THREE.MathUtils.clamp(
        x,
        box.min.x,
        box.max.x
      );

    const closestZ =
      THREE.MathUtils.clamp(
        z,
        box.min.z,
        box.max.z
      );

    const dx =
      x - closestX;

    const dz =
      z - closestZ;

    const distanceSquared =
      dx * dx + dz * dz;

    if (
      distanceSquared <
      PLAYER_RADIUS * PLAYER_RADIUS
    ) {
      return true;
    }
  }

  return false;
}

/* ======================================================
   SKYBOX
====================================================== */

const pmremGenerator =
  new THREE.PMREMGenerator(
    renderer
  );

pmremGenerator
  .compileEquirectangularShader();

async function loadSkybox() {
  try {
    const loader =
      new EXRLoader();

    const texture =
      await loader.loadAsync(
        SKYBOX_FILE
      );

    texture.mapping =
      THREE.EquirectangularReflectionMapping;

    scene.background = texture;

    const environment =
      pmremGenerator
        .fromEquirectangular(
          texture
        )
        .texture;

    scene.environment =
      environment;

    pmremGenerator.dispose();

    console.log(
      "Skybox loaded"
    );
  } catch (error) {
    console.error(
      "Skybox error:",
      error
    );

    scene.background =
      new THREE.Color(0x7895a8);
  }
}

/* ======================================================
   LIGHTING
====================================================== */

const hemisphereLight =
  new THREE.HemisphereLight(
    0xd7ecff,
    0x343c2e,
    1.05
  );

scene.add(hemisphereLight);

const sun =
  new THREE.DirectionalLight(
    0xffd6ab,
    2.9
  );

sun.position.set(
  -42,
  62,
  36
);

sun.castShadow = true;

sun.shadow.mapSize.set(
  2048,
  2048
);

sun.shadow.camera.near = 1;
sun.shadow.camera.far = 190;

sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;

sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.025;

sun.target.position.set(
  0,
  0,
  0
);

scene.add(sun);
scene.add(sun.target);

const ambientLight =
  new THREE.AmbientLight(
    0x8fa6b6,
    0.17
  );

scene.add(ambientLight);

/* ======================================================
   TEXTURES
====================================================== */

const textureLoader =
  new THREE.TextureLoader();

async function loadFirstTexture(
  fileCandidates
) {
  for (
    const file of fileCandidates
  ) {
    try {
      const texture =
        await textureLoader.loadAsync(
          file
        );

      console.log(
        "Texture loaded:",
        file
      );

      return texture;
    } catch (error) {
      console.warn(
        "Texture not found:",
        file
      );
    }
  }

  throw new Error(
    "No texture candidate loaded"
  );
}

function prepareRepeatingTexture(
  texture,
  repeatX,
  repeatY
) {
  texture.colorSpace =
    THREE.SRGBColorSpace;

  texture.wrapS =
    THREE.RepeatWrapping;

  texture.wrapT =
    THREE.RepeatWrapping;

  texture.repeat.set(
    repeatX,
    repeatY
  );

  texture.anisotropy =
    renderer.capabilities
      .getMaxAnisotropy();

  texture.needsUpdate = true;

  return texture;
}

/* ======================================================
   BASEPLATE
====================================================== */

const grassMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x68875b,
    roughness: 1,
    metalness: 0
  });

const baseplate =
  new THREE.Mesh(
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

async function loadGrassTexture() {
  try {
    const texture =
      await loadFirstTexture(
        GRASS_TEXTURES
      );

    prepareRepeatingTexture(
      texture,
      9,
      12
    );

    grassMaterial.map =
      texture;

    grassMaterial.color.set(
      0xffffff
    );

    grassMaterial.needsUpdate =
      true;
  } catch (error) {
    console.error(
      "Grass texture error:",
      error
    );

    grassMaterial.color.set(
      0x68875b
    );
  }
}

/* ======================================================
   SIDEWALKS
====================================================== */

const concreteMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xb7b7b7,
    roughness: 0.97,
    metalness: 0
  });

function createSidewalk(x) {
  const sidewalk =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        SIDEWALK_WIDTH,
        0.18,
        BASE_LENGTH - 5
      ),
      concreteMaterial
    );

  sidewalk.position.set(
    x,
    0.09,
    0
  );

  sidewalk.castShadow = true;
  sidewalk.receiveShadow = true;

  scene.add(sidewalk);

  /*
    Тротуар не є collider:
    по ньому можна ходити.
  */

  return sidewalk;
}

createSidewalk(
  LEFT_SIDEWALK_X
);

createSidewalk(
  RIGHT_SIDEWALK_X
);

async function loadConcreteTexture() {
  try {
    const texture =
      await loadFirstTexture(
        CONCRETE_TEXTURES
      );

    prepareRepeatingTexture(
      texture,
      1.4,
      20
    );

    concreteMaterial.map =
      texture;

    concreteMaterial.color.set(
      0xffffff
    );

    concreteMaterial.needsUpdate =
      true;
  } catch (error) {
    console.error(
      "Concrete texture error:",
      error
    );
  }
}

/* ======================================================
   MODEL HELPERS
====================================================== */

function enableModelShadows(
  object,
  fallbackMaterial = null
) {
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    if (fallbackMaterial) {
      child.material =
        fallbackMaterial;
    }

    const materials =
      Array.isArray(
        child.material
      )
        ? child.material
        : [child.material];

    for (
      const material of materials
    ) {
      if (
        material?.map
      ) {
        material.map.colorSpace =
          THREE.SRGBColorSpace;

        material.map.needsUpdate =
          true;
      }

      if (material) {
        material.needsUpdate =
          true;
      }
    }

    child.castShadow = true;
    child.receiveShadow = true;
  });
}

/*
  Центрує модель і ставить
  її низ на рівень Y = 0.
*/

function centreAndGroundObject(
  object
) {
  object.updateMatrixWorld(true);

  let box =
    new THREE.Box3()
      .setFromObject(
        object,
        true
      );

  const center =
    new THREE.Vector3();

  box.getCenter(center);

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;

  object.updateMatrixWorld(true);

  return object;
}

/*
  Підганяє горизонтальний
  розмір моделі.
*/

function scaleHorizontalSize(
  object,
  targetSize
) {
  object.updateMatrixWorld(true);

  const box =
    new THREE.Box3()
      .setFromObject(
        object,
        true
      );

  const size =
    new THREE.Vector3();

  box.getSize(size);

  const horizontalSize =
    Math.max(
      size.x,
      size.z
    );

  if (horizontalSize > 0) {
    const scale =
      targetSize /
      horizontalSize;

    object.scale.multiplyScalar(
      scale
    );
  }

  object.updateMatrixWorld(true);

  return object;
}

/* ======================================================
   BAMBO HOUSE
====================================================== */

const houseFallbackMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xa89f90,
    roughness: 0.82,
    metalness: 0.02
  });

async function loadHouseObject() {
  /*
    Спочатку пробуємо завантажити
    MTL і справжні текстури.
  */

  try {
    const mtlLoader =
      new MTLLoader();

    mtlLoader.setPath(
      HOUSE_FOLDER
    );

    mtlLoader.setResourcePath(
      HOUSE_FOLDER
    );

    const materials =
      await mtlLoader.loadAsync(
        HOUSE_MTL_FILE
      );

    materials.preload();

    const objLoader =
      new OBJLoader();

    objLoader.setPath(
      HOUSE_FOLDER
    );

    objLoader.setMaterials(
      materials
    );

    const house =
      await objLoader.loadAsync(
        HOUSE_OBJ_FILE
      );

    enableModelShadows(
      house
    );

    console.log(
      "House OBJ + MTL loaded"
    );

    return house;
  } catch (mtlError) {
    /*
      Якщо MTL відсутній,
      завантажуємо OBJ
      з нейтральним матеріалом.
    */

    console.warn(
      "House MTL was not loaded. Using fallback material.",
      mtlError
    );

    const objLoader =
      new OBJLoader();

    objLoader.setPath(
      HOUSE_FOLDER
    );

    const house =
      await objLoader.loadAsync(
        HOUSE_OBJ_FILE
      );

    enableModelShadows(
      house,
      houseFallbackMaterial
    );

    return house;
  }
}

async function createHouseLayout() {
  try {
    const loadedHouse =
      await loadHouseObject();

    scaleHorizontalSize(
      loadedHouse,
      15
    );

    centreAndGroundObject(
      loadedHouse
    );

    const houseTemplate =
      new THREE.Group();

    houseTemplate.add(
      loadedHouse
    );

    function placeHouse(
      x,
      z,
      rotationY
    ) {
      const copy =
        houseTemplate.clone(true);

      copy.position.set(
        x,
        0,
        z
      );

      copy.rotation.y =
        rotationY;

      scene.add(copy);

      copy.updateMatrixWorld(true);

      /*
        Кожен будинок отримує
        окремий collider.
      */

      addColliderFromObject(
        copy,
        0.25
      );
    }

    for (
      const z of
      HOUSE_Z_POSITIONS
    ) {
      placeHouse(
        LEFT_HOUSE_X,
        z,
        LEFT_HOUSE_ROTATION
      );

      placeHouse(
        RIGHT_HOUSE_X,
        z,
        RIGHT_HOUSE_ROTATION
      );
    }

    console.log(
      "Six houses with collisions created"
    );
  } catch (error) {
    console.error(
      "House loading error:",
      error
    );
  }
}

/* ======================================================
   BARRIERS / MINI FENCES
====================================================== */

async function createBarriers() {
  try {
    const loader =
      new TDSLoader();

    /*
      Якщо barrier.3ds використовує
      текстури, поклади їх у models/.
    */

    loader.setResourcePath(
      "./models/"
    );

    const loadedBarrier =
      await loader.loadAsync(
        BARRIER_FILE
      );

    enableModelShadows(
      loadedBarrier
    );

    /*
      Якщо довга сторона моделі
      йде по Z, повертаємо її по X.
    */

    loadedBarrier
      .updateMatrixWorld(true);

    let barrierBox =
      new THREE.Box3()
        .setFromObject(
          loadedBarrier,
          true
        );

    const originalSize =
      new THREE.Vector3();

    barrierBox.getSize(
      originalSize
    );

    if (
      originalSize.z >
      originalSize.x
    ) {
      loadedBarrier.rotation.y =
        Math.PI / 2;

      loadedBarrier
        .updateMatrixWorld(true);
    }

    /*
      Ширина паркана приблизно
      дорівнює ширині тротуару.
    */

    scaleHorizontalSize(
      loadedBarrier,
      4.1
    );

    centreAndGroundObject(
      loadedBarrier
    );

    const barrierTemplate =
      new THREE.Group();

    barrierTemplate.add(
      loadedBarrier
    );

    function placeBarrier(
      x,
      z
    ) {
      const copy =
        barrierTemplate.clone(true);

      copy.position.set(
        x,
        0.18,
        z
      );

      scene.add(copy);

      copy.updateMatrixWorld(true);

      addColliderFromObject(
        copy,
        0.12
      );
    }

    /*
      Чотири паркани:
      верх і низ обох тротуарів.
    */

    for (
      const x of
      BARRIER_X_POSITIONS
    ) {
      for (
        const z of
        BARRIER_Z_POSITIONS
      ) {
        placeBarrier(
          x,
          z
        );
      }
    }

    console.log(
      "Four barriers with collisions created"
    );
  } catch (error) {
    console.error(
      "Barrier loading error:",
      error
    );
  }
}

/* ======================================================
   FOOTSTEPS
====================================================== */

const footsteps =
  new Audio(
    FOOTSTEPS_FILE
  );

footsteps.loop = true;
footsteps.volume = 0.24;
footsteps.playbackRate = 0.96;
footsteps.preload = "auto";

let footstepsUnlocked =
  false;

async function unlockFootsteps() {
  if (
    footstepsUnlocked
  ) {
    return;
  }

  try {
    const originalVolume =
      footsteps.volume;

    footsteps.volume = 0;

    await footsteps.play();

    footsteps.pause();
    footsteps.currentTime = 0;

    footsteps.volume =
      originalVolume;

    footstepsUnlocked = true;
  } catch (error) {
    console.log(
      "Footsteps are waiting for interaction"
    );
  }
}

window.addEventListener(
  "pointerdown",
  unlockFootsteps,
  { once: true }
);

window.addEventListener(
  "keydown",
  unlockFootsteps,
  { once: true }
);

function updateFootsteps(
  actualSpeed
) {
  const isWalking =
    actualSpeed > 0.35;

  if (
    isWalking &&
    footstepsUnlocked
  ) {
    footsteps.playbackRate =
      0.9 +
      Math.min(
        actualSpeed /
          WALK_SPEED,
        1
      ) * 0.12;

    if (
      footsteps.paused
    ) {
      footsteps
        .play()
        .catch(() => {});
    }
  } else if (
    !footsteps.paused
  ) {
    footsteps.pause();
    footsteps.currentTime = 0;
  }
}

/* ======================================================
   KEYBOARD
====================================================== */

const keys =
  new Set();

document.addEventListener(
  "keydown",
  (event) => {
    keys.add(
      event.code
    );
  }
);

document.addEventListener(
  "keyup",
  (event) => {
    keys.delete(
      event.code
    );
  }
);

/* ======================================================
   DESKTOP CAMERA
====================================================== */

renderer.domElement
  .addEventListener(
    "click",
    () => {
      if (isMobile) {
        return;
      }

      if (
        document.pointerLockElement !==
        renderer.domElement
      ) {
        renderer.domElement
          .requestPointerLock();
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

    pitch =
      THREE.MathUtils.clamp(
        pitch,
        -Math.PI * 0.47,
        Math.PI * 0.47
      );
  }
);

/* ======================================================
   MOBILE JOYSTICK
====================================================== */

const joystickInput =
  new THREE.Vector2();

let joystickPointerId =
  null;

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
    joystick
      .getBoundingClientRect();

  const centerX =
    rect.left +
    rect.width / 2;

  const centerY =
    rect.top +
    rect.height / 2;

  let dx =
    clientX - centerX;

  let dy =
    clientY - centerY;

  const maxDistance = 38;

  const distance =
    Math.hypot(
      dx,
      dy
    );

  if (
    distance >
    maxDistance
  ) {
    dx =
      dx /
      distance *
      maxDistance;

    dy =
      dy /
      distance *
      maxDistance;
  }

  joystickStick.style.transform =
    `translate(${dx}px, ${dy}px)`;

  joystickInput.x =
    dx /
    maxDistance;

  joystickInput.y =
    -dy /
    maxDistance;

  const deadZone = 0.08;

  if (
    Math.abs(
      joystickInput.x
    ) < deadZone
  ) {
    joystickInput.x = 0;
  }

  if (
    Math.abs(
      joystickInput.y
    ) < deadZone
  ) {
    joystickInput.y = 0;
  }
}

function resetJoystick() {
  joystickPointerId = null;

  joystickInput.set(
    0,
    0
  );

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

/* ======================================================
   MOBILE CAMERA
====================================================== */

let lookPointerId = null;

let previousLookX = 0;
let previousLookY = 0;

function stopLooking() {
  lookPointerId = null;
}

lookZone?.addEventListener(
  "pointerdown",
  (event) => {
    if (
      lookPointerId !== null
    ) {
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

    pitch =
      THREE.MathUtils.clamp(
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

/* ======================================================
   MOVEMENT
====================================================== */

const velocity =
  new THREE.Vector3();

const targetVelocity =
  new THREE.Vector3();

const forward =
  new THREE.Vector3();

const right =
  new THREE.Vector3();

const movementDirection =
  new THREE.Vector3();

let currentMovementSpeed = 0;

function getMovementInput() {
  let inputX =
    joystickInput.x;

  let inputY =
    joystickInput.y;

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

/*
  Рух окремо по X і Z забезпечує
  стабільне ковзання вздовж стін.
*/

function movePlayerWithCollision(
  movement
) {
  const limitX =
    BASE_WIDTH / 2 -
    PLAYER_RADIUS;

  const limitZ =
    BASE_LENGTH / 2 -
    PLAYER_RADIUS;

  const nextX =
    THREE.MathUtils.clamp(
      player.position.x +
        movement.x,
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
        movement.z,
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

  movementDirection.set(
    0,
    0,
    0
  );

  movementDirection
    .addScaledVector(
      forward,
      inputY
    );

  movementDirection
    .addScaledVector(
      right,
      inputX
    );

  if (
    movementDirection.lengthSq() >
    1
  ) {
    movementDirection.normalize();
  }

  targetVelocity
    .copy(
      movementDirection
    )
    .multiplyScalar(
      WALK_SPEED
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
      .multiplyScalar(
        deltaTime
      );

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

/* ======================================================
   WALKING BOB
====================================================== */

let walkingTime = 0;

function updateWalkingBob(
  deltaTime
) {
  const walkingAmount =
    THREE.MathUtils.clamp(
      currentMovementSpeed /
        WALK_SPEED,
      0,
      1
    );

  walkingTime +=
    deltaTime *
    currentMovementSpeed *
    2.15;

  const targetBobY =
    Math.sin(
      walkingTime * 2
    ) *
    0.025 *
    walkingAmount;

  const targetBobX =
    Math.cos(
      walkingTime
    ) *
    0.014 *
    walkingAmount;

  const blend =
    1 -
    Math.exp(
      -12 *
      deltaTime
    );

  camera.position.y =
    THREE.MathUtils.lerp(
      camera.position.y,
      PLAYER_HEIGHT +
        targetBobY,
      blend
    );

  camera.position.x =
    THREE.MathUtils.lerp(
      camera.position.x,
      targetBobX,
      blend
    );
}

/* ======================================================
   ASSET INITIALIZATION
====================================================== */

async function loadWorldAssets() {
  setLoadingText(
    "Завантаження світу..."
  );

  const results =
    await Promise.allSettled([
      loadSkybox(),
      loadGrassTexture(),
      loadConcreteTexture(),
      createHouseLayout(),
      createBarriers()
    ]);

  for (
    const result of results
  ) {
    if (
      result.status ===
      "rejected"
    ) {
      console.error(
        result.reason
      );
    }
  }

  hideLoadingScreen();
}

loadWorldAssets();

/* ======================================================
   GAME LOOP
====================================================== */

const clock =
  new THREE.Clock();

function animate() {
  requestAnimationFrame(
    animate
  );

  const deltaTime =
    Math.min(
      clock.getDelta(),
      0.033
    );

  player.rotation.y =
    yaw;

  pitchPivot.rotation.x =
    pitch;

  updateMovement(
    deltaTime
  );

  updateWalkingBob(
    deltaTime
  );

  renderer.render(
    scene,
    camera
  );
}

animate();

/* ======================================================
   RESIZE
====================================================== */

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera
      .updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);

/* ======================================================
   SERVICE WORKER
====================================================== */

if (
  "serviceWorker" in
  navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator
        .serviceWorker
        .register(
          "./service-worker.js"
        )
        .catch(
          (error) => {
            console.error(
              "Service worker error:",
              error
            );
          }
        );
    }
  );
}

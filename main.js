import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

/* =======================================================
   FILE PATHS
======================================================= */

const GRASS_TEXTURE_PATH =
  "./textures/10450_Rectangular_Grass_Patch_v1_Diffuse.jpg";

const CONCRETE_TEXTURE_PATH =
  "./textures/concrete_floor_worn_001_diff_1k.jpg";

const SKYBOX_PATH =
  "./textures/qwantani_dusk_2_puresky_1k.exr";

const BUILDING_PATH =
  "./models/building_04.obj";

const FOOTSTEPS_PATH =
  "./sound/soundreality-footsteps-walking-boots-parquet-1-420135.mp3";

/* =======================================================
   WORLD SETTINGS
======================================================= */

const PLAYER_HEIGHT = 2.25;
const PLAYER_RADIUS = 0.45;

const BASE_WIDTH = 72;
const BASE_LENGTH = 96;

const WALK_SPEED = 5.2;
const ACCELERATION = 11;
const DECELERATION = 14;

const MOUSE_SENSITIVITY = 0.002;
const TOUCH_SENSITIVITY = 0.0045;

/*
  Положення будинків за макетом:

  Ліва лінія:  x = -22
  Правa лінія: x = 22

  Три будинки:
  z = -30, 0, 30
*/

const LEFT_HOUSE_X = -22;
const RIGHT_HOUSE_X = 22;

const HOUSE_Z_POSITIONS = [-30, 0, 30];

/*
  Якщо будинки дивляться не в той бік,
  поміняй місцями ці два значення.
*/

const LEFT_HOUSE_ROTATION = Math.PI / 2;
const RIGHT_HOUSE_ROTATION = -Math.PI / 2;

const SIDEWALK_LEFT_X = -8;
const SIDEWALK_RIGHT_X = 8;

/* =======================================================
   HTML ELEMENTS
======================================================= */

const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");

const desktopHint = document.getElementById("desktopHint");
const mobileHint = document.getElementById("mobileHint");

const joystick = document.getElementById("joystick");
const joystickStick = document.getElementById("joystickStick");
const lookZone = document.getElementById("lookZone");

const isMobile =
  window.matchMedia("(pointer: coarse)").matches ||
  navigator.maxTouchPoints > 0;

/* =======================================================
   LOADING
======================================================= */

const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (_url, loaded, total) => {
  const percent = Math.round(
    (loaded / Math.max(total, 1)) * 100
  );

  loadingText.textContent =
    `Завантаження світу: ${percent}%`;
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

  loadingText.textContent =
    "Один із файлів не завантажився";
};

/* =======================================================
   SCENE
======================================================= */

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x7895a8);
scene.fog = new THREE.Fog(0x7895a8, 70, 185);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 1.5)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping =
  THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.05;

document.body.appendChild(renderer.domElement);

/* =======================================================
   PLAYER
======================================================= */

const player = new THREE.Group();
player.position.set(0, 0, 42);
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

/* =======================================================
   SKYBOX
======================================================= */

const pmremGenerator =
  new THREE.PMREMGenerator(renderer);

pmremGenerator.compileEquirectangularShader();

const exrLoader =
  new EXRLoader(loadingManager);

exrLoader.load(
  SKYBOX_PATH,

  (texture) => {
    texture.mapping =
      THREE.EquirectangularReflectionMapping;

    scene.background = texture;

    const environment =
      pmremGenerator
        .fromEquirectangular(texture)
        .texture;

    scene.environment = environment;

    pmremGenerator.dispose();
  },

  undefined,

  (error) => {
    console.error(
      "Помилка завантаження skybox:",
      error
    );

    scene.background =
      new THREE.Color(0x7895a8);
  }
);

/* =======================================================
   LIGHTING AND SHADOWS
======================================================= */

const hemisphereLight =
  new THREE.HemisphereLight(
    0xd3eaff,
    0x343a2d,
    1.1
  );

scene.add(hemisphereLight);

const sun =
  new THREE.DirectionalLight(
    0xffd8ad,
    2.8
  );

sun.position.set(-38, 58, 34);
sun.castShadow = true;

sun.shadow.mapSize.set(2048, 2048);

sun.shadow.camera.near = 1;
sun.shadow.camera.far = 180;

sun.shadow.camera.left = -58;
sun.shadow.camera.right = 58;
sun.shadow.camera.top = 58;
sun.shadow.camera.bottom = -58;

sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.025;

scene.add(sun);

/*
  Сонце направлене в центр кварталу.
*/

sun.target.position.set(0, 0, 0);
scene.add(sun.target);

const ambientLight =
  new THREE.AmbientLight(
    0x91a7b7,
    0.18
  );

scene.add(ambientLight);

/* =======================================================
   TEXTURE LOADER
======================================================= */

const textureLoader =
  new THREE.TextureLoader(loadingManager);

function prepareTexture(texture, repeatX, repeatY) {
  texture.colorSpace = THREE.SRGBColorSpace;

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  texture.repeat.set(repeatX, repeatY);

  texture.anisotropy =
    renderer.capabilities.getMaxAnisotropy();

  texture.needsUpdate = true;

  return texture;
}

/* =======================================================
   GRASS BASEPLATE
======================================================= */

const grassMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0
  });

textureLoader.load(
  GRASS_TEXTURE_PATH,

  (texture) => {
    prepareTexture(texture, 12, 16);

    grassMaterial.map = texture;
    grassMaterial.color.set(0xffffff);
    grassMaterial.needsUpdate = true;

    console.log("Grass texture loaded");
  },

  undefined,

  (error) => {
    console.error(
      "Не вдалося завантажити траву:",
      error
    );

    grassMaterial.color.set(0x668258);
  }
);

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

/* =======================================================
   SIDEWALK MATERIAL
======================================================= */

const concreteMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xc4c4c4,
    roughness: 0.95,
    metalness: 0
  });

textureLoader.load(
  CONCRETE_TEXTURE_PATH,

  (texture) => {
    prepareTexture(texture, 1.5, 22);

    concreteMaterial.map = texture;
    concreteMaterial.color.set(0xffffff);
    concreteMaterial.needsUpdate = true;

    console.log("Concrete texture loaded");
  },

  undefined,

  (error) => {
    console.error(
      "Не вдалося завантажити бетон:",
      error
    );
  }
);

/* =======================================================
   SIDEWALKS
======================================================= */

function createSidewalk(x) {
  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(
      4.3,
      0.18,
      BASE_LENGTH - 3
    ),

    concreteMaterial
  );

  /*
    Верх baseplate має висоту 0.
    Тротуар трохи піднятий над землею.
  */

  sidewalk.position.set(
    x,
    0.09,
    0
  );

  sidewalk.castShadow = true;
  sidewalk.receiveShadow = true;

  scene.add(sidewalk);

  return sidewalk;
}

createSidewalk(SIDEWALK_LEFT_X);
createSidewalk(SIDEWALK_RIGHT_X);

/* =======================================================
   BUILDINGS
======================================================= */

const buildingMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xaaa397,
    roughness: 0.8,
    metalness: 0.02
  });

const objLoader =
  new OBJLoader(loadingManager);

objLoader.load(
  BUILDING_PATH,

  (loadedBuilding) => {
    loadedBuilding.traverse((child) => {
      if (!child.isMesh) return;

      child.material = buildingMaterial;

      /*
        Саме ці дві властивості
        створюють тіні будинку.
      */

      child.castShadow = true;
      child.receiveShadow = true;
    });

    /*
      Визначаємо початковий розмір.
    */

    const originalBox =
      new THREE.Box3()
        .setFromObject(loadedBuilding);

    const originalSize =
      new THREE.Vector3();

    originalBox.getSize(originalSize);

    /*
      Масштабуємо модель за найбільшою
      горизонтальною стороною.

      Орієнтовна ширина одного будинку:
      15 одиниць.
    */

    const horizontalSize = Math.max(
      originalSize.x,
      originalSize.z
    );

    if (horizontalSize > 0) {
      const modelScale =
        15 / horizontalSize;

      loadedBuilding.scale.setScalar(
        modelScale
      );
    }

    loadedBuilding.updateMatrixWorld(true);

    /*
      Після масштабування повторно
      визначаємо центр і низ будинку.
    */

    const scaledBox =
      new THREE.Box3()
        .setFromObject(loadedBuilding);

    const scaledCenter =
      new THREE.Vector3();

    scaledBox.getCenter(scaledCenter);

    /*
      Створюємо контейнер-шаблон.
      Сама модель центрується всередині.
    */

    const buildingTemplate =
      new THREE.Group();

    loadedBuilding.position.set(
      -scaledCenter.x,
      -scaledBox.min.y,
      -scaledCenter.z
    );

    buildingTemplate.add(
      loadedBuilding
    );

    /*
      Створення копії будинку.
    */

    function placeBuilding(
      x,
      z,
      rotationY
    ) {
      const buildingCopy =
        buildingTemplate.clone(true);

      buildingCopy.position.set(
        x,
        0,
        z
      );

      buildingCopy.rotation.y =
        rotationY;

      scene.add(buildingCopy);
    }

    /*
      Три будинки зліва.
    */

    for (
      const z of HOUSE_Z_POSITIONS
    ) {
      placeBuilding(
        LEFT_HOUSE_X,
        z,
        LEFT_HOUSE_ROTATION
      );
    }

    /*
      Три будинки справа.
    */

    for (
      const z of HOUSE_Z_POSITIONS
    ) {
      placeBuilding(
        RIGHT_HOUSE_X,
        z,
        RIGHT_HOUSE_ROTATION
      );
    }

    console.log(
      "Six buildings created"
    );
  },

  undefined,

  (error) => {
    console.error(
      "Помилка building_04.obj:",
      error
    );
  }
);

/* =======================================================
   FOOTSTEP SOUND
======================================================= */

const footsteps =
  new Audio(FOOTSTEPS_PATH);

footsteps.loop = true;
footsteps.volume = 0.24;
footsteps.playbackRate = 0.96;
footsteps.preload = "auto";

let footstepsUnlocked = false;

/*
  Браузер не дозволяє звук до першого
  натискання користувача.

  Перший клік або дотик розблоковує звук.
*/

async function unlockFootsteps() {
  if (footstepsUnlocked) return;

  try {
    const savedVolume =
      footsteps.volume;

    footsteps.volume = 0;

    await footsteps.play();

    footsteps.pause();
    footsteps.currentTime = 0;

    footsteps.volume =
      savedVolume;

    footstepsUnlocked = true;
  } catch (error) {
    console.log(
      "Sound is waiting for interaction"
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

function updateFootsteps(speed) {
  const walking =
    speed > 0.35;

  if (
    walking &&
    footstepsUnlocked
  ) {
    footsteps.playbackRate =
      0.9 +
      Math.min(speed / WALK_SPEED, 1) *
      0.12;

    if (footsteps.paused) {
      footsteps
        .play()
        .catch(() => {});
    }
  } else {
    if (!footsteps.paused) {
      footsteps.pause();
      footsteps.currentTime = 0;
    }
  }
}

/* =======================================================
   KEYBOARD
======================================================= */

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

/* =======================================================
   DESKTOP CAMERA
======================================================= */

renderer.domElement.addEventListener(
  "click",
  () => {
    if (isMobile) return;

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
    if (isMobile) return;

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

/* =======================================================
   MOBILE JOYSTICK
======================================================= */

const joystickInput =
  new THREE.Vector2();

let joystickPointerId = null;

function updateJoystick(
  clientX,
  clientY
) {
  const rect =
    joystick.getBoundingClientRect();

  const centerX =
    rect.left + rect.width / 2;

  const centerY =
    rect.top + rect.height / 2;

  let dx = clientX - centerX;
  let dy = clientY - centerY;

  const maxDistance = 38;
  const distance =
    Math.hypot(dx, dy);

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

  joystickStick.style.transform =
    "translate(0, 0)";
}

joystick.addEventListener(
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

joystick.addEventListener(
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

joystick.addEventListener(
  "pointerup",
  (event) => {
    if (
      event.pointerId !==
      joystickPointerId
    ) {
      return;
    }

    resetJoystick();
  }
);

joystick.addEventListener(
  "pointercancel",
  resetJoystick
);

/* =======================================================
   MOBILE CAMERA
======================================================= */

let lookPointerId = null;
let previousLookX = 0;
let previousLookY = 0;

function stopLooking() {
  lookPointerId = null;
}

lookZone.addEventListener(
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

lookZone.addEventListener(
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
      dx * TOUCH_SENSITIVITY;

    pitch -=
      dy * TOUCH_SENSITIVITY;

    pitch = THREE.MathUtils.clamp(
      pitch,
      -Math.PI * 0.47,
      Math.PI * 0.47
    );
  }
);

lookZone.addEventListener(
  "pointerup",
  (event) => {
    if (
      event.pointerId !==
      lookPointerId
    ) {
      return;
    }

    stopLooking();
  }
);

lookZone.addEventListener(
  "pointercancel",
  stopLooking
);

/* =======================================================
   MOVEMENT
======================================================= */

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
    Math.hypot(inputX, inputY);

  if (length > 1) {
    inputX /= length;
    inputY /= length;
  }

  return {
    inputX,
    inputY
  };
}

function updateMovement(deltaTime) {
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
    .copy(movementDirection)
    .multiplyScalar(WALK_SPEED);

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
      -smoothing * deltaTime
    );

  velocity.lerp(
    targetVelocity,
    blend
  );

  player.position
    .addScaledVector(
      velocity,
      deltaTime
    );

  /*
    Стабільна колізія з краями baseplate.
  */

  const limitX =
    BASE_WIDTH / 2 -
    PLAYER_RADIUS;

  const limitZ =
    BASE_LENGTH / 2 -
    PLAYER_RADIUS;

  player.position.x =
    THREE.MathUtils.clamp(
      player.position.x,
      -limitX,
      limitX
    );

  player.position.z =
    THREE.MathUtils.clamp(
      player.position.z,
      -limitZ,
      limitZ
    );

  player.position.y = 0;

  const horizontalSpeed =
    Math.hypot(
      velocity.x,
      velocity.z
    );

  updateFootsteps(
    horizontalSpeed
  );
}

/* =======================================================
   WALKING BOB
======================================================= */

let walkingTime = 0;

function updateWalkingBob(deltaTime) {
  const horizontalSpeed =
    Math.hypot(
      velocity.x,
      velocity.z
    );

  const walkingAmount =
    THREE.MathUtils.clamp(
      horizontalSpeed /
      WALK_SPEED,
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
    1 -
    Math.exp(
      -12 * deltaTime
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

/* =======================================================
   GAME LOOP
======================================================= */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime =
    Math.min(
      clock.getDelta(),
      0.033
    );

  player.rotation.y = yaw;
  pitchPivot.rotation.x = pitch;

  updateMovement(deltaTime);
  updateWalkingBob(deltaTime);

  renderer.render(
    scene,
    camera
  );
}

animate();

/* =======================================================
   WINDOW RESIZE
======================================================= */

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

/* =======================================================
   SERVICE WORKER
======================================================= */

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register(
          "./service-worker.js"
        )
        .catch((error) => {
          console.error(
            "Service worker error:",
            error
          );
        });
    }
  );
}

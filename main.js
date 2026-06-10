### `main.js`

```js
import * as THREE from "three";

import {
  EXRLoader
} from "three/addons/loaders/EXRLoader.js";

import {
  OBJLoader
} from "three/addons/loaders/OBJLoader.js";

import {
  MTLLoader
} from "three/addons/loaders/MTLLoader.js";

/* =====================================================
   FILES
===================================================== */

const SKYBOX_FILE =
  "./textures/qwantani_dusk_2_puresky_1k.exr";

const HOUSE_FOLDER =
  "./models/";

const HOUSE_OBJ_FILE =
  "Bambo_House.obj";

const HOUSE_MTL_FILE =
  "Bambo_House.mtl";

const BOTTLE_MODEL_FILE =
  "./models/Corona.obj";

const BOTTLE_TEXTURE_FILE =
  "./textures/BotellaText.jpg";

const FOOTSTEPS_FILE =
  "./sound/soundreality-footsteps-walking-boots-parquet-1-420135.mp3";

const DRINK_SOUND_FILE =
  "./sound/nahtt-drink-323882.mp3";

/*
  Код перевірить різні розширення,
  якщо текстура збережена не як JPG.
*/

const GRASS_FILES = [
  "./textures/aerial_grass_rock_diff_1k.jpg",
  "./textures/aerial_grass_rock_diff_1k.png",
  "./textures/aerial_grass_rock_diff_1k.jpeg",
  "./textures/aerial_grass_rock_diff_1k.webp"
];

const CONCRETE_FILES = [
  "./textures/concrete_floor_worn_001_diff_1k.jpg",
  "./textures/concrete_floor_worn_001_diff_1k.png",
  "./textures/concrete_floor_worn_001_diff_1k.jpeg",
  "./textures/concrete_floor_worn_001_diff_1k.webp"
];

/* =====================================================
   SETTINGS
===================================================== */

const PLAYER_HEIGHT = 2.3;
const PLAYER_RADIUS = 0.48;

const BASE_WIDTH = 72;
const BASE_LENGTH = 96;

const WALK_SPEED = 5.25;
const ACCELERATION = 12;
const DECELERATION = 15;

const MOUSE_SENSITIVITY = 0.002;
const TOUCH_SENSITIVITY = 0.0043;

/*
  Розташування будинків.
*/

const HOUSE_LEFT_X = -23;
const HOUSE_RIGHT_X = 23;

const HOUSE_Z_POSITIONS = [
  -30,
  0,
  30
];

const HOUSE_LEFT_ROTATION =
  Math.PI / 2;

const HOUSE_RIGHT_ROTATION =
  -Math.PI / 2;

/*
  Тротуари.
*/

const SIDEWALK_LEFT_X = -8;
const SIDEWALK_RIGHT_X = 8;

const SIDEWALK_WIDTH = 4.3;

/*
  Положення пляшки.

  Якщо пляшка дивиться не в той бік,
  можна змінювати ці три rotation.
*/

const BOTTLE_BASE_POSITION =
  new THREE.Vector3(
    0.43,
    -0.52,
    -0.82
  );

const BOTTLE_BASE_ROTATION =
  new THREE.Euler(
    0.15,
    0.18,
    -0.15,
    "XYZ"
  );

const BOTTLE_DRINK_POSITION =
  new THREE.Vector3(
    0.08,
    -0.07,
    -0.34
  );

const BOTTLE_DRINK_ROTATION =
  new THREE.Euler(
    1.22,
    0.18,
    0.08,
    "XYZ"
  );

const DRINK_DURATION = 4;

/* =====================================================
   HTML
===================================================== */

const loadingScreen =
  document.getElementById(
    "loadingScreen"
  );

const loadingText =
  document.getElementById(
    "loadingText"
  );

const desktopHint =
  document.getElementById(
    "desktopHint"
  );

const mobileHint =
  document.getElementById(
    "mobileHint"
  );

const joystick =
  document.getElementById(
    "joystick"
  );

const joystickStick =
  document.getElementById(
    "joystickStick"
  );

const lookZone =
  document.getElementById(
    "lookZone"
  );

const drinkButton =
  document.getElementById(
    "drinkButton"
  );

const isMobile =
  window.matchMedia(
    "(pointer: coarse)"
  ).matches ||
  navigator.maxTouchPoints > 0;

function setLoadingText(text) {
  if (loadingText) {
    loadingText.textContent = text;
  }
}

function hideLoadingScreen() {
  setLoadingText("Готово!");

  setTimeout(() => {
    loadingScreen?.classList.add(
      "hidden"
    );
  }, 350);

  setTimeout(() => {
    if (desktopHint) {
      desktopHint.style.opacity = "0";
    }

    if (mobileHint) {
      mobileHint.style.opacity = "0";
    }
  }, 6500);
}

/* =====================================================
   SCENE
===================================================== */

const scene =
  new THREE.Scene();

scene.background =
  new THREE.Color(0x7895a8);

scene.fog =
  new THREE.Fog(
    0x7895a8,
    75,
    195
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

/* =====================================================
   PLAYER AND CAMERA

   Висота знаходиться на eyePivot.
   Камера має позицію 0,0,0.
   Тому погляд униз більше не опускає
   голову на землю.
===================================================== */

const player =
  new THREE.Group();

player.position.set(
  0,
  0,
  40
);

scene.add(player);

const eyePivot =
  new THREE.Group();

eyePivot.position.set(
  0,
  PLAYER_HEIGHT,
  0
);

player.add(eyePivot);

const camera =
  new THREE.PerspectiveCamera(
    72,
    window.innerWidth /
      window.innerHeight,
    0.06,
    500
  );

camera.position.set(
  0,
  0,
  0
);

eyePivot.add(camera);

let yaw = 0;
let pitch = 0;

/* =====================================================
   STATIC COLLIDERS
===================================================== */

const staticColliders = [];

function addHouseCollider(
  object,
  padding = 0.15
) {
  object.updateMatrixWorld(true);

  const box =
    new THREE.Box3()
      .setFromObject(
        object,
        true
      );

  /*
    Трохи зменшуємо колізію,
    щоб дах не блокував гравця
    далеко від справжньої стіни.
  */

  const shrink = 0.3;

  if (
    box.max.x - box.min.x >
    shrink * 2
  ) {
    box.min.x += shrink;
    box.max.x -= shrink;
  }

  if (
    box.max.z - box.min.z >
    shrink * 2
  ) {
    box.min.z += shrink;
    box.max.z -= shrink;
  }

  box.min.x -= padding;
  box.max.x += padding;

  box.min.z -= padding;
  box.max.z += padding;

  staticColliders.push(box);
}

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

    if (
      dx * dx + dz * dz <
      PLAYER_RADIUS *
        PLAYER_RADIUS
    ) {
      return true;
    }
  }

  return false;
}

/* =====================================================
   SKYBOX
===================================================== */

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
  } catch (error) {
    console.error(
      "Skybox error:",
      error
    );

    scene.background =
      new THREE.Color(0x7895a8);
  }
}

/* =====================================================
   LIGHTS
===================================================== */

const hemisphereLight =
  new THREE.HemisphereLight(
    0xd7ecff,
    0x343c2e,
    1.05
  );

scene.add(
  hemisphereLight
);

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

scene.add(
  ambientLight
);

/* =====================================================
   TEXTURE HELPERS
===================================================== */

const textureLoader =
  new THREE.TextureLoader();

async function loadFirstTexture(
  candidates
) {
  for (
    const file of candidates
  ) {
    try {
      const texture =
        await textureLoader
          .loadAsync(file);

      console.log(
        "Texture loaded:",
        file
      );

      return texture;
    } catch {
      console.warn(
        "Texture not found:",
        file
      );
    }
  }

  throw new Error(
    "No texture file was found"
  );
}

function prepareTexture(
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

/* =====================================================
   BASEPLATE
===================================================== */

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

async function loadGrass() {
  try {
    const texture =
      await loadFirstTexture(
        GRASS_FILES
      );

    prepareTexture(
      texture,
      10,
      14
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
      "Grass error:",
      error
    );
  }
}

/* =====================================================
   SIDEWALKS
===================================================== */

const concreteMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xb9b9b9,
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
}

createSidewalk(
  SIDEWALK_LEFT_X
);

createSidewalk(
  SIDEWALK_RIGHT_X
);

async function loadConcrete() {
  try {
    const texture =
      await loadFirstTexture(
        CONCRETE_FILES
      );

    prepareTexture(
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
      "Concrete error:",
      error
    );
  }
}

/* =====================================================
   MODEL HELPERS
===================================================== */

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
      if (material?.map) {
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

function scaleHorizontal(
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

  const currentSize =
    Math.max(
      size.x,
      size.z
    );

  if (currentSize > 0) {
    object.scale.multiplyScalar(
      targetSize /
      currentSize
    );
  }

  object.updateMatrixWorld(true);
}

function centerAndGround(
  object
) {
  object.updateMatrixWorld(true);

  const box =
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
}

/* =====================================================
   BAMBO HOUSES
===================================================== */

const houseFallbackMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xa89f90,
    roughness: 0.82,
    metalness: 0.02
  });

async function loadHouse() {
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

    return house;
  } catch (error) {
    console.warn(
      "Bambo_House.mtl was not loaded.",
      error
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

async function createHouses() {
  try {
    const loadedHouse =
      await loadHouse();

    scaleHorizontal(
      loadedHouse,
      15
    );

    centerAndGround(
      loadedHouse
    );

    const template =
      new THREE.Group();

    template.add(
      loadedHouse
    );

    function placeHouse(
      x,
      z,
      rotationY
    ) {
      const copy =
        template.clone(true);

      copy.position.set(
        x,
        0,
        z
      );

      copy.rotation.y =
        rotationY;

      scene.add(copy);

      copy.updateMatrixWorld(true);

      addHouseCollider(
        copy
      );
    }

    for (
      const z of
      HOUSE_Z_POSITIONS
    ) {
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
  } catch (error) {
    console.error(
      "House error:",
      error
    );
  }
}

/* =====================================================
   CORONA BOTTLE TOOL
===================================================== */

const bottleRoot =
  new THREE.Group();

bottleRoot.position.copy(
  BOTTLE_BASE_POSITION
);

bottleRoot.rotation.copy(
  BOTTLE_BASE_ROTATION
);

camera.add(
  bottleRoot
);

let bottleLoaded = false;

async function loadBottle() {
  try {
    const bottleTexture =
      await textureLoader.loadAsync(
        BOTTLE_TEXTURE_FILE
      );

    bottleTexture.colorSpace =
      THREE.SRGBColorSpace;

    bottleTexture.anisotropy =
      renderer.capabilities
        .getMaxAnisotropy();

    const material =
      new THREE.MeshStandardMaterial({
        map: bottleTexture,
        color: 0xffffff,

        roughness: 0.42,
        metalness: 0.05,

        transparent: true,
        opacity: 0.96,

        side: THREE.DoubleSide
      });

    const loader =
      new OBJLoader();

    const bottle =
      await loader.loadAsync(
        BOTTLE_MODEL_FILE
      );

    bottle.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.material =
        material;

      child.castShadow = false;
      child.receiveShadow = false;
    });

    /*
      Автоматично робимо пляшку
      зручною за розміром.
    */

    bottle.updateMatrixWorld(true);

    let box =
      new THREE.Box3()
        .setFromObject(
          bottle,
          true
        );

    const size =
      new THREE.Vector3();

    box.getSize(size);

    const largestSide =
      Math.max(
        size.x,
        size.y,
        size.z
      );

    if (largestSide > 0) {
      bottle.scale.setScalar(
        0.82 /
        largestSide
      );
    }

    bottle.updateMatrixWorld(true);

    box =
      new THREE.Box3()
        .setFromObject(
          bottle,
          true
        );

    const center =
      new THREE.Vector3();

    box.getCenter(center);

    bottle.position.set(
      -center.x,
      -center.y,
      -center.z
    );

    bottleRoot.add(
      bottle
    );

    bottleLoaded = true;
  } catch (error) {
    console.error(
      "Corona bottle error:",
      error
    );
  }
}

/* =====================================================
   DRINK ANIMATION
===================================================== */

let drinking = false;
let drinkStartTime = 0;

const drinkSoundTimers = [];

function smooth01(value) {
  const x =
    THREE.MathUtils.clamp(
      value,
      0,
      1
    );

  return (
    x *
    x *
    (3 - 2 * x)
  );
}

function playDrinkSound() {
  const sound =
    new Audio(
      DRINK_SOUND_FILE
    );

  sound.volume = 0.62;

  sound.play()
    .catch(() => {});
}

function clearDrinkTimers() {
  while (
    drinkSoundTimers.length > 0
  ) {
    clearTimeout(
      drinkSoundTimers.pop()
    );
  }
}

function startDrinking() {
  if (
    drinking ||
    !bottleLoaded
  ) {
    return;
  }

  drinking = true;

  drinkStartTime =
    performance.now() /
    1000;

  clearDrinkTimers();

  for (
    let i = 0;
    i < 4;
    i++
  ) {
    const timer =
      setTimeout(
        playDrinkSound,
        i * 1000
      );

    drinkSoundTimers.push(
      timer
    );
  }
}

function updateDrinkAnimation() {
  if (!drinking) {
    return;
  }

  const now =
    performance.now() /
    1000;

  const elapsed =
    now - drinkStartTime;

  let blend = 0;

  /*
    0.0–0.65:
    піднести пляшку.

    0.65–3.35:
    пити.

    3.35–4.0:
    повернути вниз.
  */

  if (elapsed < 0.65) {
    blend =
      smooth01(
        elapsed / 0.65
      );
  } else if (
    elapsed < 3.35
  ) {
    blend = 1;
  } else if (
    elapsed < DRINK_DURATION
  ) {
    blend =
      1 -
      smooth01(
        (elapsed - 3.35) /
        0.65
      );
  } else {
    drinking = false;

    bottleRoot.position.copy(
      BOTTLE_BASE_POSITION
    );

    bottleRoot.rotation.copy(
      BOTTLE_BASE_ROTATION
    );

    return;
  }

  bottleRoot.position
    .lerpVectors(
      BOTTLE_BASE_POSITION,
      BOTTLE_DRINK_POSITION,
      blend
    );

  bottleRoot.rotation.x =
    THREE.MathUtils.lerp(
      BOTTLE_BASE_ROTATION.x,
      BOTTLE_DRINK_ROTATION.x,
      blend
    );

  bottleRoot.rotation.y =
    THREE.MathUtils.lerp(
      BOTTLE_BASE_ROTATION.y,
      BOTTLE_DRINK_ROTATION.y,
      blend
    );

  bottleRoot.rotation.z =
    THREE.MathUtils.lerp(
      BOTTLE_BASE_ROTATION.z,
      BOTTLE_DRINK_ROTATION.z,
      blend
    );

  /*
    Легке смішне хитання
    під час пиття.
  */

  if (
    elapsed >= 0.65 &&
    elapsed < 3.35
  ) {
    bottleRoot.rotation.z +=
      Math.sin(
        elapsed * 8
      ) * 0.018;

    bottleRoot.position.y +=
      Math.sin(
        elapsed * 7
      ) * 0.008;
  }
}

/* =====================================================
   FOOTSTEPS
===================================================== */

const footsteps =
  new Audio(
    FOOTSTEPS_FILE
  );

footsteps.loop = true;
footsteps.volume = 0.22;
footsteps.playbackRate = 0.96;
footsteps.preload = "auto";

let audioUnlocked = false;

async function unlockAudio() {
  if (audioUnlocked) {
    return;
  }

  try {
    const oldVolume =
      footsteps.volume;

    footsteps.volume = 0;

    await footsteps.play();

    footsteps.pause();
    footsteps.currentTime = 0;

    footsteps.volume =
      oldVolume;

    audioUnlocked = true;
  } catch {
    console.log(
      "Audio is waiting for input"
    );
  }
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

function updateFootsteps(
  actualSpeed
) {
  const walking =
    actualSpeed > 0.35;

  if (
    walking &&
    audioUnlocked &&
    !drinking
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
      footsteps.play()
        .catch(() => {});
    }
  } else if (
    !footsteps.paused
  ) {
    footsteps.pause();
    footsteps.currentTime = 0;
  }
}

/* =====================================================
   DESKTOP INPUT
===================================================== */

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

/* =====================================================
   MOBILE JOYSTICK
===================================================== */

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

/* =====================================================
   MOBILE LOOK
===================================================== */

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

drinkButton?.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    unlockAudio();
    startDrinking();
  }
);

/* =====================================================
   MOVEMENT
===================================================== */

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

function movePlayerWithCollision(
  movement
) {
  const limitX =
    BASE_WIDTH / 2 -
    PLAYER_RADIUS;

  const limitZ =
    BASE_LENGTH / 2 -
    PLAYER_RADIUS;

  /*
    Рух X і Z окремо.
    Завдяки цьому гравець ковзає
    вздовж стіни, а не застрягає.
  */

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

  /*
    Під час пиття можна рухатися,
    але трохи повільніше.
  */

  const speedMultiplier =
    drinking
      ? 0.58
      : 1;

  targetVelocity
    .copy(
      movementDirection
    )
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

/* =====================================================
   WALK BOB
===================================================== */

let walkingTime = 0;

function updateWalkBob(
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
    Math.cos(
      walkingTime
    ) *
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

/* =====================================================
   LOAD WORLD
===================================================== */

async function loadWorld() {
  setLoadingText(
    "Завантаження SoftStreer..."
  );

  const results =
    await Promise.allSettled([
      loadSkybox(),
      loadGrass(),
      loadConcrete(),
      createHouses(),
      loadBottle()
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

loadWorld();

/* =====================================================
   LOOP
===================================================== */

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

  eyePivot.rotation.x =
    pitch;

  updateMovement(
    deltaTime
  );

  updateWalkBob(
    deltaTime
  );

  updateDrinkAnimation();

  renderer.render(
    scene,
    camera
  );
}

animate();

/* =====================================================
   RESIZE
===================================================== */

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

/* =====================================================
   SERVICE WORKER
===================================================== */

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
        .catch((error) => {
          console.error(
            "Service worker error:",
            error
          );
        });
    }
  );
}
```

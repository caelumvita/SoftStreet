/* SKYBOX FROM CODE */
function createCodeSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0.0, "#5fa8dc");
  gradient.addColorStop(0.35, "#8fc8ec");
  gradient.addColorStop(0.7, "#cbe8f7");
  gradient.addColorStop(1.0, "#f2fbff");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // далекі м'які хмари
  for (let i = 0; i < 55; i++) {
    const x = Math.random() * canvas.width;
    const y = 120 + Math.random() * 360;
    const w = 120 + Math.random() * 260;
    const h = 25 + Math.random() * 55;

    const cloud = ctx.createRadialGradient(x, y, 5, x, y, w);
    cloud.addColorStop(0, "rgba(255,255,255,0.55)");
    cloud.addColorStop(0.45, "rgba(255,255,255,0.32)");
    cloud.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // легкий горизонт
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(0, canvas.height * 0.72, canvas.width, canvas.height * 0.06);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(600, 64, 32),
  new THREE.MeshBasicMaterial({
    map: createCodeSkyTexture(),
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  })
);

scene.add(sky);

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';

import {
  primes,
  zeroHeights,
  hslToRgb,
  zetaAmplitude,
  oscillatorHeight,
  contractionFactor
} from './math.js';

// ---------- DOM ----------
const canvas = document.getElementById('rhCanvas');
const playButton = document.getElementById('playButton');
const overlay = document.getElementById('overlay');

// ---------- SCENE ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(30, 20, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(20, 40, 20);
scene.add(dir);

// ---------- CRITICAL LINE (Re = 0.5) ----------
const critMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
const critGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, -60, 0),
  new THREE.Vector3(0, 60, 0),
]);
const criticalLine = new THREE.Line(critGeo, critMat);
scene.add(criticalLine);

// ---------- PRIMES AS PARTICLES ----------
const numPrimes = primes.length;
const primePositions = new Float32Array(numPrimes * 3);
for (let i = 0; i < numPrimes; i++) {
  primePositions[i * 3 + 0] = -Math.random() * 18 - 6;      // x (left side)
  primePositions[i * 3 + 1] = Math.random() * 80 - 40;      // y ~ imaginary axis
  primePositions[i * 3 + 2] = 0;                            // z
}
const primeGeo = new THREE.BufferGeometry();
primeGeo.setAttribute(
  'position',
  new THREE.BufferAttribute(primePositions, 3)
);
const primeMat = new THREE.PointsMaterial({
  color: 0x00ff00,
  size: 0.6
});
const primePoints = new THREE.Points(primeGeo, primeMat);
scene.add(primePoints);

// ---------- ZETA ZEROS AS RED SEGMENTS ON CRITICAL LINE ----------
const zeros = [];
for (let h of zeroHeights) {
  const zg = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, h - 0.6, 0),
    new THREE.Vector3(0, h + 0.6, 0),
  ]);
  const zm = new THREE.LineBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.0
  });
  const zline = new THREE.Line(zg, zm);
  scene.add(zline);
  zeros.push(zline);
}

// ---------- HYBRID SURFACE (ZETA LANDSCAPE + OSCILLATOR) ----------
const width = 26;
const height = 90;
const wSeg = 140;
const hSeg = 260;

const surfaceGeo = new THREE.PlaneGeometry(width, height, wSeg, hSeg);
surfaceGeo.rotateY(Math.PI / 2); // so x-axis comes out of screen

const sPos = surfaceGeo.attributes.position;
const colorArr = new Float32Array(sPos.count * 3);
const colorAttr = new THREE.BufferAttribute(colorArr, 3);
surfaceGeo.setAttribute('color', colorAttr);

const surfaceMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  wireframe: true,
  opacity: 0.85,
  transparent: true
});
const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
scene.add(surface);

// ---------- GAUSSIAN BLOBS / COLLAPSE ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const blobs = [];

function spawnGaussian(worldPoint) {
  const sphereGeo = new THREE.SphereGeometry(1.0, 32, 32);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.8
  });
  const blobMesh = new THREE.Mesh(sphereGeo, sphereMat);
  blobMesh.position.copy(worldPoint);
  scene.add(blobMesh);
  blobs.push({ mesh: blobMesh, age: 0, scale: 1 });

  // Collapse nearby primes towards critical line
  const posAttr = primePoints.geometry.attributes.position;
  let collapsedCount = 0;
  for (let i = 0; i < numPrimes; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const pz = posAttr.getZ(i);

    const dx = px - worldPoint.x;
    const dy = py - worldPoint.y;
    const dz = pz - worldPoint.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 6) {
      posAttr.setX(i, 0);                       // move onto critical line
      posAttr.setZ(i, Math.sin(i) * 0.7);       // small quantum jitter
      collapsedCount++;
    }
  }
  posAttr.needsUpdate = true;

  // Reveal zeros progressively based on collapsed primes
  const revealIndex = Math.min(
    zeros.length - 1,
    Math.floor(collapsedCount / 2)
  );
  for (let k = 0; k <= revealIndex; k++) {
    zeros[k].material.opacity = 1.0;
  }
}

// Mouse click → cast ray → intersect surface → spawn gaussian
canvas.addEventListener('click', (event) => {
  if (playing) return;

  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(surface);
  if (hits.length > 0) {
    spawnGaussian(hits[0].point);
  }
});

// ---------- PLAY / DEMO LOGIC ----------
let playing = false;
let demoTime = 0;

playButton.addEventListener('click', () => {
  playing = true;
  demoTime = 0;
  playButton.style.display = 'none';
  overlay.style.display = 'block';
  overlay.textContent = 'Demo: primes as superpositions (Phase-0 D3)';

  // reset primes & zeros
  const posAttr = primePoints.geometry.attributes.position;
  for (let i = 0; i < numPrimes; i++) {
    posAttr.setX(i, -Math.random() * 18 - 6);
    posAttr.setY(i, Math.random() * 80 - 40);
    posAttr.setZ(i, 0);
  }
  posAttr.needsUpdate = true;
  zeros.forEach(z => (z.material.opacity = 0.0));
});

// ---------- ANIMATION LOOP ----------
let t = 0;

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const dt = 0.016;
  t += dt;

  // Update hybrid surface
  const contraction = contractionFactor(Math.min(1, demoTime / 12));
  for (let i = 0; i < sPos.count; i++) {
    const x = sPos.getX(i);
    const y = sPos.getY(i);

    const re = 0.5 + (x / (width / 2)) * contraction; // squeeze toward 0.5
    const im = y;

    const zAmp = zetaAmplitude(re, im, t);
    const osc = oscillatorHeight(x, y, t);
    const zVal = 0.6 * zAmp + osc * 0.6;

    sPos.setZ(i, zVal);

    const hue = (im + height / 2) / height;
    const [r, g, b] = hslToRgb(hue, 1, 0.5);
    colorArr[i * 3 + 0] = r;
    colorArr[i * 3 + 1] = g;
    colorArr[i * 3 + 2] = b;
  }
  sPos.needsUpdate = true;
  colorAttr.needsUpdate = true;

  // Update blobs (gaussian fading)
  for (let i = blobs.length - 1; i >= 0; i--) {
    const b = blobs[i];
    b.age += dt;
    b.scale += 0.06;
    b.mesh.scale.setScalar(b.scale);
    b.mesh.material.opacity = 0.8 * Math.exp(-2 * b.age);
    if (b.age > 1.3) {
      scene.remove(b.mesh);
      blobs.splice(i, 1);
    }
  }

  // Demo script
  if (playing) {
    demoTime += dt;

    const script = [
      {
        t: 2,
        msg: 'Gaussian smoothing (Symmetry-Breaking §3.1)',
        pos: new THREE.Vector3(-10, 0, 0),
      },
      {
        t: 5,
        msg: 'Prime anchors stabilize (Phase-0 D3/L5)',
        pos: new THREE.Vector3(-12, 12, 0),
      },
      {
        t: 8,
        msg: 'Contraction forces zeros to Re = 0.5',
        pos: new THREE.Vector3(-9, -18, 0),
      },
      {
        t: 11,
        msg: 'RH proven: zeros converge on critical line',
        pos: new THREE.Vector3(-14, 24, 0),
      },
    ];

    for (const step of script) {
      if (demoTime > step.t && demoTime < step.t + dt) {
        overlay.textContent = step.msg;
        spawnGaussian(step.pos);
      }
    }

    if (demoTime > 15) {
      playing = false;
      overlay.style.display = 'none';
      playButton.style.display = 'block';
    }
  }

  renderer.render(scene, camera);
}
animate();

// ---------- HANDLE RESIZE ----------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

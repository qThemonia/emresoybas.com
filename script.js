import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAARenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/SSAARenderPass.js';
import Stats from 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/17/Stats.js';

// CLASS DEFINITIONS
class CelestialBody {
  constructor({ size, segments = 32, materialOptions = {} }) {
    this.geometry = new THREE.SphereGeometry(size, segments, segments);
    this.material = new THREE.MeshStandardMaterial(materialOptions);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }
}

class Orbit {
  constructor(orbitRadius, pointsCount = 1000, color = 0xc8c8c8) {
    this.orbitRadius = orbitRadius;
    this.pointsCount = pointsCount;
    this.color = color;
    this.curve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, true);
    this.points = this.curve.getPoints(pointsCount);
    this.geometry = new THREE.BufferGeometry().setFromPoints(this.points);
    this.material = new THREE.LineBasicMaterial({ color: this.color });
    this.line = new THREE.Line(this.geometry, this.material);
    this.line.rotation.x = Math.PI / 2;
    this.revIndex = 0;
  }
  updatePosition(mesh) {
    const pos = this.points[this.revIndex];
    mesh.position.set(pos.x, 0, pos.y);
    this.revIndex = (this.revIndex + 1) % this.points.length;
  }
}

class BinaryPlanetSystem {
  constructor(sunDistance, avgBinaryDistance, revolutionSpeed) {
    this.systemGroup = new THREE.Group();
    this.G = 1000;
    this.m1 = 1;
    this.m2 = 1;
    this.dt = 0.15;
    this.sunMass = 1000;
    this.sunPosition = new THREE.Vector3(0, 0, 0);

    this.planet1 = new CelestialBody({
      size: 60,
      materialOptions: { color: 0x45f7f7, roughness: 0.8, metalness: 0.3 }
    });
    this.planet2 = new CelestialBody({
      size: 45,
      materialOptions: { color: 0xFF00FF, roughness: 0.7, metalness: 0.4 }
    });
    this.planet1.mesh.position.set(avgBinaryDistance / 3, 0, 0);
    this.planet2.mesh.position.set(-avgBinaryDistance / 3, 0, 0);

    const baseVelocity = Math.sqrt(1680 / avgBinaryDistance) * 0.65;
    this.planet1.velocity = new THREE.Vector3(0.15, 0, baseVelocity);
    this.planet2.velocity = new THREE.Vector3(-0.15, 0, -baseVelocity);

    this.systemGroup.add(this.planet1.mesh, this.planet2.mesh);

    this.prevPos1 = this.planet1.mesh.position.clone();
    this.prevPos2 = this.planet2.mesh.position.clone();

    this.maxTrailPoints = 1000;
    this.trailPositions1 = new Float32Array(this.maxTrailPoints * 3);
    this.trailPositions2 = new Float32Array(this.maxTrailPoints * 3);
    this.trailIndex = 0;
    this.trailLength = 0;
    this.trailDelay = 50;
    this.frameCount = 0;

    this.createOrbitTrails();
    this.createSunOrbit(sunDistance);
  }

  createSunOrbit(sunDistance) {
    const curve = new THREE.EllipseCurve(0, 0, sunDistance, sunDistance, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(20000);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xc8c8c8,
      dashSize: 300,
      gapSize: 300,
      scale: 1
    });
    this.sunOrbit = { line: new THREE.Line(geometry, material), points, revIndex: 0 };
    this.sunOrbit.line.rotation.x = Math.PI / 2;
    this.sunOrbit.line.computeLineDistances();
  }

  createOrbitTrails() {
    this.trailGeometry1 = new THREE.BufferGeometry();
    this.trailGeometry2 = new THREE.BufferGeometry();
    this.trailGeometry1.setAttribute('position', new THREE.BufferAttribute(this.trailPositions1, 3));
    this.trailGeometry2.setAttribute('position', new THREE.BufferAttribute(this.trailPositions2, 3));

    this.trailMaterial1 = new THREE.LineBasicMaterial({ color: 0x45f7f7, transparent: true, opacity: 0.4, linewidth: 1 });
    this.trailMaterial2 = new THREE.LineBasicMaterial({ color: 0xFF00FF, transparent: true, opacity: 0.4, linewidth: 1 });

    this.trail1 = new THREE.Line(this.trailGeometry1, this.trailMaterial1);
    this.trail2 = new THREE.Line(this.trailGeometry2, this.trailMaterial2);
  }

  updateOrbitTrails(scene) {
    if (this.frameCount < this.trailDelay) {
      this.frameCount++;
      return;
    }

    const pos1 = new THREE.Vector3();
    const pos2 = new THREE.Vector3();
    this.planet1.mesh.getWorldPosition(pos1);
    this.planet2.mesh.getWorldPosition(pos2);

    const index = this.trailIndex * 3;
    this.trailPositions1[index] = pos1.x;
    this.trailPositions1[index + 1] = pos1.y;
    this.trailPositions1[index + 2] = pos1.z;
    this.trailPositions2[index] = pos2.x;
    this.trailPositions2[index + 1] = pos2.y;
    this.trailPositions2[index + 2] = pos2.z;

    this.trailIndex = (this.trailIndex + 1) % this.maxTrailPoints;
    if (this.trailLength < this.maxTrailPoints) this.trailLength++;

    if (this.trailLength < this.maxTrailPoints) {
      this.trailGeometry1.setDrawRange(0, this.trailLength);
      this.trailGeometry2.setDrawRange(0, this.trailLength);
    } else {
      const orderedPositions1 = new Float32Array(this.maxTrailPoints * 3);
      const orderedPositions2 = new Float32Array(this.maxTrailPoints * 3);
      let targetIdx = 0;

      for (let i = this.trailIndex; i < this.maxTrailPoints; i++) {
        const srcIdx = i * 3;
        const dstIdx = targetIdx * 3;
        orderedPositions1[dstIdx] = this.trailPositions1[srcIdx];
        orderedPositions1[dstIdx + 1] = this.trailPositions1[srcIdx + 1];
        orderedPositions1[dstIdx + 2] = this.trailPositions1[srcIdx + 2];
        orderedPositions2[dstIdx] = this.trailPositions2[srcIdx];
        orderedPositions2[dstIdx + 1] = this.trailPositions2[srcIdx + 1];
        orderedPositions2[dstIdx + 2] = this.trailPositions2[srcIdx + 2];
        targetIdx++;
      }

      for (let i = 0; i < this.trailIndex; i++) {
        const srcIdx = i * 3;
        const dstIdx = targetIdx * 3;
        orderedPositions1[dstIdx] = this.trailPositions1[srcIdx];
        orderedPositions1[dstIdx + 1] = this.trailPositions1[srcIdx + 1];
        orderedPositions1[dstIdx + 2] = this.trailPositions1[srcIdx + 2];
        orderedPositions2[dstIdx] = this.trailPositions2[srcIdx];
        orderedPositions2[dstIdx + 1] = this.trailPositions2[srcIdx + 1];
        orderedPositions2[dstIdx + 2] = this.trailPositions2[srcIdx + 2];
        targetIdx++;
      }

      this.trailGeometry1.setAttribute('position', new THREE.BufferAttribute(orderedPositions1, 3));
      this.trailGeometry2.setAttribute('position', new THREE.BufferAttribute(orderedPositions2, 3));
      this.trailGeometry1.setDrawRange(0, this.maxTrailPoints);
      this.trailGeometry2.setDrawRange(0, this.maxTrailPoints);
    }

    this.trailGeometry1.attributes.position.needsUpdate = true;
    this.trailGeometry2.attributes.position.needsUpdate = true;
  }

  updateBinaryPositions(dt) {
    const substeps = 5;
    const smallDt = dt / substeps;

    for (let i = 0; i < substeps; i++) {
      const pos1 = this.planet1.mesh.position;
      const pos2 = this.planet2.mesh.position;
      const dx = pos2.x - pos1.x;
      const dz = pos2.z - pos1.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const forceMagnitude = this.G * this.m1 * this.m2 / (distance * distance);
      const forceX = forceMagnitude * (dx / distance);
      const forceZ = forceMagnitude * (dz / distance);

      const acc1x = forceX / this.m1;
      const acc1z = forceZ / this.m1;
      const acc2x = -forceX / this.m2;
      const acc2z = -forceZ / this.m2;

      this.planet1.velocity.x += acc1x * smallDt;
      this.planet1.velocity.z += acc1z * smallDt;
      this.planet2.velocity.x += acc2x * smallDt;
      this.planet2.velocity.z += acc2z * smallDt;

      const dampingFactor = 1;
      this.planet1.velocity.multiplyScalar(dampingFactor);
      this.planet2.velocity.multiplyScalar(dampingFactor);

      const maxVelocity = 50.0;
      if (this.planet1.velocity.length() > maxVelocity) {
        this.planet1.velocity.normalize().multiplyScalar(maxVelocity);
      }
      if (this.planet2.velocity.length() > maxVelocity) {
        this.planet2.velocity.normalize().multiplyScalar(maxVelocity);
      }

      pos1.x += this.planet1.velocity.x * smallDt;
      pos1.z += this.planet1.velocity.z * smallDt;
      pos2.x += this.planet2.velocity.x * smallDt;
      pos2.z += this.planet2.velocity.z * smallDt;
    }

    this.planet1.mesh.rotation.y += 0.01 * dt;
    this.planet2.mesh.rotation.y += 0.008 * dt;
  }
}

// GLOBALS
let simulationSpeed = 1;
const settingsContainer = document.createElement('div');
settingsContainer.className = 'settings-container';

// FPS Counter
const stats = new Stats();
stats.showPanel(0);
stats.dom.style.position = 'absolute';
stats.dom.style.top = '95%';
stats.dom.style.left = '0px';
stats.dom.style.zIndex = '100';
document.body.appendChild(stats.dom);

// SCENE SETUP
window.addEventListener('DOMContentLoaded', () => {
  const introOverlay = document.querySelector('.intro-overlay');
  const cosmicText = document.querySelector('.cosmic-text');
  const name = "Emre Soybas";

  cosmicText.innerHTML = name.split(' ').map((word, wordIndex) =>
    word.split('').map((letter, letterIndex) =>
      `<span class="letter" style="animation-delay: ${(wordIndex * 0.5) + (letterIndex * 0.1)}s">${letter}</span>`
    ).join('')
  ).join('<span class="word-space"> </span>');

  const explosion = document.createElement('div');
  explosion.className = 'laser-explosion';
  introOverlay.appendChild(explosion);

  setTimeout(() => {
    introOverlay.classList.add('hidden');
    initSolarSystem();
    stats.dom.style.display = 'block';
  }, 2500);
});

function initSolarSystem() {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight); // Full screen
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  document.body.appendChild(renderer.domElement);

  requestAnimationFrame(() => {
    renderer.domElement.style.opacity = "1";
  });

  // Camera
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100000);
  camera.position.set(0, 2000, 5300);
  camera.lookAt(0, 0, 0);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Post-processing
  let bloomEnabled = true;
  let ssaaEnabled = false;
  let userQualityHighSet = false;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ssaaPass = new SSAARenderPass(scene, camera);
  ssaaPass.sampleLevel = 2;
  ssaaPass.enabled = false;
  composer.addPass(ssaaPass);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), // Half resolution
    1.5, 0.4, 0.85
  );
  bloomPass.enabled = bloomEnabled;
  composer.addPass(bloomPass);

  function updatePostProcessing() {
    ssaaPass.enabled = ssaaEnabled;
    bloomPass.enabled = bloomEnabled;
  }

  // Celestial Bodies
  const sunSize = 200;
  const sun = new CelestialBody({
    size: sunSize,
    materialOptions: {
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.7
    }
  });
  sun.mesh.position.set(0, 0, 0);
  sun.mesh.castShadow = false;
  scene.add(sun.mesh);

  const sunLight = new THREE.PointLight(0xffffff, 200000, 250000, 1.5);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  scene.add(sunLight);
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 5000;

  const earth = new CelestialBody({
    size: 100,
    materialOptions: { color: 0x00FF00, roughness: 1, metalness: 0.8 }
  });
  scene.add(earth.mesh);
  const earthOrbit = new Orbit(1700, 10000, 0xc8c8c8);
  scene.add(earthOrbit.line);

  const moon = new CelestialBody({
    size: 30,
    materialOptions: { color: 0x757575, roughness: 1, metalness: 0.1 }
  });
  const moonOrbit = new Orbit(300, 1000, 0xc8c8c8);
  const moonGroup = new THREE.Group();
  moonGroup.add(moonOrbit.line);
  moonGroup.add(moon.mesh);
  earth.mesh.add(moonGroup);

  const mars = new CelestialBody({
    size: 70,
    materialOptions: { color: 0xFF0000, roughness: 1, metalness: 0.8 }
  });
  scene.add(mars.mesh);
  const marsOrbit = new Orbit(1100, 3000, 0xc8c8c8);
  scene.add(marsOrbit.line);

  const saturn = new CelestialBody({
    size: 105,
    materialOptions: { color: 0xF4D03F, roughness: 0.9, metalness: 0.2 }
  });

  function createSaturnRings() {
    const ringsGroup = new THREE.Group();
    const ringParams = [
      { inner: 145, outer: 170, particles: 175, color: 0xD4C4A8 },
      { inner: 180, outer: 250, particles: 350, color: 0xE8DDCB },
      { inner: 255, outer: 290, particles: 200, color: 0xDDCBB8 }
    ];

    ringParams.forEach(ring => {
      const ringParticles = new THREE.BufferGeometry();
      const positions = new Float32Array(ring.particles * 3);
      const colors = new Float32Array(ring.particles * 3);
      const sizes = new Float32Array(ring.particles);

      for (let i = 0; i < ring.particles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = ring.inner + Math.random() * (ring.outer - ring.inner);
        const x = Math.cos(angle) * distance;
        const y = (Math.random() - 0.5) * 2.5;
        const z = Math.sin(angle) * distance;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const color = new THREE.Color(ring.color);
        color.r += (Math.random() - 0.5) * 0.1;
        color.g += (Math.random() - 0.5) * 0.1;
        color.b += (Math.random() - 0.5) * 0.1;

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = (distance < (ring.inner + (ring.outer - ring.inner) * 0.3) || 
                    distance > (ring.inner + (ring.outer - ring.inner) * 0.7)) ? 
                   0.5 + Math.random() * 1.5 : 1.5 + Math.random() * 2.5;
      }

      ringParticles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      ringParticles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      ringParticles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 2,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
      });

      const particleSystem = new THREE.Points(ringParticles, material);
      ringsGroup.add(particleSystem);
    });

    const divisionGeometry = new THREE.RingGeometry(250, 255, 120, 1);
    divisionGeometry.rotateX(Math.PI / 2);
    const divisionMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: true, 
      opacity: 0.7,
      side: THREE.DoubleSide 
    });
    const division = new THREE.Mesh(divisionGeometry, divisionMaterial);
    ringsGroup.add(division);

    ringsGroup.rotation.x = Math.PI * 0.1;
    return ringsGroup;
  }

  const saturnOrbit = new Orbit(3500, 40000, 0xc8c8c8);
  scene.add(saturnOrbit.line);

  const saturnRings = createSaturnRings();
  const saturnSystem = new THREE.Group();
  saturnSystem.add(saturn.mesh);
  saturnSystem.add(saturnRings);
  scene.add(saturnSystem);

  const binaryPlanets = new BinaryPlanetSystem(2500, 250, 0.005);
  scene.add(binaryPlanets.sunOrbit.line);
  scene.add(binaryPlanets.systemGroup);
  scene.add(binaryPlanets.trail1, binaryPlanets.trail2);

  // Planet mapping for hover effects
  const planetViews = {
    mars: { object: mars.mesh },
    earth: { object: earth.mesh },
    binary1: { object: binaryPlanets.planet1.mesh }
  };

  // Star Field
  function createStarField() {
    const starCount = 10000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const radius = 20000;

    for (let i = 0; i < starCount; i++) {
      const r = radius * Math.cbrt(Math.random());
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos((Math.random() * 2) - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.5 + Math.random() * 0.3, 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 1.5 + Math.random() * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const starField = new THREE.Points(geometry, starMaterial);
    starField.matrixAutoUpdate = false;
    starField.updateMatrix();
    scene.add(starField);
  }
  createStarField();

  // Settings UI
  function createSettingsUI() {
    document.body.appendChild(settingsContainer);

    const bloomToggle = document.createElement('button');
    bloomToggle.className = 'space-button settings-button';
    bloomToggle.textContent = 'Bloom: ON';
    bloomToggle.addEventListener('click', () => {
      bloomEnabled = !bloomEnabled;
      bloomToggle.textContent = `Bloom: ${bloomEnabled ? 'ON' : 'OFF'}`;
      updatePostProcessing();
    });

    const ssaaToggle = document.createElement('button');
    ssaaToggle.className = 'space-button settings-button';
    ssaaToggle.textContent = 'Quality: Low';
    ssaaToggle.addEventListener('click', () => {
      ssaaEnabled = !ssaaEnabled;
      userQualityHighSet = ssaaEnabled;
      ssaaPass.enabled = ssaaEnabled;
      ssaaToggle.textContent = `Quality: ${ssaaEnabled ? 'High' : 'Low'}`;
      updatePostProcessing();
    });

    const fastForwardToggle = document.createElement('button');
    fastForwardToggle.className = 'space-button settings-button';
    fastForwardToggle.textContent = 'Fast Forward: OFF';
    let isFastForward = false;

    fastForwardToggle.addEventListener('click', () => {
      isFastForward = !isFastForward;
      simulationSpeed = isFastForward ? 20 : 1;
      fastForwardToggle.textContent = `Fast Forward: ${isFastForward ? 'ON' : 'OFF'}`;
    });

    settingsContainer.appendChild(ssaaToggle);
    settingsContainer.appendChild(bloomToggle);
    settingsContainer.appendChild(fastForwardToggle);
  }
  createSettingsUI();

  // Hover Effects for Panels
  const panels = document.querySelectorAll('.content-panel');
  panels.forEach(panel => {
    const planetName = panel.dataset.planet;
    const planetConfig = planetViews[planetName];
    if (!planetConfig) return;

    const planet = planetConfig.object;
    panel.addEventListener('mouseenter', () => {
      planet.scale.set(1.5, 1.5, 1.5);
      planet.material.emissive = new THREE.Color(0x64c8ff);
    });
    panel.addEventListener('mouseleave', () => {
      planet.scale.set(1, 1, 1);
      planet.material.emissive = new THREE.Color(0x000000);
    });
  });

  // Planetary Animations
  function planetaryAnimations() {
    earthOrbit.revIndex = (earthOrbit.revIndex + simulationSpeed) % earthOrbit.points.length;
    const earthPos = earthOrbit.points[earthOrbit.revIndex];
    earth.mesh.position.set(earthPos.x, 0, earthPos.y);

    moonOrbit.revIndex = (moonOrbit.revIndex + simulationSpeed) % moonOrbit.points.length;
    const moonPos = moonOrbit.points[moonOrbit.revIndex];
    moon.mesh.position.set(moonPos.x, 0, moonPos.y);

    marsOrbit.revIndex = (marsOrbit.revIndex + simulationSpeed) % marsOrbit.points.length;
    const marsPos = marsOrbit.points[marsOrbit.revIndex];
    mars.mesh.position.set(marsPos.x, 0, marsPos.y);

    saturnOrbit.revIndex = (saturnOrbit.revIndex + simulationSpeed) % saturnOrbit.points.length;
    const saturnPos = saturnOrbit.points[saturnOrbit.revIndex];
    saturnSystem.position.set(saturnPos.x, 0, saturnPos.y);

    binaryPlanets.updateBinaryPositions(binaryPlanets.dt * simulationSpeed * 10);
    binaryPlanets.updateOrbitTrails(scene);

    binaryPlanets.sunOrbit.revIndex = (binaryPlanets.sunOrbit.revIndex + (simulationSpeed * 5)) % binaryPlanets.sunOrbit.points.length;
    const binaryPos = binaryPlanets.sunOrbit.points[binaryPlanets.sunOrbit.revIndex];
    binaryPlanets.systemGroup.position.set(binaryPos.x, 0, binaryPos.y);

    sun.mesh.rotation.y += 0.007 * simulationSpeed;
    saturnRings.rotation.y += 0.002 * simulationSpeed;
  }

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    stats.begin();
    TWEEN.update();

    planetaryAnimations();
    composer.render();

    stats.end();
  }
  animate();

  // Resize Handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
}
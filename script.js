import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAARenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/SSAARenderPass.js';
import Stats from 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/17/Stats.js';

//
// CLASS DEFINITIONS
//


// Class to create a sphere (celestial body)
class CelestialBody {
  constructor({ size, segments = 32, materialOptions = {} }) {
    this.geometry = new THREE.SphereGeometry(size, segments, segments);
    this.material = new THREE.MeshStandardMaterial(materialOptions);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }
}

// Class to create an orbit and update an object's position along it
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
    // Rotate the orbit so it lies flat on the XZ plane
    this.line.rotation.x = Math.PI / 2;
    // Internal index for revolution updates
    this.revIndex = 0;
  }
  // Update the provided mesh's position along the orbit path
  updatePosition(mesh) {
    const pos = this.points[this.revIndex];
    mesh.position.set(pos.x, 0, pos.y);
    this.revIndex = (this.revIndex + 1) % this.points.length;
  }
}

let isSystemLocked = false;
let isRenderingPaused = false;
let backButtonHovered = false;

//
// SCENE SETUP
//

  //
  // FPS Counter
  //
  const stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = '95%';
  stats.dom.style.left = '0px';
  stats.dom.style.zIndex = '100'; // Make sure it's above other elements
  stats.dom.style.display = 'none';
  document.body.appendChild(stats.dom);


  window.addEventListener('DOMContentLoaded', () => {
    const introOverlay = document.querySelector('.intro-overlay');
    const cosmicText = document.querySelector('.cosmic-text');
    const name = "Emre Soybas";
  
    cosmicText.innerHTML = name.split(' ').map((word, wordIndex) => 
      word.split('').map((letter, letterIndex) => 
        `<span class="letter" style="animation-delay: ${(wordIndex * 0.5) + (letterIndex * 0.1)}s">${letter}</span>`
      ).join('')
    ).join('<span class="word-space"> </span>');

  // Create explosion effect that appears after lasers
  const explosion = document.createElement('div');
  explosion.className = 'laser-explosion';
  introOverlay.appendChild(explosion);

    // Delay the solar system load until intro completes
    setTimeout(() => {
      introOverlay.classList.add('hidden');
      initSolarSystem(); // Start the solar system after intro
      stats.dom.style.display = 'block';
    }, 2500); // 2.5 seconds total (1s for text + 1.5s for fade)
  });

  //GLOBALS
  let isTracking = false;
  const settingsContainer = document.createElement('div');
  settingsContainer.className = 'settings-container';


  function initSolarSystem(){
  let simulationSpeed = 1; // Default: normal speed

  
  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  document.body.appendChild(renderer.domElement);
  
  requestAnimationFrame(() => {
    renderer.domElement.style.opacity = "1";
  });

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100000);
  camera.position.set(0, 2000, 5300);
  camera.lookAt(0, 0, 0);

  // --- Controls ---
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

   // --- Post-processing Settings ---
   let bloomEnabled = true;
   let ssaaEnabled = false;
   let userQualityHighSet = false;

  // --- Composer with Postprocessing ---
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

   // Function to update post-processing settings
   function updatePostProcessing() {
    ssaaPass.enabled = ssaaEnabled;
    bloomPass.enabled = bloomEnabled;
  }

  //
  // Create the Celestial Bodies using our classes
  //

  // --- Sun ---
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

  // --- Sun Lighting ---
  const sunLight = new THREE.PointLight(0xffffff, 200000, 250000, 1.5);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  scene.add(sunLight);
  sunLight.shadow.mapSize.width = 512;
  sunLight.shadow.mapSize.height = 512;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 5000;

  // --- Earth ---
  const earth = new CelestialBody({
    size: 100,
    materialOptions: { color: 0x00FF00, roughness: 1, metalness: 0.8 }
  });
  // Note: The Earth's position will be updated along its orbit.
  scene.add(earth.mesh);
  const earthOrbit = new Orbit(1700, 10000, 0xc8c8c8);
  scene.add(earthOrbit.line);

  // --- Moon ---
  const moon = new CelestialBody({
    size: 30,
    materialOptions: { color: 0x757575, roughness: 1, metalness: 0.1 }
  });
  const moonOrbit = new Orbit(300, 1000, 0xc8c8c8);
  // Group the Moon and its orbit so that the Moon orbits Earth
  const moonGroup = new THREE.Group();
  moonGroup.add(moonOrbit.line);
  moonGroup.add(moon.mesh);
  // Attach the Moon group to the Earth so its orbit is relative to Earth
  earth.mesh.add(moonGroup);

  // --- Mars ---
  const mars = new CelestialBody({
    size: 70,
    materialOptions: { color: 0xFF0000, roughness: 1, metalness: 0.8 }
  });
  // Note: Mars' position will be updated along its orbit.
  scene.add(mars.mesh);
  const marsOrbit = new Orbit(1100, 3000, 0xc8c8c8);
  scene.add(marsOrbit.line);

  // --- Saturn ---
const saturn = new CelestialBody({
  size: 105,
  materialOptions: { 
    color: 0xF4D03F,
    roughness: 0.9, 
    metalness: 0.2 
  }
});

// --- Saturn's  Particle Rings ---
function createSaturnRings() {

  const ringsGroup = new THREE.Group();
  
  const ringParams = [
    { inner: 145, outer: 170, particles: 175, color: 0xD4C4A8 }, // Inner
    { inner: 180, outer: 250, particles: 350, color: 0xE8DDCB }, // Middle
    { inner: 255, outer: 290, particles: 200, color: 0xDDCBB8 }  // Outer
  ];
  
  ringParams.forEach(ring => {
    // Particle geometry
    const ringParticles = new THREE.BufferGeometry();
    const positions = new Float32Array(ring.particles * 3);
    const colors = new Float32Array(ring.particles * 3);
    const sizes = new Float32Array(ring.particles);
    
    // Fill w/ particles in ring pattern
    for (let i = 0; i < ring.particles; i++) {
      
      const angle = Math.random() * Math.PI * 2;
      
      // Random distance between inner and outer radius
      const distance = ring.inner + Math.random() * (ring.outer - ring.inner);
      
      // rand pos (flat on XZ)
      const x = Math.cos(angle) * distance;
      const y = (Math.random() - 0.5) * 2.5; // Slight thickness (±2.5 units)
      const z = Math.sin(angle) * distance;
      
      // Set particle position
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Add color variation
      const color = new THREE.Color(ring.color);
      // Add slight color variation
      color.r += (Math.random() - 0.5) * 0.1;
      color.g += (Math.random() - 0.5) * 0.1;
      color.b += (Math.random() - 0.5) * 0.1;
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Vary particle sizes - larger in denser regions
      if (distance < (ring.inner + (ring.outer - ring.inner) * 0.3) || 
          distance > (ring.inner + (ring.outer - ring.inner) * 0.7)) {
        // Smaller particles at edges
        sizes[i] = 0.5 + Math.random() * 1.5;
      } else {
        // Larger particles in middle
        sizes[i] = 1.5 + Math.random() * 2.5;
      }
    }
    
    // Add attributes to geometry
    ringParticles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    ringParticles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    ringParticles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create point material
    const material = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    
    // Create the points system
    const particleSystem = new THREE.Points(ringParticles, material);
    ringsGroup.add(particleSystem);
  });
  
  // Add ring divisions - darker gaps between rings (Cassini Division)
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
  
  // Apply realistic tilt angle to entire ring system (26.73 degrees)
  ringsGroup.rotation.x = Math.PI * 0.1;
  
  return ringsGroup;
}


// Create Saturn's orbit
const saturnOrbit = new Orbit(3500, 40000, 0xc8c8c8);
scene.add(saturnOrbit.line);

// Create the detailed rings
const saturnRings = createSaturnRings();

// Create Saturn system and add components
const saturnSystem = new THREE.Group();
saturnSystem.add(saturn.mesh);
saturnSystem.add(saturnRings);

// Add the Saturn system to the scene
scene.add(saturnSystem);

// **BinaryPlanetSystem Class**: Realistic chaotic binary system with gravitational dynamics
class BinaryPlanetSystem {
  constructor(sunDistance, avgBinaryDistance, revolutionSpeed) {
    this.systemGroup = new THREE.Group();

    // Physics constants
    this.G = 1000;           // Further reduced for stability
    this.m1 = 1;
    this.m2 = 1;
    this.dt = 0.15;

    // Planet 1 (Blue)
    this.planet1 = new CelestialBody({
      size: 60,
      materialOptions: { color: 0x45f7f7, roughness: 0.8, metalness: 0.3 }
    });

    // Planet 2 (Purple)
    this.planet2 = new CelestialBody({
      size: 45,
      materialOptions: { color: 0xFF00FF, roughness: 0.7, metalness: 0.4 }
    });
    this.planet1.mesh.position.set(avgBinaryDistance/3, 0, 0);
    this.planet2.mesh.position.set(-avgBinaryDistance/3, 0, 0);
    
    // Add slight asymmetry and more energy
    const baseVelocity = Math.sqrt(1680/avgBinaryDistance) * 0.7;
    this.planet1.velocity = new THREE.Vector3(0.15, 0, baseVelocity);
    this.planet2.velocity = new THREE.Vector3(-0.15, 0, -baseVelocity);

    this.systemGroup.add(this.planet1.mesh, this.planet2.mesh);

    // Previous positions for Verlet
    this.prevPos1 = this.planet1.mesh.position.clone();
    this.prevPos2 = this.planet2.mesh.position.clone();

    // Trail setup
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
    
    // Create a dashed line material instead of a solid one
    const material = new THREE.LineDashedMaterial({
      color: 0xc8c8c8,
      dashSize: 300,
      gapSize: 300,
      scale: 1
    });
    
    this.sunOrbit = { line: new THREE.Line(geometry, material), points, revIndex: 0 };
    this.sunOrbit.line.rotation.x = Math.PI / 2;
    
    // This is essential - we need to compute the line distances for the dashed effect to work
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
    scene.add(this.trail1, this.trail2);
  }

  updateOrbitTrails() {
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
    // Use consistent time steps
    const substeps = 5; // Fixed number of substeps for stability
    const smallDt = dt / substeps;
  
    for (let i = 0; i < substeps; i++) {
      const pos1 = this.planet1.mesh.position;
      const pos2 = this.planet2.mesh.position;
      const dx = pos2.x - pos1.x;
      const dz = pos2.z - pos1.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
          
      // Calculate acceleration
      const forceMagnitude = this.G * this.m1 * this.m2 / (distance * distance);
      const forceX = forceMagnitude * (dx / distance);
      const forceZ = forceMagnitude * (dz / distance);
      
      // Calculate acceleration
      const acc1x = forceX / this.m1;
      const acc1z = forceZ / this.m1;
      const acc2x = -forceX / this.m2;
      const acc2z = -forceZ / this.m2;
      
      // Update velocities first (using semi-implicit Euler for stability)
      this.planet1.velocity.x += acc1x * smallDt;
      this.planet1.velocity.z += acc1z * smallDt;
      this.planet2.velocity.x += acc2x * smallDt;
      this.planet2.velocity.z += acc2z * smallDt;
      
      // Apply damping
      const dampingFactor = 1;
      this.planet1.velocity.multiplyScalar(dampingFactor);
      this.planet2.velocity.multiplyScalar(dampingFactor);
      
      // Cap velocities more aggressively
      const maxVelocity = 50.0;
      if (this.planet1.velocity.length() > maxVelocity) {
        this.planet1.velocity.normalize().multiplyScalar(maxVelocity);
      }
      if (this.planet2.velocity.length() > maxVelocity) {
        this.planet2.velocity.normalize().multiplyScalar(maxVelocity);
      }
      
      // Update positions based on velocity
      pos1.x += this.planet1.velocity.x * smallDt;
      pos1.z += this.planet1.velocity.z * smallDt;
      pos2.x += this.planet2.velocity.x * smallDt;
      pos2.z += this.planet2.velocity.z * smallDt;

    }
    
    // Update trails and rotations
    this.updateOrbitTrails();
    this.planet1.mesh.rotation.y += 0.01 * dt;
    this.planet2.mesh.rotation.y += 0.008 * dt;
  }
}
// Create the binary planet system
// Parameters: distance from sun, average distance between planets, revolution speed
const binaryPlanets = new BinaryPlanetSystem(2500, 250, 0.005);
scene.add(binaryPlanets.sunOrbit.line);
scene.add(binaryPlanets.systemGroup);


  //
  // Star Field
  //
  function createStarField() {
    // Use fewer stars for better performance
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
      
      // Vary star sizes for more visual interest
      sizes[i] = 1.5 + Math.random() * 1.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Use a more efficient shader for the stars
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
    starField.matrixAutoUpdate = false; // Disable auto matrix updates
    starField.updateMatrix(); // Update matrix once
    scene.add(starField);
  }
  createStarField();

  
const transitionState = {
  inProgress: false,
  type: null,
  currentTween: null,
  targetTween: null,
  cameraPosTween: null
};

// Make sure to get the hover controls when setting up the UI
// Initialize everything correctly
const settingsUI = createSettingsUI(); // Capture the settingsUI object
const hoverControls = setupPlanetHoverAnimations(transitionState);
const updateCameraForTracking = setupUI(hoverControls, settingsUI, transitionState); // Pass transitionState here too

  //
  // SETTINGS UI
  //
  function createSettingsUI() {
    
    document.body.appendChild(settingsContainer);
  
    // Create Bloom toggle
    const bloomToggle = document.createElement('button');
    bloomToggle.className = 'space-button settings-button';
    bloomToggle.textContent = 'Bloom: ON';
    bloomToggle.addEventListener('click', () => {
      bloomEnabled = !bloomEnabled;
      bloomToggle.textContent = `Bloom: ${bloomEnabled ? 'ON' : 'OFF'}`;
      updatePostProcessing();
    });
  
    // Create SSAA toggle with reference
    const ssaaToggle = document.createElement('button');
    ssaaToggle.className = 'space-button settings-button';
    ssaaToggle.textContent = 'Quality: Low';
    ssaaToggle.addEventListener('click', () => {
      ssaaEnabled = !ssaaEnabled;
      userQualityHighSet = ssaaEnabled;
      ssaaPass.enabled = ssaaEnabled; // Sync with manual toggle
      ssaaToggle.textContent = `Quality: ${ssaaEnabled ? 'High' : 'Low'}`;
      updatePostProcessing();
    });
    settingsContainer.appendChild(ssaaToggle);
    settingsContainer.appendChild(bloomToggle);

    const fastForwardToggle = document.createElement('button');
    fastForwardToggle.className = 'space-button settings-button';
    fastForwardToggle.textContent = 'Fast Forward: OFF';
    let isFastForward = false;
  
    fastForwardToggle.addEventListener('click', () => {
      isFastForward = !isFastForward;
      simulationSpeed = isFastForward ? 50 : 1;
      fastForwardToggle.textContent = `Fast Forward: ${isFastForward ? 'ON' : 'OFF'}`;
    });
    settingsContainer.appendChild(fastForwardToggle);
  
    // Add CSS for the settings UI
    const style = document.createElement('style');
    style.textContent = `
      .settings-container {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 20;
      }
      
      .settings-button {
        min-width: 120px;
        text-align: center;
        font-size: 16px;
        padding: 0.5rem 1rem;
      }
    `;
    document.head.appendChild(style);
  
    // Return a function to update SSAA button text
    return {
      updateSSAAStatus: () => {
        ssaaToggle.textContent = `Quality: ${ssaaPass.enabled ? 'High' : 'Low'}`;
      }
    };
  }

  //
  // BUTTON ANIMATIONS
  //

let isAnimationPaused = false;
let trackedObject = null;
let currentCameraDistance = null;

// Updated setupPlanetHoverAnimations function to work with the new transition system
function setupPlanetHoverAnimations(transitionState) {
  const planetButtons = document.querySelectorAll('[data-planet]');
// Create planet name labels
planetButtons.forEach(button => {
  const planetName = button.dataset.planet;
  
  // Create a container for the button and label if it doesn't already exist
  if (!button.parentNode.classList.contains('planet-button-container')) {
    const container = document.createElement('div');
    container.className = 'planet-button-container';
    button.parentNode.insertBefore(container, button);
    container.appendChild(button);
  }
  
  // Create label element
  const label = document.createElement('div');
  label.className = 'planet-label';
  
  // Set the display name based on the data-planet value
  let displayName = planetName.charAt(0).toUpperCase() + planetName.slice(1);
  if (planetName === 'binary1') displayName = 'Zephyr I';
  if (planetName === 'binary2') displayName = 'Zephyr II';
  
  label.textContent = displayName;
  
  // Add label after the button but within the container
  button.parentNode.appendChild(label);
});

// Add CSS for the labels and containers
const labelStyle = document.createElement('style');
labelStyle.textContent = `
  .planet-button-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0;
    padding: 0;
  }
  
  .planet-label {
    text-align: center;
    color: #aaaaaa;
    font-size: 12px;
    margin-top: 4px;
    font-family: Arial, sans-serif;
    opacity: 0.8;
  }
`;
document.head.appendChild(labelStyle);


  const planetViews = {
    earth: { object: earth.mesh },
    mars: { object: mars.mesh },
    saturn: { object: saturn.mesh },
    binary1: { object: binaryPlanets.planet1.mesh },
    binary2: { object: binaryPlanets.planet2.mesh }
  };

  let hoverState = {
    inProgress: false,
    currentTween: null,
    currentPlanet: null,
    isHovered: false
  };
  
  let originalCameraTarget = new THREE.Vector3(0, 0, 0);

  function resetHoverSystem() {
    if (hoverState.currentTween) {
      hoverState.currentTween.stop();
    }
    
    hoverState = {
      inProgress: false,
      currentTween: null,
      currentPlanet: null,
      isHovered: false
    };

    // Force reset target to original if needed
  if (!isTracking && !transitionState.inProgress) {
    controls.target.copy(originalCameraTarget);
  }
  }

  function saveOriginalCameraState() {
    originalCameraTarget = new THREE.Vector3(0, 0, 0);
  }

  function getPlanetCurrentPosition(planetMesh) {
    const position = new THREE.Vector3();
    planetMesh.getWorldPosition(position);
    return position;
  }

  function updateHoverTracking() {
    if (!hoverState.isHovered || isTracking || hoverState.inProgress || transitionState.inProgress) return;
    
    const planetConfig = planetViews[hoverState.currentPlanet];
    if (planetConfig && planetConfig.object) {
      const planetPosition = getPlanetCurrentPosition(planetConfig.object);
      controls.target.lerp(planetPosition, 0.1);
      camera.lookAt(controls.target);
    }
  }

  function lookAtPlanet(planetName) {
    if (isTracking || transitionState.inProgress) return; // Disable during transitions
    
    const planetConfig = planetViews[planetName];
    if (!planetConfig || !planetConfig.object) return;
    
    hoverState.inProgress = true;
    hoverState.currentPlanet = planetName;
    
    const planetPosition = getPlanetCurrentPosition(planetConfig.object);
    const startTarget = controls.target.clone();
    
    hoverState.currentTween = new TWEEN.Tween({
        x: startTarget.x,
        y: startTarget.y,
        z: startTarget.z
      })
      .to({
        x: planetPosition.x,
        y: planetPosition.y,
        z: planetPosition.z
      }, 800)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        if (!isTracking && hoverState.isHovered && !transitionState.inProgress) {
          controls.target.set(obj.x, obj.y, obj.z);
          camera.lookAt(controls.target);
        }
      })
      .onComplete(() => {
        hoverState.inProgress = false;
        isSystemLocked = false;
      });
    
    hoverState.currentTween.start();
  }

  function returnToOriginalView() {
    if (isTracking || transitionState.inProgress) return; // Disable during transitions
    
    hoverState.inProgress = true;
    const startTarget = controls.target.clone();
    
    hoverState.currentTween = new TWEEN.Tween({
        x: startTarget.x,
        y: startTarget.y,
        z: startTarget.z
      })
      .to({
        x: originalCameraTarget.x,
        y: originalCameraTarget.y,
        z: originalCameraTarget.z
      }, 800)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        if (!isTracking && !transitionState.inProgress) {
          controls.target.set(obj.x, obj.y, obj.z);
          camera.lookAt(controls.target);
        }
      })
      .onComplete(() => {
        isSystemLocked = false;
        hoverState.inProgress = false;
        hoverState.currentPlanet = null;
      });
    
    hoverState.currentTween.start();
  }

  planetButtons.forEach(button => {
    const planetName = button.dataset.planet;

    button.addEventListener('mouseenter', () => {
      // First check transition state
  if (isTracking || transitionState.inProgress || isSystemLocked) {
    // If in transition, force reset hover state
    hoverState.isHovered = false;
    return;
  }
    
      hoverState.isHovered = true;
      if (hoverState.currentTween) {
        hoverState.currentTween.stop();
      }
      lookAtPlanet(planetName);
    });

    button.addEventListener('mouseleave', () => {
      if (isTracking || transitionState.inProgress || isSystemLocked) return; // Prevent hover during transitions
      
      hoverState.isHovered = false;
      setTimeout(() => {
        if (!hoverState.isHovered && !isTracking && !transitionState.inProgress) {
          if (hoverState.currentTween) {
            hoverState.currentTween.stop();
          }
          returnToOriginalView();
        }
      }, 50);
    });
  });

  return {
    updateOriginalTarget: () => {
      if (!hoverState.currentPlanet && !isTracking) {
        originalCameraTarget = controls.target.clone();
      }
    },
    handleStopTracking: saveOriginalCameraState,
    updateHoverTracking: updateHoverTracking,
    reset: resetHoverSystem
  };
}

// Update your setupUI function to integrate with hover animations
function setupUI(hoverControls, settingsUI, transitionState) {
  const backButton = document.querySelector('.back-button');
  const planetButtons = document.querySelectorAll('[data-planet]');
  const buttonContainer = document.querySelector('.nav-buttons');

  // Function to reset all buttons and their labels to normal size and position
  function resetAllButtonsToNormal() {
    planetButtons.forEach(btn => {
      btn.classList.remove('active-planet');
      btn.style.transform = 'translateX(0) scale(1)';
      const label = btn.parentNode.querySelector('.planet-label');
      if (label) {
        label.classList.remove('active-label');
        label.style.transform = 'translateX(0) scale(1)';
      }
    });
  }

  planetButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (transitionState.inProgress) return;

      const planet = button.dataset.planet;
      const view = planetViews[planet];
      if (!view) return;

      // If already tracking a different planet, clean up current view
      if (isTracking && trackedObject !== view.object) {
        const projectsPage = document.querySelector('.projects-page');
        if (trackedObject === earth.mesh) {
          projectsPage.classList.remove('visible');
          setTimeout(() => {
            projectsPage.style.display = 'none';
          }, 500); // Match stopTracking fade-out
        }
        scene.visible = true; // Ensure scene is visible for transition
      }

      // Reset all buttons and scale the clicked one
      resetAllButtonsToNormal();
      button.classList.add('active-planet');
      const label = button.parentNode.querySelector('.planet-label');
      if (label) {
        label.classList.add('active-label');
      }

      // Move other buttons to make space
      const buttonWidth = button.offsetWidth;
      const expandedWidth = buttonWidth * 1.7;
      const spaceNeeded = (expandedWidth - buttonWidth) / 2;

      planetButtons.forEach((otherButton, otherIndex) => {
        if (otherButton !== button) {
          if (otherIndex < index) {
            otherButton.style.transform = `translateX(-${spaceNeeded}px) scale(1)`;
            const otherLabel = otherButton.parentNode.querySelector('.planet-label');
            if (otherLabel) {
              otherLabel.style.transform = `translateX(-${spaceNeeded}px) scale(1)`;
            }
          } else {
            otherButton.style.transform = `translateX(${spaceNeeded}px) scale(1)`;
            const otherLabel = otherButton.parentNode.querySelector('.planet-label');
            if (otherLabel) {
              otherLabel.style.transform = `translateX(${spaceNeeded}px) scale(1)`;
            }
          }
        } else {
          otherButton.style.transform = 'scale(1.7)';
          if (label) {
            label.style.transform = 'scale(1.7)';
          }
        }
      });

      startTracking(view);
    });
  });

  // Add CSS for the active state and transitions
  const activeButtonStyle = document.createElement('style');
  activeButtonStyle.textContent = `
    [data-planet] {
      transition: transform 0.3s ease;
    }
    .active-planet {
      z-index: 30;
    }
    .planet-label {
      transition: transform 0.3s ease;
    }
    .active-label {
      display: none;
      color: #ffffff;
      font-weight: bold;
      z-index: 30;
    }
  `;
  document.head.appendChild(activeButtonStyle);

  const defaultCameraPos = { x: 0, y: 2000, z: 5300 };

  const planetViews = {
    earth: {
      object: earth.mesh,
      distance: 130,
      height: 30,
      angle: Math.PI * 0.6
    },
    mars: {
      object: mars.mesh,
      distance: 100,
      height: 10,
      angle: Math.PI * 0.6
    },
    saturn: {
      object: saturn.mesh,
      distance: 120,
      height: 50,
      angle: Math.PI * 0.6
    },
    binary1: {
      object: binaryPlanets.planet1.mesh,
      distance: 80,
      height: 20,
      angle: Math.PI * 0.6
    },
    binary2: {
      object: binaryPlanets.planet2.mesh,
      distance: 50,
      height: 20,
      angle: Math.PI * 0.6
    }
  };

  function calculateViewPosition(planetMesh, config) {
    const planetPosition = new THREE.Vector3();
    planetMesh.getWorldPosition(planetPosition);
    const sunToPlanet = planetPosition.clone().sub(new THREE.Vector3(0, 0, 0));
    const cameraOffset = sunToPlanet.clone()
      .normalize()
      .multiplyScalar(config.distance);
    const cameraPosition = planetPosition.clone().add(cameraOffset);
    cameraPosition.y += config.height;
    return {
      cameraPos: cameraPosition,
      targetPos: planetPosition.clone()
    };
  }

  function updateCameraForTracking() {
    if (!isTracking || !trackedObject || transitionState.inProgress) return;
    const planetPosition = new THREE.Vector3();
    trackedObject.getWorldPosition(planetPosition);
    const { cameraPos, targetPos } = calculateViewPosition(trackedObject, currentCameraDistance);
    camera.position.lerp(cameraPos, 0.1);
    controls.target.lerp(targetPos, 0.1);
    camera.lookAt(controls.target);
  }

  function startTracking(planetConfig) {
    isSystemLocked = true;
    hoverControls.reset();

    if (transitionState.inProgress) {
      if (transitionState.currentTween) transitionState.currentTween.stop();
      if (transitionState.targetTween) transitionState.targetTween.stop();
      if (transitionState.cameraPosTween) transitionState.cameraPosTween.stop();
    }
    
    transitionState = {
      inProgress: true,
      type: 'toObject',
      currentTween: null,
      targetTween: null,
      cameraPosTween: null
    };

    isAnimationPaused = true;
    controls.enabled = false;
    controls.autoRotate = false;
    backButton.style.display = 'flex';

    trackedObject = planetConfig.object;
    currentCameraDistance = {
      distance: planetConfig.distance,
      height: planetConfig.height
    };
    
    const planetWorldPosition = new THREE.Vector3();
    trackedObject.getWorldPosition(planetWorldPosition);
    
    const { cameraPos, targetPos } = calculateViewPosition(trackedObject, currentCameraDistance);
    
    const startTarget = controls.target.clone();
    
    transitionState.cameraPosTween = new TWEEN.Tween(camera.position)
      .to({
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z
      }, 2000)
      .easing(TWEEN.Easing.Cubic.InOut);
    
    transitionState.targetTween = new TWEEN.Tween({
        x: startTarget.x,
        y: startTarget.y,
        z: startTarget.z
      })
      .to({
        x: planetWorldPosition.x,
        y: planetWorldPosition.y,
        z: planetWorldPosition.z
      }, 2000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        controls.target.set(obj.x, obj.y, obj.z);
        camera.lookAt(controls.target);
      })
      .onComplete(() => {
        isSystemLocked = false;
        isTracking = true;
        transitionState.inProgress = false;
        controls.target.copy(planetWorldPosition);
        hoverControls.reset();
        ssaaPass.enabled = false;
        settingsUI.updateSSAAStatus();
        scene.visible = false;
        settingsContainer.style.display = 'none';

        if (planetConfig.object === earth.mesh) {
          const projectsPage = document.querySelector('.projects-page');
          projectsPage.style.display = 'block';
          setTimeout(() => {
            projectsPage.classList.add('visible');
          }, 10);
        }
      });
    
    transitionState.cameraPosTween.start();
    transitionState.targetTween.start();
    transitionState.currentTween = transitionState.targetTween;
  }

  function stopTracking() {
    isSystemLocked = true;
    scene.visible = true;
    hoverControls.reset();
    if (transitionState.inProgress) {
      if (transitionState.currentTween) transitionState.currentTween.stop();
      if (transitionState.targetTween) transitionState.targetTween.stop();
      if (transitionState.cameraPosTween) transitionState.cameraPosTween.stop();
    }
    
    transitionState = {
      inProgress: true,
      type: 'toSun',
      currentTween: null,
      targetTween: null,
      cameraPosTween: null
    };

    isTracking = false;
    backButton.style.display = 'none';
    if (userQualityHighSet) {
      ssaaPass.enabled = true;
    } else {
      ssaaPass.enabled = false;
    }
    settingsUI.updateSSAAStatus();
    resetAllButtonsToNormal();

    const projectsPage = document.querySelector('.projects-page');
    if (projectsPage.classList.contains('visible')) {
      projectsPage.classList.remove('visible');
      setTimeout(() => {
        projectsPage.style.display = 'none';
      }, 500);
    }
    settingsContainer.style.display = 'flex';

    const sunPosition = new THREE.Vector3(0, 0, 0);
    const startTarget = controls.target.clone();
    
    transitionState.cameraPosTween = new TWEEN.Tween(camera.position)
      .to(defaultCameraPos, 2000)
      .easing(TWEEN.Easing.Cubic.InOut);
    
    transitionState.targetTween = new TWEEN.Tween({
        x: startTarget.x,
        y: startTarget.y,
        z: startTarget.z
      })
      .to({
        x: sunPosition.x,
        y: sunPosition.y,
        z: sunPosition.z
      }, 2000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        controls.target.set(obj.x, obj.y, obj.z);
        camera.lookAt(controls.target);
      })
      .onComplete(() => {
        isSystemLocked = false;
        isAnimationPaused = false;
        controls.enabled = true;
        controls.autoRotate = true;
        trackedObject = null;
        currentCameraDistance = null;
        controls.target.copy(sunPosition);
        camera.lookAt(controls.target);
        transitionState.inProgress = false;
        hoverControls.reset();
        hoverControls.handleStopTracking();
      });
    
    transitionState.cameraPosTween.start();
    transitionState.targetTween.start();
    transitionState.currentTween = transitionState.targetTween;
  }

  // Back button listener (unchanged)
  backButton.addEventListener('click', () => {
    if (transitionState.inProgress) return;
    stopTracking();
  });

  // Settings button functionality (unchanged)
  const bloomToggle = document.querySelector('#bloom-toggle');
  bloomToggle.addEventListener('click', () => {
    bloomEnabled = !bloomEnabled;
    bloomToggle.textContent = `Bloom: ${bloomEnabled ? 'ON' : 'OFF'}`;
    bloomPass.enabled = bloomEnabled;
  });

  const qualityToggle = document.querySelector('#quality-toggle');
  qualityToggle.addEventListener('click', () => {
    ssaaEnabled = !ssaaEnabled;
    qualityToggle.textContent = `Quality: ${ssaaEnabled ? 'High' : 'Low'}`;
    ssaaPass.enabled = ssaaEnabled;
  });

  const fastForwardToggle = document.querySelector('#fast-forward-toggle');
  let isFastForward = false;
  fastForwardToggle.addEventListener('click', () => {
    isFastForward = !isFastForward;
    simulationSpeed = isFastForward ? 50 : 1;
    fastForwardToggle.textContent = `Fast Forward: ${isFastForward ? 'ON' : 'OFF'}`;
  });

  return updateCameraForTracking;
}

function planetaryAnimations(){
      // Update predefined orbits (e.g., Earth, Mars, etc.)
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
  
      // Update binary planet system
      binaryPlanets.updateBinaryPositions(binaryPlanets.dt * simulationSpeed * 10);
  
      // Update binary system's solar orbit
      binaryPlanets.sunOrbit.revIndex = (binaryPlanets.sunOrbit.revIndex + (simulationSpeed*5)) % binaryPlanets.sunOrbit.points.length;
      const binaryPos = binaryPlanets.sunOrbit.points[binaryPlanets.sunOrbit.revIndex];
      binaryPlanets.systemGroup.position.set(binaryPos.x, 0, binaryPos.y);
  
      // Rotations (visual effects)
      sun.mesh.rotation.y += 0.007 * simulationSpeed;
      saturnRings.rotation.y += 0.002 * simulationSpeed;
}

//
  //
// ANIMATION LOOP

function animate() {
  requestAnimationFrame(animate);
  stats.begin();
  TWEEN.update();
  
  if (!isAnimationPaused) {
    planetaryAnimations();
}

  // Update camera tracking for clicked planet
  updateCameraForTracking();
  
  // Add this line to update hover tracking
  hoverControls.updateHoverTracking();
  
  composer.render();
  stats.end();
}
animate();

window.addEventListener('resize', () => {
  // Update camera aspect ratio
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  // Update renderer and composer size
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
  }
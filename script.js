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
  document.body.appendChild(stats.dom);


window.addEventListener('DOMContentLoaded', () => {
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
   let ssaaEnabled = true;

  // --- Composer with Postprocessing ---
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ssaaPass = new SSAARenderPass(scene, camera);
  ssaaPass.sampleLevel = 2;
  ssaaPass.enabled = ssaaEnabled;
  composer.addPass(ssaaPass);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, 1.4, 0.85
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
  sunLight.shadow.mapSize.width = 10000;
  sunLight.shadow.mapSize.height = 10000;
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
    this.G = 1000;           // Gravitational constant (tuned for simulation scale)
    this.m1 = 1;          // Mass of planet1
    this.m2 = 1;          // Mass of planet2 (equal masses for symmetry, adjustable for chaos)
    this.dt = 0.05;       // Time step for numerical integration

    // Planet 1 (Blue)
    this.planet1 = new CelestialBody({
      size: 60,
      materialOptions: { color: 0x3498db, roughness: 0.8, metalness: 0.3 }
    });
    this.planet1.mesh.position.set(100, 0, 0); // Initial position
    this.planet1.velocity = new THREE.Vector3(0, 0, 1); // Initial velocity

    // Planet 2 (Purple)
    this.planet2 = new CelestialBody({
      size: 45,
      materialOptions: { color: 0x9b59b6, roughness: 0.7, metalness: 0.4 }
    });
    this.planet2.mesh.position.set(-100, 0, 0); // Initial position
    this.planet2.velocity = new THREE.Vector3(0, 0, -1); // Initial velocity

    // Add planets to the system group
    this.systemGroup.add(this.planet1.mesh, this.planet2.mesh);

    // Trail setup for visualizing chaotic paths
    this.maxTrailPoints = 1000;
    this.trailPositions1 = new Float32Array(this.maxTrailPoints * 3);
    this.trailPositions2 = new Float32Array(this.maxTrailPoints * 3);
    this.trailIndex = 0;
    this.trailLength = 0;
    this.trailDelay = 100; // Delay frames before starting trails
    this.frameCount = 0;   // Frame counter
    

    // Initialize trails and orbit around the sun
    this.createOrbitTrails();
    this.createSunOrbit(sunDistance);
  }
  
  // **CreateSunOrbit**: Defines the system's orbit around the sun
  createSunOrbit(sunDistance) {
    const sunEccentricity = 0; //temp 0
    const curve = new THREE.EllipseCurve(
      0, 0, // Center at (0, 0) instead of (sunEccentricity * sunDistance, 0)
      sunDistance, sunDistance * (1 - sunEccentricity),
      0, 2 * Math.PI,
      false,
      0
    );
    const points = curve.getPoints(20000);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xc8c8c8 });
    this.sunOrbit = {
      line: new THREE.Line(geometry, material),
      points,
      revIndex: 0
    };
    this.sunOrbit.line.rotation.x = Math.PI / 2; // XZ plane
  }

  // **CreateOrbitTrails**: Sets up trails to visualize planet paths
  createOrbitTrails() {
    this.trailGeometry1 = new THREE.BufferGeometry();
    this.trailGeometry2 = new THREE.BufferGeometry();
    this.trailGeometry1.setAttribute('position', new THREE.BufferAttribute(this.trailPositions1, 3));
    this.trailGeometry2.setAttribute('position', new THREE.BufferAttribute(this.trailPositions2, 3));

    this.trailMaterial1 = new THREE.LineBasicMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.4,
      linewidth: 1
    });
    this.trailMaterial2 = new THREE.LineBasicMaterial({
      color: 0x9b59b6,
      transparent: true,
      opacity: 0.4,
      linewidth: 1
    });

    this.trail1 = new THREE.Line(this.trailGeometry1, this.trailMaterial1);
    this.trail2 = new THREE.Line(this.trailGeometry2, this.trailMaterial2);

    // Add trails to the scene (world space)
    scene.add(this.trail1, this.trail2);
  }

  // **UpdateOrbitTrails**: Updates trail positions using a circular buffer
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
  
    this.trailGeometry1.setDrawRange(0, this.trailLength);
    this.trailGeometry2.setDrawRange(0, this.trailLength);
    this.trailGeometry1.attributes.position.needsUpdate = true;
    this.trailGeometry2.attributes.position.needsUpdate = true;
  }
  
  calculateBinaryPosition(angle, planetNumber) {
    // Calculate position with eccentricity, wobble, and perturbations
    
    // Apply current eccentricity
    let distance = this.avgBinaryDistance * (1 - this.currentEccentricity * Math.cos(angle));
    
    // Apply wobble
    distance += this.avgBinaryDistance * this.currentWobble * Math.sin(this.wobbleFrequency * angle);
    
    // Calculate base position
    let x = Math.cos(angle) * distance;
    let z = Math.sin(angle) * distance;
    
    // Force Y=0 to stay in XZ plane
    let y = 0;
  
    // 3) Center of mass shift
    if (planetNumber === 1) {
      x *= (1 - this.massRatio);
      z *= (1 - this.massRatio);
    } else {
      x *= -this.massRatio;
      z *= -this.massRatio;
    }
    this.inclination = 0;
    return { x, y, z };
  }
  
  updateOrbitalParameters() {
    // Update perturbation phase
    this.perturbationPhase += 0.001;
    if (this.perturbationPhase > Math.PI * 2) this.perturbationPhase -= Math.PI * 2;
    
    // Vary eccentricity over time
    this.currentEccentricity = this.eccentricity + 0.05 * Math.sin(this.perturbationPhase);
    
    // Vary wobble over time
    this.currentWobble = this.wobbleAmplitude * Math.sin(this.perturbationPhase * 2.7);
    
    // Slowly rotate the inclination direction
    this.inclinationDirection += 0.0005;
    
    // Small random perturbations (chaotic element)
    if (Math.random() < 0.01) {
      this.currentEccentricity += (Math.random() - 0.5) * 0.02;
      this.currentWobble += (Math.random() - 0.5) * 0.01;
      
      // Keep parameters in reasonable ranges
      this.currentEccentricity = Math.max(0.05, Math.min(0.4, this.currentEccentricity));
      this.currentWobble = Math.max(-0.2, Math.min(0.2, this.currentWobble));
    }
  }
  
  updateBinaryPositions(dt) {
    const pos1 = this.planet1.mesh.position;
    const pos2 = this.planet2.mesh.position;
    const dx = pos2.x - pos1.x;
    const dz = pos2.z - pos1.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance > 0) {
        const forceMagnitude = this.G * this.m1 * this.m2 / (distance * distance);
        const forceX = forceMagnitude * (dx / distance);
        const forceZ = forceMagnitude * (dz / distance);

        this.planet1.velocity.x += (forceX / this.m1) * dt;
        this.planet1.velocity.z += (forceZ / this.m1) * dt;
        this.planet2.velocity.x += (-forceX / this.m2) * dt;
        this.planet2.velocity.z += (-forceZ / this.m2) * dt;
    }

    this.planet1.mesh.position.x += this.planet1.velocity.x * dt;
    this.planet1.mesh.position.z += this.planet1.velocity.z * dt;
    this.planet2.mesh.position.x += this.planet2.velocity.x * dt;
    this.planet2.mesh.position.z += this.planet2.velocity.z * dt;

    // Enforce XZ plane
    this.planet1.mesh.position.y = 0;
    this.planet2.mesh.position.y = 0;
    this.planet1.velocity.y = 0;
    this.planet2.velocity.y = 0;

    // Update trails (if applicable)
    this.updateOrbitTrails();

    // Rotate planets, scaled by dt
    this.planet1.mesh.rotation.y += 0.01 * dt / this.dt;
    this.planet2.mesh.rotation.y += 0.008 * dt / this.dt;

    // Update trails
    this.updateOrbitTrails();

    // Rotate planets for visual effect
    this.planet1.mesh.rotation.y += 0.01;
    this.planet2.mesh.rotation.y += 0.008;
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
    const starCount = 20000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const radius = 20000;
    
    for (let i = 0; i < starCount; i++) {
      const r = radius * Math.cbrt(Math.random());
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos((Math.random() * 2) - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.8, 0.7);
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });
    
    const starField = new THREE.Points(geometry, material);
    scene.add(starField);
  }
  createStarField();

  
  //
  // SETTINGS UI
  //
  function createSettingsUI() {
    // Create container for settings buttons
    const settingsContainer = document.createElement('div');
    settingsContainer.className = 'settings-container';
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
    settingsContainer.appendChild(bloomToggle);

    // Create SSAA toggle
    const ssaaToggle = document.createElement('button');
    ssaaToggle.className = 'space-button settings-button';
    ssaaToggle.textContent = 'SSAA: ON';
    ssaaToggle.addEventListener('click', () => {
      ssaaEnabled = !ssaaEnabled;
      ssaaToggle.textContent = `SSAA: ${ssaaEnabled ? 'ON' : 'OFF'}`;
      updatePostProcessing();
    });
    settingsContainer.appendChild(ssaaToggle);

    const fastForwardToggle = document.createElement('button');
    fastForwardToggle.className = 'space-button settings-button'; // Match your existing styling
    fastForwardToggle.textContent = 'Fast Forward: OFF';
    let isFastForward = false;

    fastForwardToggle.addEventListener('click', () => {
        isFastForward = !isFastForward;
        simulationSpeed = isFastForward ? 10 : 1; // Toggle between 1x and 10x speed
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
  }

  // Initialize settings UI
  createSettingsUI();


  //
  // BUTTON ANIMATIONS
  //

let isAnimationPaused = false;
let isTracking = false;
let trackedObject = null;
let currentCameraDistance = null;
let hoverAnimationInProgress = false;

// Add this function to handle hover animations for all planet buttons
function setupPlanetHoverAnimations() {
  const planetButtons = document.querySelectorAll('[data-planet]');
  const planetViews = {
    earth: { object: earth.mesh },
    mars: { object: mars.mesh },
    saturn: { object: saturn.mesh },
    binary: { object: binaryPlanets.systemGroup }
    // add more planets as needed
  };

  let currentHoverTween = null;
  let currentlyHoveredPlanet = null;
  let isButtonHovered = false;
  let originalCameraTarget = controls.target.clone();
  let hoverTracking = false;

  // Use a flag for hover animations only
  let hoverAnimationInProgress = false;

  function resetHoverSystem() {
    hoverTracking = false;
    currentlyHoveredPlanet = null;
    isButtonHovered = false;
    if (currentHoverTween) {
      currentHoverTween.stop();
      currentHoverTween = null;
      hoverAnimationInProgress = false;
    }
  }

  // When stopping tracking, force the original target to the sun.
  function saveOriginalCameraState() {
    originalCameraTarget = new THREE.Vector3(0, 0, 0);
  }

  function getPlanetCurrentPosition(planetMesh) {
    const position = new THREE.Vector3();
    planetMesh.getWorldPosition(position);
    return position;
  }

  function updateHoverTracking() {
    if (!hoverTracking || !currentlyHoveredPlanet || isTracking) return;
    const planetConfig = planetViews[currentlyHoveredPlanet];
    if (planetConfig && planetConfig.object) {
      const planetPosition = getPlanetCurrentPosition(planetConfig.object);
      controls.target.lerp(planetPosition, 0.1);
      camera.lookAt(controls.target);
    }
  }

  function lookAtPlanet(planetMesh) {
    // Start a hover tween (do not gate these with the click flag)
    hoverAnimationInProgress = true;
    const planetPosition = getPlanetCurrentPosition(planetMesh);
    const startTarget = controls.target.clone();
    const targetObject = { x: startTarget.x, y: startTarget.y, z: startTarget.z };

    currentHoverTween = new TWEEN.Tween(targetObject)
      .to({ x: planetPosition.x, y: planetPosition.y, z: planetPosition.z }, 800)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        controls.target.set(targetObject.x, targetObject.y, targetObject.z);
        camera.lookAt(controls.target);
      })
      .onComplete(() => {
        hoverAnimationInProgress = false;
        hoverTracking = true;
      })
      .start();

    return currentHoverTween;
  }

  function returnToOriginalView() {
    hoverAnimationInProgress = true;
    const startTarget = controls.target.clone();
    const targetObject = { x: startTarget.x, y: startTarget.y, z: startTarget.z };

    currentHoverTween = new TWEEN.Tween(targetObject)
      .to({ x: originalCameraTarget.x, y: originalCameraTarget.y, z: originalCameraTarget.z }, 800)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        controls.target.set(targetObject.x, targetObject.y, targetObject.z);
        camera.lookAt(controls.target);
      })
      .onComplete(() => {
        hoverAnimationInProgress = false;
      })
      .start();

    return currentHoverTween;
  }

  // Remove the global "animationInProgress" check from hovers—allow these to be interrupted.
  planetButtons.forEach(button => {
    const planetName = button.dataset.planet;

    button.addEventListener('mouseenter', () => {
      if (isTracking) return; // if a tracking (click) animation is running, ignore hovers
      isButtonHovered = true;
      if (currentHoverTween) {
        currentHoverTween.stop();
        currentHoverTween = null;
        hoverAnimationInProgress = false;
      }
      const planetConfig = planetViews[planetName];
      if (planetConfig && planetConfig.object) {
        currentlyHoveredPlanet = planetName;
        lookAtPlanet(planetConfig.object);
      }
    });

    button.addEventListener('mouseleave', () => {
      if (isTracking) return;
      isButtonHovered = false;
      // Use a slight delay to check for overlapping hovers.
      setTimeout(() => {
        if (!isButtonHovered && !isTracking) {
          if (currentHoverTween) {
            currentHoverTween.stop();
            currentHoverTween = null;
            hoverAnimationInProgress = false;
          }
          currentlyHoveredPlanet = null;
          returnToOriginalView();
        }
      }, 50);
    });
  });

  return {
    updateOriginalTarget: () => {
      if (!currentlyHoveredPlanet && !isTracking) {
        originalCameraTarget = controls.target.clone();
      }
    },
    // When tracking stops, force the saved target to the sun.
    handleStopTracking: () => {
      saveOriginalCameraState();
    },
    updateHoverTracking: updateHoverTracking,
    reset: resetHoverSystem
  };
}

// Update your setupUI function to integrate with hover animations
function setupUI(hoverControls) {
  const backButton = document.querySelector('.back-button');
  const planetButtons = document.querySelectorAll('[data-planet]');

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
      distance: 300, // Larger distance for a better view
      height: 80,
      angle: Math.PI * 0.6
    },
    binary: {
      object: binaryPlanets.systemGroup,
      distance: 400,
      height: 100,
      angle: Math.PI * 0.6
}
    // add more planet configurations as needed
  };

  // Flag for click-based transitions
  let clickAnimationInProgress = false;
  function calculateDarkSidePosition(planetMesh) {
    const planetPosition = new THREE.Vector3();
    planetMesh.getWorldPosition(planetPosition);
  
    const sunToPlanet = planetPosition.clone().sub(new THREE.Vector3(0, 0, 0));
    const cameraOffset = sunToPlanet.clone()
      .normalize()
      .multiplyScalar(currentCameraDistance.distance);
  
    const cameraPosition = planetPosition.clone().add(cameraOffset);
    cameraPosition.y += currentCameraDistance.height;
  
    return {
      cameraPos: cameraPosition,
      targetPos: planetPosition.clone() // Initially look at the planet, not the sun
    };
  }

  function updateCameraForTracking() {
    if (!isTracking || !trackedObject) return;

    const { cameraPos, targetPos } = calculateDarkSidePosition(trackedObject);
    camera.position.lerp(cameraPos, 0.1);
    camera.lookAt(targetPos);
    controls.target.lerp(targetPos, 0.1);
    hoverControls.updateOriginalTarget();
  }

  // Fix the startTracking function to handle Saturn properly
function startTracking(planetConfig) {
  if (clickAnimationInProgress) return;
  clickAnimationInProgress = true;

  // Stop hover stuff
  if (hoverAnimationInProgress && currentHoverTween) {
    currentHoverTween.stop();
    currentHoverTween = null;
  }
  hoverAnimationInProgress = false;

  isAnimationPaused = true;
  controls.enabled = false;
  trackedObject = planetConfig.object;
  backButton.style.display = 'flex';

  currentCameraDistance = {
    distance: planetConfig.distance,
    height: planetConfig.height
  };
  
  // Critical fix: Get the world position of the planet for Saturn
  const planetWorldPosition = new THREE.Vector3();
  planetConfig.object.getWorldPosition(planetWorldPosition);
  
  // This is the place we want to move the camera
  const { cameraPos, targetPos } = calculateDarkSidePosition(trackedObject);

  // --- TWEEN #1: Move camera to the planet, while always looking at planet ---
  new TWEEN.Tween(camera.position)
    .to({
      x: cameraPos.x,
      y: cameraPos.y,
      z: cameraPos.z
    }, 2000)
    .easing(TWEEN.Easing.Cubic.InOut)
    .onUpdate(() => {
      // Get the current world position for the planet each frame
      const currentPlanetPosition = new THREE.Vector3();
      trackedObject.getWorldPosition(currentPlanetPosition);
      
      // Continually look at the planet so there's no pop.
      camera.lookAt(currentPlanetPosition);
      // Update controls.target to match, do it here:
      controls.target.copy(currentPlanetPosition);
    })
    .onComplete(() => {
      // Get final planet position
      const finalPlanetPosition = new THREE.Vector3();
      trackedObject.getWorldPosition(finalPlanetPosition);
      
      // --- Optionally, TWEEN #2: after arrival, look back at the sun if you want ---
      const lookTarget = finalPlanetPosition.clone();
      new TWEEN.Tween(lookTarget)
        .to({
          x: targetPos.x,
          y: targetPos.y,
          z: targetPos.z
        }, 1200)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          controls.target.copy(lookTarget);
          camera.lookAt(controls.target);
        })
        .onComplete(() => {
          isTracking = true;
          clickAnimationInProgress = false;
        })
        .start();
    })
    .start();
}

  function stopTracking() {
    if (clickAnimationInProgress) return;
    clickAnimationInProgress = true;

    isTracking = false;
    controls.enabled = true;
    trackedObject = null;
    currentCameraDistance = null;
    controls.autoRotate = true;
    backButton.style.display = 'none';

    const sunPosition = new THREE.Vector3(0, 0, 0);

    new TWEEN.Tween(controls.target)
      .to({ x: sunPosition.x, y: sunPosition.y, z: sunPosition.z }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();

    new TWEEN.Tween(camera.position)
      .to(defaultCameraPos, 2000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        camera.lookAt(sunPosition);
      })
      .onComplete(() => {
        isAnimationPaused = false;
        controls.target.set(0, 0, 0);
        hoverControls.reset();
        hoverControls.handleStopTracking();
        clickAnimationInProgress = false;
      })
      .start();
  }

  planetButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (clickAnimationInProgress) return;
      const planet = button.dataset.planet;
      const view = planetViews[planet];
      if (view) {
        startTracking(view);
      }
    });
  });

  backButton.addEventListener('click', () => {
    if (clickAnimationInProgress) return;
    stopTracking();
  });

  return updateCameraForTracking;
}

//
  //
// ANIMATION LOOP

function animate() {
  requestAnimationFrame(animate);
  stats.begin();
  TWEEN.update();
  
  if (!isAnimationPaused) { // Assuming you have a pause feature
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
    binaryPlanets.updateBinaryPositions(binaryPlanets.dt * simulationSpeed);

    // Update binary system's solar orbit
    binaryPlanets.sunOrbit.revIndex = (binaryPlanets.sunOrbit.revIndex + simulationSpeed) % binaryPlanets.sunOrbit.points.length;
    const binaryPos = binaryPlanets.sunOrbit.points[binaryPlanets.sunOrbit.revIndex];
    binaryPlanets.systemGroup.position.set(binaryPos.x, 0, binaryPos.y);

    // Rotations (visual effects)
    sun.mesh.rotation.y += 0.007 * simulationSpeed;
    saturnRings.rotation.y += 0.002 * simulationSpeed;
}

  // Update camera tracking for clicked planet
  updateCameraForTracking();
  
  // Add this line to update hover tracking
  hoverControls.updateHoverTracking();
  
  composer.render();
  stats.end();
}

// Make sure to get the hover controls when setting up the UI
const hoverControls = setupPlanetHoverAnimations();
const updateCameraForTracking = setupUI(hoverControls);

animate();
});

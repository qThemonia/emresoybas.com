import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAARenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/SSAARenderPass.js';

//
// CLASS DEFINITIONS
//

// Class to create a sphere (celestial body)
class CelestialBody {
  constructor({ size, segments = 32, materialOptions = {} }) {
    this.geometry = new THREE.SphereGeometry(size, segments, segments);
    this.material = new THREE.MeshStandardMaterial(materialOptions);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
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

window.addEventListener('DOMContentLoaded', () => {
  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true });
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
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 50000);
  camera.position.set(0, 1000, 4000);
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

  // --- Composer with Postprocessing ---
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ssaaPass = new SSAARenderPass(scene, camera);
  ssaaPass.sampleLevel = 3;
  composer.addPass(ssaaPass);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, 1.4, 0.85
  );
  composer.addPass(bloomPass);

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
  scene.add(sun.mesh);

  // --- Sun Lighting ---
  const sunLight = new THREE.PointLight(0xffffff, 500000, 250000, 1.5);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  scene.add(sunLight);
  sunLight.shadow.mapSize.width = 500000;
  sunLight.shadow.mapSize.height = 500000;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 5000;

  // --- Earth ---
  const earthSize = 100;
  const earthOrbitRadius = 2000;
  const earth = new CelestialBody({
    size: earthSize,
    materialOptions: { color: 0x00FF00, roughness: 1, metalness: 0.8 }
  });
  // Note: The Earth's position will be updated along its orbit.
  scene.add(earth.mesh);
  const earthOrbit = new Orbit(earthOrbitRadius, 10000, 0xc8c8c8);
  scene.add(earthOrbit.line);

  // --- Moon ---
  const moonSize = 30;
  const moonOrbitRadius = 300;
  const moon = new CelestialBody({
    size: moonSize,
    materialOptions: { color: 0x757575, roughness: 1, metalness: 0.1 }
  });
  const moonOrbit = new Orbit(moonOrbitRadius, 1000, 0xc8c8c8);
  // Group the Moon and its orbit so that the Moon orbits Earth
  const moonGroup = new THREE.Group();
  moonGroup.add(moonOrbit.line);
  moonGroup.add(moon.mesh);
  // Attach the Moon group to the Earth so its orbit is relative to Earth
  earth.mesh.add(moonGroup);

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
  // BUTTON ANIMATIONS
  //

    let isTracking = false;
    let trackedObject = null;
    let currentCameraDistance = null;
    let isAnimationPaused = false;

  
  // Modified setupUI function
  function setupUI() {
    const backButton = document.querySelector('.back-button');
    const planetButtons = document.querySelectorAll('[data-planet]');
    
    // Default camera position for reference
    const defaultCameraPos = { x: 0, y: 1000, z: 4000 };
    const defaultTarget = { x: 0, y: 0, z: 0 };
    
    // Planet viewing configurations
    const planetViews = {
      earth: {
        object: earth.mesh,
        distance: 400, // Distance from planet to view from
        height: 30,    // Viewing height
        angle: Math.PI * 0.6  // Angle offset from sun-planet line (roughly 108 degrees)
      }
      // Add more planet configurations as needed
    };
    function animationToggle() {
        isAnimationPaused = !isAnimationPaused;
    }
    function calculateDarkSidePosition(planetMesh) {
      // Get the planet's world position
      const planetPosition = new THREE.Vector3();
      planetMesh.getWorldPosition(planetPosition);
    
      // Calculate vector from sun to planet
      const sunToPlanet = planetPosition.clone().sub(new THREE.Vector3(0, 0, 0));
      
      // To get to the dark side, we need to go in the same direction as the sun-to-planet vector
      const cameraOffset = sunToPlanet.clone()
        .normalize()
        .multiplyScalar(currentCameraDistance.distance);
      
      // Add offset to planet position to get camera position (going further in same direction)
      const cameraPosition = planetPosition.clone().add(cameraOffset);
      
      // Add height offset
      cameraPosition.y += currentCameraDistance.height;
      
      // Return the sun position (0,0,0) as the target
      return {
        cameraPos: cameraPosition,
        targetPos: new THREE.Vector3(0, 0, 0)  // Look at the sun
      };
    }
    
    function updateCameraForTracking() {
      if (!isTracking || !trackedObject) return;
    
      // Calculate the dark side camera position and sun-facing target
      const { cameraPos, targetPos } = calculateDarkSidePosition(trackedObject);
      
      // Smoothly update camera position
      camera.position.lerp(cameraPos, 0.1);
      
      // Make camera look at the sun
      camera.lookAt(targetPos);
      
      // Update controls target too for smooth transitions
      controls.target.lerp(targetPos, 0.1);
    }
    
    function startTracking(planetConfig) {
      animationToggle();
      isTracking = true;
      controls.enabled = false;
      trackedObject = planetConfig.object;
      currentCameraDistance = {
        distance: planetConfig.distance,
        height: planetConfig.height,
        angle: planetConfig.angle
      };
      controls.autoRotate = false;
      backButton.style.display = 'flex';
    
      // Calculate the destination position with sun-facing view
      const { cameraPos, targetPos } = calculateDarkSidePosition(trackedObject);
      
      // First animate to position while keeping original view
      const initialTarget = trackedObject.position.clone();
      
      // Start with camera looking at the planet
      new TWEEN.Tween(camera.position)
        .to({ 
          x: cameraPos.x,
          y: cameraPos.y,
          z: cameraPos.z
        }, 2000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          camera.lookAt(initialTarget);
        })
        .onComplete(() => {
          // After reaching position, animate the look-at target to the sun
          new TWEEN.Tween(initialTarget)
            .to(targetPos, 1000)
            .easing(TWEEN.Easing.Cubic.InOut)
            .onUpdate(() => {
              camera.lookAt(initialTarget);
              controls.target.copy(initialTarget);
            })
            .start();
        })
        .start();
    }
    
    function stopTracking() {
      isTracking = false;
      controls.enabled = true;
      trackedObject = null;
      currentCameraDistance = null;
      controls.autoRotate = true;
      backButton.style.display = 'none';
      animationToggle();
    
      // Immediately start looking at the sun
      const sunPosition = new THREE.Vector3(0, 0, 0);
      new TWEEN.Tween(controls.target)
        .to({
          x: sunPosition.x,
          y: sunPosition.y,
          z: sunPosition.z
        }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
    
      // Then animate back to default view
      new TWEEN.Tween(camera.position)
        .to(defaultCameraPos, 2000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          camera.lookAt(sunPosition);
        })
        .onComplete(() => {
          animationToggle();
        })
        .start();
    }
    
      // Handle planet button clicks
      planetButtons.forEach(button => {
        button.addEventListener('click', () => {
          const planet = button.dataset.planet;
          const view = planetViews[planet];
          
          if (view) {
            startTracking(view);
          }
        });
      });
    
      // Handle back button click
      backButton.addEventListener('click', stopTracking);
      // Add this to your animation loop
      return updateCameraForTracking;
    }
  //
  // ANIMATION LOOP
  function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  
  if (!isAnimationPaused) {
    earthOrbit.updatePosition(earth.mesh);
    moonOrbit.updatePosition(moon.mesh);
    sun.mesh.rotation.y += 0.007;
  }
  // Add this line to update camera tracking
  updateCameraForTracking();
  
  composer.render();
}

  const updateCameraForTracking = setupUI();

  animate();
});

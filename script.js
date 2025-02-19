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

let isAnimationPaused = false;
let isTracking = false;
let trackedObject = null;
let currentCameraDistance = null;
let hoverAnimationInProgress = false;

// Add this function to handle hover animations for all planet buttons
function setupPlanetHoverAnimations() {
  const planetButtons = document.querySelectorAll('[data-planet]');
  const planetViews = {
    earth: { object: earth.mesh }
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

  const defaultCameraPos = { x: 0, y: 1000, z: 4000 };

  const planetViews = {
    earth: {
      object: earth.mesh,
      distance: 130,
      height: 30,
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
      targetPos: new THREE.Vector3(0, 0, 0)  // look at the sun
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
    // This is the place we want to move the camera
    const { cameraPos, targetPos } = calculateDarkSidePosition(trackedObject);
    const planetPosition = trackedObject.position.clone();


    // --- TWEEN #1: Move camera to the planet, while always looking at planet ---
    new TWEEN.Tween(camera.position)
      .to({
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z
      }, 2000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        // Continually look at the planet so there's no pop.
        camera.lookAt(planetPosition);
        // If you want controls.target to match, do it here:
        controls.target.copy(planetPosition);
      })
      .onComplete(() => {
        // --- Optionally, TWEEN #2: after arrival, look back at the sun if you want ---
        const lookTarget = planetPosition.clone();
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
  TWEEN.update();
  
  if (!isAnimationPaused) {
    earthOrbit.updatePosition(earth.mesh);
    moonOrbit.updatePosition(moon.mesh);
    sun.mesh.rotation.y += 0.007;
  }

  // Update camera tracking for clicked planet
  updateCameraForTracking();
  
  // Add this line to update hover tracking
  hoverControls.updateHoverTracking();
  
  composer.render();
}

// Make sure to get the hover controls when setting up the UI
const hoverControls = setupPlanetHoverAnimations();
const updateCameraForTracking = setupUI(hoverControls);

animate();
});

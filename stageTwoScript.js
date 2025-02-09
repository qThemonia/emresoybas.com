import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/21.0.0/tween.esm.js';

let scene, camera, renderer, controls;
let rocket, building;
let rocketLoaded = false;
let buildingLoaded = false;
let particles;

// Global camera offset (starts close to the rocket)
let currentCameraOffset = new THREE.Vector3(-12, 10, 9);
let lookAtPos;
// Track if rocket is fully landed
const animationParams = {
  rocketLanded: false,
  landingHeight: 80,
  landingSpeed: 0.3,
  currentCameraTween: null,
  currentRocketTween: null
};

function tweenCamera(targetPosition, targetLookAt, duration = 2000) {
  // Cancel any existing camera tween
  if (animationParams.currentCameraTween) {
    animationParams.currentCameraTween.stop();
  }

  // Disable orbit controls during tween
  if (controls) controls.enabled = false;

  // Store current camera position and rotation
  const startPosition = camera.position.clone();
  const startRotation = camera.quaternion.clone();

  // Create a dummy camera to compute the target quaternion
  const dummyCamera = camera.clone();
  dummyCamera.position.copy(startPosition);
  dummyCamera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
  const targetRotation = dummyCamera.quaternion.clone();

  // Tween the camera's position
  const positionTween = new TWEEN.Tween(camera.position)
    .to(targetPosition, duration)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();

  // Tween the camera's rotation
  const rotationTween = new TWEEN.Tween(startRotation)
    .to(targetRotation, duration)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate((quaternion) => {
      camera.quaternion.copy(quaternion);
    })
    .onComplete(() => {
      if (controls) controls.enabled = true;
    })
    .start();

  animationParams.currentCameraTween = positionTween;
}

function tweenRocket(targetPosition, duration = 2000, onComplete) {
  if (animationParams.currentRocketTween) {
    animationParams.currentRocketTween.stop();
  }
  const tween = new TWEEN.Tween(rocket.position)
    .to(targetPosition, duration)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onComplete(() => {
      if (onComplete) onComplete();
    })
    .start();

  animationParams.currentRocketTween = tween;
}

// Camera follow toggle
let followRocket = true;

function createThrusterEffect() {
  const particleCount = 100;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const material = new THREE.PointsMaterial({
    size: 1,
    transparent: true,
    opacity: 0.6,
    vertexColors: true,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < particleCount * 3; i += 3) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.5;
    positions[i] = Math.cos(angle) * radius;     // x
    positions[i + 1] = -(Math.random() * 2);       // y (downward)
    positions[i + 2] = Math.sin(angle) * radius;   // z

    colors[i] = 1;                              // R
    colors[i + 1] = Math.random() * 0.5 + 0.5;    // G
    colors[i + 2] = 0;                          // B
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  particles = new THREE.Points(geometry, material);
  return particles;
}

function updateThrusterEffect() {
  if (!particles || animationParams.rocketLanded) return;

  const positions = particles.geometry.attributes.position.array;
  const particleCount = positions.length / 3;
  for (let i = 0; i < particleCount * 3; i += 3) {
    if (positions[i + 1] < -3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = 0;
      positions[i + 2] = Math.sin(angle) * radius;
    }
    positions[i + 1] -= 0.1;
  }
  particles.geometry.attributes.position.needsUpdate = true;
}

function initScene() {
  scene = new THREE.Scene();
  // The scene’s background can remain as your desired blue.
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  // Set the canvas’s initial opacity to 0 (it will fade in from black)
  renderer.domElement.style.opacity = 0;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const loader = new GLTFLoader();

  // Load the building
  loader.load(
    'rss/apt/scene.gltf',
    (gltf) => {
      building = gltf.scene;
      building.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      building.scale.set(1, 1, 1);
      building.position.set(-550, 0, 0);
      scene.add(building);

      buildingLoaded = true;
      checkAllAssetsLoaded();
    },
    undefined,
    (error) => console.error('Error loading building:', error)
  );

  // Load the rocket
  loader.load(
    'rss/rocket/scene.gltf',
    (gltf) => {
      rocket = gltf.scene;
      rocket.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      rocket.position.set(50, 150, -20);
      scene.add(rocket);

      const thruster = createThrusterEffect();
      rocket.add(thruster);
      thruster.position.set(-12, 2, 0);

      rocketLoaded = true;
      checkAllAssetsLoaded();
      // Do not start the descent yet; that will happen after the fade in.
    },
    undefined,
    (error) => console.error('Error loading rocket:', error)
  );

  window.addEventListener('resize', onWindowResize);
  animate();
}

function checkAllAssetsLoaded() {
  if (buildingLoaded && rocketLoaded) {
    // Remove the cover if present, then start the scene startup sequence.
    const cover = document.getElementById("cover");
    if (cover) {
      cover.style.opacity = "0";
      setTimeout(() => {
        cover.remove();
        startScene();
      }, 500);
    } else {
      startScene();
    }
  }
}

// startScene() now sets the camera to look directly at the rocket before fading in,
// then fades in more slowly from black.
function startScene() {
  const emreText = document.getElementById("emre");
  if (emreText) {
    // Immediately show the text in yellow.
    emreText.style.color = "#FFD700";
    emreText.style.opacity = "1";
  }
  
  // First, fade out the text BEFORE starting the scene fade-in.
  new TWEEN.Tween({ opacity: 1 })
    .to({ opacity: 0 }, 1500) // Fade text out over 1500ms (adjust as needed)
    .easing(TWEEN.Easing.Cubic.InOut)
    .onUpdate(function (obj) {
      if (emreText) {
        emreText.style.opacity = obj.opacity;
      }
    })
    .onComplete(() => {
      // Once the text has faded out, position the camera correctly.
      const rocketPos = new THREE.Vector3();
      rocket.getWorldPosition(rocketPos);
      const desiredPos = rocketPos.clone().add(currentCameraOffset);
      camera.position.copy(desiredPos);
      // Assign to the global variable, not a new local constant.
      lookAtPos = new THREE.Vector3(rocketPos.x + 500, rocketPos.y, -10000);
      camera.lookAt(lookAtPos);
      
      // Now fade in the scene from black over 2000ms.
      let fadeObj = { opacity: 0 };
      new TWEEN.Tween(fadeObj)
        .to({ opacity: 1 }, 2000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          renderer.domElement.style.opacity = fadeObj.opacity;
        })
        .onComplete(() => {
          // Once the scene fade-in is complete, start the rocket descent.
          startDescentAnimation();
          // Tween the camera offset's z from 9 to 150 so that the camera backs away during descent.
          const descentDuration = (rocket.position.y - animationParams.landingHeight) * 100;
          new TWEEN.Tween({ z: currentCameraOffset.z })
            .to({ z: 150 }, descentDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(function (obj) {
              currentCameraOffset.z = obj.z;
            })
            .start();
        })
        .start();
    })
    .start();
}


function startDescentAnimation() {
  const startPosition = rocket.position.clone();
  const targetPosition = new THREE.Vector3(
    startPosition.x,
    animationParams.landingHeight,
    startPosition.z
  );
  const distance = startPosition.y - animationParams.landingHeight;
  const duration = distance * 100; // Adjust the multiplier as needed

  const updateDuringDescent = () => {
    if (!animationParams.rocketLanded) {
      updateThrusterEffect();
      updateCamera();
    }
  };

  tweenRocket(targetPosition, duration, () => {
    animationParams.rocketLanded = true;
    // (Load your UI elements here if needed.)
  });

  if (animationParams.currentRocketTween) {
    animationParams.currentRocketTween.onUpdate(updateDuringDescent);
  }
}

// updateCamera() uses the current camera offset and, during the rocket descent,
// makes the camera look at (rocket.x, rocket.y, -100). (After fade-in the descent begins.)
function updateCamera() {
  if (!rocket || !followRocket) return;
  const rocketPos = new THREE.Vector3();
  rocket.getWorldPosition(rocketPos);

  const desiredPos = rocketPos.clone().add(currentCameraOffset);
  camera.position.lerp(desiredPos, 0.1);

  // Use the globally defined lookAtPos.
  camera.lookAt(lookAtPos);
}


function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  if (!animationParams.rocketLanded) {
    updateThrusterEffect();
  }
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function moveToView(position, lookAt, duration = 2000) {
  followRocket = false;
  tweenCamera(
    new THREE.Vector3(...position),
    new THREE.Vector3(...lookAt),
    duration
  );
}

function moveToFrontView() {
  moveToView([0, 5, 10], [0, 0, 0], 1500);
}

function moveToTopView() {
  moveToView([0, 15, 0], [0, 0, 0], 2000);
}

function moveToDiagonalView() {
  moveToView([10, 10, 10], [0, 0, 0], 2000);
}

document.addEventListener('DOMContentLoaded', initScene);

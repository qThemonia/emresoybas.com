import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let rocket, building;
let rocketLoaded = false;
let buildingLoaded = false;
let particles;

// Track if rocket is fully landed
const animationParams = {
    rocketLanded: false,
    landingHeight: 80,
    landingSpeed: 0.3
};

// Camera follow toggle
let followRocket = true;

function createThrusterEffect() {
  // Create particle geometry
  const particleCount = 1000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  // Create particle material
  const material = new THREE.PointsMaterial({
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending
  });

  // Initialize particles with random positions
  for (let i = 0; i < particleCount * 3; i += 3) {
      // Random position within a cone shape
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      positions[i] = Math.cos(angle) * radius;     // x
      positions[i + 1] = -(Math.random() * 2);     // y (downward)
      positions[i + 2] = Math.sin(angle) * radius; // z

      // Color gradient from white to orange
      colors[i] = 1;     // R
      colors[i + 1] = Math.random() * 0.5 + 0.5; // G
      colors[i + 2] = 0; // B
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
      // Reset particles that have moved too far down
      if (positions[i + 1] < -3) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 0.5;
          positions[i] = Math.cos(angle) * radius;
          positions[i + 1] = 0;
          positions[i + 2] = Math.sin(angle) * radius;
      }
      
      // Move particles downward
      positions[i + 1] -= 0.1;
  }

  particles.geometry.attributes.position.needsUpdate = true;
}

function initScene() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    // Camera setup
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Controls
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

    // Load models
    const loader = new GLTFLoader();

    // Load building model
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
        building.position.set(-550,0,0);
        scene.add(building);

        buildingLoaded = true;
        checkAllAssetsLoaded();
      },
      undefined,
      (error) => {
        console.error('Error loading building:', error);
      }
    );

    // Load rocket model
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
            thruster.position.set(-12, -2, 0); // Adjust position relative to rocket

        rocketLoaded = true;
        checkAllAssetsLoaded();
      },
      undefined,
      (error) => {
        console.error('Error loading rocket:', error);
      }
    );

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Check if both building and rocket are loaded
function checkAllAssetsLoaded() {
    if (buildingLoaded && rocketLoaded) {
        // Fade out the cover
        const cover = document.getElementById("cover");
        if (cover) {
            cover.style.opacity = "0";
            setTimeout(() => {
              cover.remove();
            }, 500);
        }
    }
}

function descendRocket(){
  
    // If we haven't landed yet, descend the rocket
    if (rocket && !animationParams.rocketLanded) {
      if (rocket.position.y > animationParams.landingHeight) {
          rocket.position.y -= animationParams.landingSpeed;
          updateThrusterEffect();
      } else {
          animationParams.rocketLanded = true;
          // Once landed, stop following (if desired)
          followRocket = true; 
          // Or keep followRocket = true if you want the camera to remain locked
      }
  }

  // If we are supposed to follow the rocket, override controls
  if (rocket && followRocket) {
    // Get rocket position
    const rocketPos = new THREE.Vector3();
    rocket.getWorldPosition(rocketPos);
    
    // Set camera position to be in front of rocket
    const cameraOffset = new THREE.Vector3(-12, 10, 25);
    const desiredCameraPos = rocketPos.clone().add(cameraOffset);
    camera.position.lerp(desiredCameraPos, 0.1);

    // Create a point in front of the camera to look at
    // This is key - we're creating a point that's straight ahead of the camera
    const lookAtPoint = camera.position.clone();
    lookAtPoint.z -= 100; // Look 100 units forward
    
    // Make camera look at this point instead of the rocket
    camera.lookAt(lookAtPoint);
} else {
      // If not following rocket, or once rocket is landed
      // you can re-enable controls
      controls.enabled = true;
      // Update controls normally
      controls.update();
  }

}
// Animation loop
function animate() {
    requestAnimationFrame(animate);
    descendRocket();
    renderer.render(scene, camera);
}

// Wait for DOM content
document.addEventListener('DOMContentLoaded', initScene);

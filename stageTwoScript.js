import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let rocket, building;
let rocketLoaded = false;
let buildingLoaded = false;

// Track if rocket is fully landed
const animationParams = {
    rocketLanded: false,
    landingHeight: 2,
    landingSpeed: 0.05
};

// Camera follow toggle
let followRocket = true;

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
        building.scale.set(10, 10, 10);
        building.rotation.x = Math.PI / 2;
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
        rocket.scale.set(0.2, 0.2, 0.2);
        rocket.position.set(0, 10, 0);
        scene.add(rocket);

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

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // If we haven't landed yet, descend the rocket
    if (rocket && !animationParams.rocketLanded) {
        if (rocket.position.y > animationParams.landingHeight) {
            rocket.position.y -= animationParams.landingSpeed;
        } else {
            animationParams.rocketLanded = true;
            // Once landed, stop following (if desired)
            followRocket = false; 
            // Or keep followRocket = true if you want the camera to remain locked
        }
    }

    // If we are supposed to follow the rocket, override controls
    if (rocket && followRocket) {
        // Example offset: behind and above the rocket
        const offset = new THREE.Vector3(0, 5, 15); 
        
        // Get rocket world position
        const rocketPos = new THREE.Vector3();
        rocket.getWorldPosition(rocketPos);
        
        // Desired camera position is rocket position plus offset
        const desiredCameraPos = rocketPos.clone().add(offset);

        // Smoothly interpolate camera position for a less rigid motion
        camera.position.lerp(desiredCameraPos, 0.1);

        // Always look at the rocket
        camera.lookAt(rocketPos);

        // Optionally disable OrbitControls to prevent user from interfering
        controls.enabled = false;
    } else {
        // If not following rocket, or once rocket is landed
        // you can re-enable controls
        controls.enabled = true;
        // Update controls normally
        controls.update();
    }

    renderer.render(scene, camera);
}

// Wait for DOM content
document.addEventListener('DOMContentLoaded', initScene);

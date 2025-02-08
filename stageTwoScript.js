import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let rocket, building;
let rocketLoaded = false;
let buildingLoaded = false;
let particles, smokeParticles;

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
  const particleCount = 100;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  // Create particle material
  const material = new THREE.PointsMaterial({
      size: 1,
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
function createSmokeEffect() {
  const particleCount = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);
  const opacities = new Float32Array(particleCount);

  // Create a sprite texture for smoke particles
  const sprite = new THREE.TextureLoader().load(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAMUSURBVFiFvddvqJ1jGAfwz3POtmOsNcLqnMQfkRBRJEmlCSWUf0VeKKX8K0qkvBElQhFeUIqUvPCCylukSFKUPxV5QfmXzDnHMY12tjOb7ezu57q8uO/Tfs9z9jx7Opdz1dNTz3Pfz/f+Xs91X/d93c/B+rELS7EaS7AQ8zATp+A4jmIvvsf3+A5f4wBeHs8NW/A4vkR/nfoKj+G08Yx8Cr7D4Sm0up7Dc2PNeAX2VUaYi4twGRZhAS7EmViEOViBAcFhR/AD3sNz+HAkwDx8NmLANbgHd+BSzEjAdqGHg/gS72AffsJfOIBf8Sf6hZ3qC4KOwmZ0cS1m4+ms3xEBe4QpXY+HhOltAy04jF14C2/iHXyPYyP4zcLluBo34Xph54rA64XjuXnYhd14Dq8JRzNR9Au79Dgexk1Yilki8LvxBF4SdnGy6OJJrMVC4QTW4kO0JwEyFu3Gm7gDMwQBt+MF/DOFwHU9h9sxVxBwB17FvzMInGsvrsPpmC9M+5szDJrrc9yImViIV3B0FgBzfYJVaAlH+scsAuf6UDjatnDWc0oHD+AsQcCnEwRO5T+Iq4SpfbVmzN9YgSZOxhsTBM7DvxIz0cA5wnmtDQGAXViFhiDgkwkCJ+KPsCwDPpEe+CgePy7s2nNYhuuxDPsF5WwX1HEhVgyPNUvHbwkvlD76BPU7B7fgLmHKm/inoIMDwgvpgOCog4IDv8cefIpP8DH24klhV+/FzViDC3C2oJSzhCmehQZW4n7hWXXwwBii0RIc0RHs1xFEYlAQkyEMYT8G4/VQPDcY+w3Gc0Px3qEY51AcYyiO2Y/nvngMx3sOVX7X/tD4GG/jNqwVpriJFk6M14fjr9lxnBGPZ8Uys3J/zMKpgug0MA9nCwv4gfDm+w0b8fD/HHhIEIZuvDbxeHw4m9IXhWdxm/DKbMeyZ8Sy5+LceH1u/N2OZdqxfif27cZrg3HMgRh7KF7rj7H6MSu9Qcn4BwF+s5dexYNwAAAAAElFTkSuQmCC'
  );

  // Initialize particles with random positions
  for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 2;      // x
      positions[i + 1] = Math.random() * -2;         // y
      positions[i + 2] = (Math.random() - 0.5) * 2;  // z
      
      // Initialize scales and opacities
      const index = i / 3;
      scales[index] = Math.random() * 0.5 + 0.5;
      opacities[index] = Math.random() * 0.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

  // Create smoke material
  const material = new THREE.PointsMaterial({
      size: 2,
      map: sprite,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false
  });

  smokeParticles = new THREE.Points(geometry, material);
  return smokeParticles;
}

function updateSmokeEffect() {
  if (!smokeParticles) return;

  const positions = smokeParticles.geometry.attributes.position.array;
  const scales = smokeParticles.geometry.attributes.scale.array;
  const opacities = smokeParticles.geometry.attributes.opacity.array;
  const particleCount = positions.length / 3;

  // Get height ratio for smoke intensity
  const heightRatio = (rocket.position.y - animationParams.landingHeight) / 
                     (150 - animationParams.landingHeight); // 150 is initial height
  
  for (let i = 0; i < particleCount * 3; i += 3) {
      // Move particles outward and upward
      positions[i] *= 1.02;     // Spread X
      positions[i + 2] *= 1.02; // Spread Z
      positions[i + 1] += 0.1;  // Rise Y

      const index = i / 3;
      
      // Fade out particles as they rise
      opacities[index] -= 0.01;
      scales[index] += 0.01;

      // Reset particles that have faded out
      if (opacities[index] <= 0) {
          // More spread as rocket gets closer to ground
          const spread = 1 + (1 - heightRatio) * 2;
          positions[i] = (Math.random() - 0.5) * spread;
          positions[i + 1] = Math.random() * -2;
          positions[i + 2] = (Math.random() - 0.5) * spread;
          
          scales[index] = Math.random() * 0.5 + 0.5;
          opacities[index] = Math.random() * 0.5 * (1 - heightRatio);
      }
  }

  smokeParticles.geometry.attributes.position.needsUpdate = true;
  smokeParticles.geometry.attributes.scale.needsUpdate = true;
  smokeParticles.geometry.attributes.opacity.needsUpdate = true;
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

            const smoke = createSmokeEffect();
            rocket.add(smoke);
            smoke.position.set(-12, -2, 0);

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
          updateSmokeEffect();
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

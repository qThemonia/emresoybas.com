import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Lensflare, LensflareElement } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/objects/Lensflare.js';

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 3, 13);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Composer with bloom pass
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // Bloom intensity
    1.4, // Bloom radius
    0.85 // Bloom threshold
);
composer.addPass(bloomPass);

let bloomEnabled = true;
function bloomToggle() {
    if (bloomEnabled) {
        composer.removePass(bloomPass);
    } else {
        composer.addPass(bloomPass);
    }
    bloomEnabled = !bloomEnabled;
}

document.getElementById("bloomToggleButton").addEventListener("click", bloomToggle);

// Set up PointLight (sunLight) and Lensflare separately from sunSphere
const sunLight = new THREE.PointLight(0xffffff, 20, 100, 2); // Increase decay for a more natural falloff
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
scene.add(sunLight);

// Lensflare setup with explicit load confirmation
const lensflare = new Lensflare();
const textureLoader = new THREE.TextureLoader();
textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png', (textureFlare) => {
    lensflare.addElement(new LensflareElement(textureFlare, 500, 0, new THREE.Color(0xffffbb))); // Add slight color tint
    sunLight.add(lensflare);
});

// sunSphere setup
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.7
});
const sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
sunSphere.position.set(0, 0, 0);
scene.add(sunSphere); // Add separately from sunLight

// earthSphere setup
const earthGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    roughness: 1,
    metalness: 0.1
});
const earthSphere = new THREE.Mesh(earthGeometry, earthMaterial);
earthSphere.castShadow = true;
earthSphere.receiveShadow = true;
earthSphere.position.set(0, 0, 5);
scene.add(earthSphere);

// Set up shadow properties for sunLight
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;

// Create an elliptical orbit path for the earth
const curve = new THREE.EllipseCurve(0, 0, 5, 5, 0, 2 * Math.PI, true);
const points = curve.getPoints(1000);
const earthOrbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
const earthOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xc8c8c8 });
const curveObject = new THREE.Line(earthOrbitGeometry, earthOrbitMaterial);
curveObject.lookAt(0, 1, 0);
scene.add(curveObject);


let earthRevIndex = 0;
function earthRevolution(){
    const position = points[earthRevIndex];
    earthSphere.position.set(position.x, 0,position.y);
    earthRevIndex = (earthRevIndex + 1) % points.length;
}

function animate() {
    requestAnimationFrame(animate);

    earthRevolution();
    sunSphere.rotation.y += 0.002; // Add sun rotation for effect
    composer.render();
    controls.update();
}

animate();

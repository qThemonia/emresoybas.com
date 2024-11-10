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

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500000);
camera.position.set(0, 5000, 20000);
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
const sunLight = new THREE.PointLight(0xffffff, 500000, 250000, 1.5); // Increase decay for a more natural falloff
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
scene.add(sunLight);

// Set up shadow properties for sunLight
sunLight.shadow.mapSize.width = 500000;
sunLight.shadow.mapSize.height = 500000;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 5000;

// sunSphere setup
let realism = false;
let sunSize, sunSizeF = 200, sunSizeR = 109;
let earthSize, earthSizeF = 100, earthSizeR = 1;
let earthOrbit, earthOrbitF = 2000, earthOrbitR = 93000;
let moonSize, moonSizeF = 30, moonSizeR = 0.25;
let moonOrbit, moonOrbitF = 300, moonOrbitR = 384;


// realism (distance + size) setup
if(realism){
    sunSize = sunSizeR;
    earthSize = earthSizeR;
    earthOrbit = earthOrbitR;
    moonSize = moonSizeR;
    moonOrbit = moonOrbitR;
}
else{
    sunSize = sunSizeF;
    earthSize = earthSizeF;
    earthOrbit = earthOrbitF;
    moonSize = moonSizeF;
    moonOrbit = moonOrbitF;
}
//PLANETS

const sunGeometry = new THREE.SphereGeometry(sunSize, 32, 32);
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
const earthGeometry = new THREE.SphereGeometry(earthSize, 32, 32);
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

//MOONS

const moonGeometry = new THREE.SphereGeometry(moonSize, 32, 32);
const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0x747575,
    roughness: 1,
    metalness: 0.1
});
const moonSphere = new THREE.Mesh(moonGeometry, moonMaterial);
moonSphere.castShadow = true;
moonSphere.receiveShadow = true;

// Create an elliptical orbit path for the earth
const earthCurve = new THREE.EllipseCurve(0, 0, earthOrbit, earthOrbit, 0, 2 * Math.PI, true);
const earthPoints = earthCurve.getPoints(10000);
const earthOrbitGeometry = new THREE.BufferGeometry().setFromPoints(earthPoints);
const earthOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xc8c8c8 });
const earthCurveObject = new THREE.Line(earthOrbitGeometry, earthOrbitMaterial);
earthCurveObject.rotation.x = Math.PI / 2;
scene.add(earthCurveObject);

const moonCurve = new THREE.EllipseCurve(0, 0, moonOrbit, moonOrbit, 0, 2 * Math.PI, true);
const moonPoints = moonCurve.getPoints(1000);
const moonOrbitGeometry = new THREE.BufferGeometry().setFromPoints(moonPoints);
const moonOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xc8c8c8});
const moonCurveObject = new THREE.Line(moonOrbitGeometry, moonOrbitMaterial);
moonCurveObject.rotation.x = Math.PI / 2;
scene.add(moonCurveObject);

const moonGroup = new THREE.Group();
moonGroup.add(moonCurveObject);
moonGroup.add(moonSphere);
earthSphere.add(moonGroup);

let earthRevIndex = 0;
function earthRevolution(){
    const earthPosition = earthPoints[earthRevIndex];
    earthSphere.position.set(earthPosition.x, 0, earthPosition.y);
    earthRevIndex = (earthRevIndex + 1) % earthPoints.length;
}

let moonRevIndex = 0;
function moonRevolution(){
    const moonPosition = moonPoints[moonRevIndex];
    moonSphere.position.set(moonPosition.x, 0, moonPosition.y);
    moonRevIndex = (moonRevIndex + 1) % moonPoints.length;
}

function animate() {
    requestAnimationFrame(animate);

    earthRevolution();
    moonRevolution();
    sunSphere.rotation.y += 0.002; // Add sun rotation for effect
    composer.render();
    controls.update();
}

animate();

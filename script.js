import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
camera.position.set( 0, 0, 10 );
camera.lookAt( 0, 0, 0 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.autoRotate = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x555555);

// geometry
const geometry = new THREE.BoxGeometry( 1, 1, 1);
const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );

// line
const cube = new THREE.Mesh( geometry, material);
cube.castShadow = true;
cube.receiveShadow = false;
cube.position.set(0, 0, 0);
scene.add( cube );

const planeGeometry = new THREE.PlaneGeometry(30, 20, 1, 1);
const planeMaterial = new THREE.MeshStandardMaterial( {color: 0x00ff00} );
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.receiveShadow = true;
plane.position.set (0, 0, -10);
scene.add(plane);
const light = new THREE.PointLight( 0xffffff, 7, 100 );
light.position.set( 1, 0, 1 );
light.castShadow = true; // default false
scene.add( light );

//Set up shadow properties for the light
light.shadow.mapSize.width = 2048; // default
light.shadow.mapSize.height = 2048; // default
light.shadow.camera.near = 0.5; // default
light.shadow.camera.far = 100; // default
function animate() {
    cube.rotation.y += 0.01;
    cube.rotation.x += 0.01;
	renderer.render( scene, camera );
    controls.update(0.01);
}
renderer.setAnimationLoop( animate );
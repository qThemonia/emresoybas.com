import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
camera.position.set( 0, 0, 10 );
camera.lookAt( 0, 0, 0 );

const scene = new THREE.Scene();


// geometry
const geometry = new THREE.BoxGeometry( 1, 1, 1);
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );

// line
const cube = new THREE.Mesh( geometry, material);
scene.add( cube );

const light = new THREE.PointLight (0xffffff, 1, 100);
light.position.set(0, 0, 0);
light.castShadow = true;
scene.add(light);

function animate() {
    cube.rotation.y += 0.01;
    cube.rotation.x += 0.01;
	renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );
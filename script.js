    import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
    import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
    import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';
    import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
    import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
    import { SSAARenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/SSAARenderPass.js';
    import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {})});
    // ========== [ Three.js Scene Setup ] ==========
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute'; // Add this
    renderer.domElement.style.top = '0';            // Add this
    renderer.domElement.style.left = '0';           // Add this
    document.body.appendChild(renderer.domElement);

    // Immediately schedule a fade-in of the canvas
    // (our CSS will handle the transition; we just need to set opacity to 1)
    requestAnimationFrame(() => {
    renderer.domElement.style.opacity = "1";
    });

    const camera = new THREE.PerspectiveCamera(
    45, 
    window.innerWidth / window.innerHeight, 
    1, 
    500000
    );
    camera.position.set(0, 5000, 20000);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    // Composer with bloom pass
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const ssaaPass = new SSAARenderPass(scene, camera);
    ssaaPass.sampleLevel = 3;
    composer.addPass(ssaaPass);
    camera.layers.enable(1);

    const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // intensity
    1.4,  // radius
    0.85  // threshold
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

    // ========== [ Lights ] ==========
    const sunLight = new THREE.PointLight(0xffffff, 500000, 250000, 1.5);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    scene.add(sunLight);

    sunLight.shadow.mapSize.width = 500000;
    sunLight.shadow.mapSize.height = 500000;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 5000;

    // ========== [ Realism Toggle Setup ] ==========
    let realism = true;
    let sunSize, sunSizeF = 200, sunSizeR = 109;
    let earthSize, earthSizeF = 100, earthSizeR = 1;
    let earthOrbit, earthOrbitF = 2000, earthOrbitR = 93000;
    let moonSize, moonSizeF = 30, moonSizeR = 0.273;
    let moonOrbit, moonOrbitF = 300, moonOrbitR = 30;

    // => We'll call realismToggle() once at the end to ensure realistic sizes by default
    function realismToggle() {
    realism = !realism;
    if (realism) {
        sunSize = sunSizeR;
        earthSize = earthSizeR;
        earthOrbit = earthOrbitR;
        moonSize = moonSizeR;
        moonOrbit = moonOrbitR;
        camera.position.set(0, 5000, 200000);
        camera.far = 500000;
    } else {
        sunSize = sunSizeF;
        earthSize = earthSizeF;
        earthOrbit = earthOrbitF;
        moonSize = moonSizeF;
        moonOrbit = moonOrbitF;
        camera.position.set(0, 1000, 4000);
        camera.far = 50000;
    }
    camera.updateProjectionMatrix();

    // Update sun size
    sunSphere.geometry.dispose();
    sunSphere.geometry = new THREE.SphereGeometry(sunSize, 32, 32);

    // Update earth size and orbit
    earthSphere.geometry.dispose();
    earthSphere.geometry = new THREE.SphereGeometry(earthSize, 32, 32);

    const newEarthCurve = new THREE.EllipseCurve(0, 0, earthOrbit, earthOrbit, 0, 2 * Math.PI, true);
    const newEarthPoints = newEarthCurve.getPoints(10000);
    earthOrbitGeometry.setFromPoints(newEarthPoints);
    earthPoints = newEarthPoints;

    // Update moon size and orbit
    moonSphere.geometry.dispose();
    moonSphere.geometry = new THREE.SphereGeometry(moonSize, 32, 32);

    const newMoonCurve = new THREE.EllipseCurve(0, 0, moonOrbit, moonOrbit, 0, 2 * Math.PI, true);
    const newMoonPoints = newMoonCurve.getPoints(1000);
    moonOrbitGeometry.setFromPoints(newMoonPoints);
    moonPoints = newMoonPoints;

    earthRevIndex = 0;
    moonRevIndex = 0;
    }

    // ========== [ Planets ] ==========
    // Sun
    const sunGeometry = new THREE.SphereGeometry(sunSize, 32, 32);
    const sunMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 2.5,
    transparent: true,
    opacity: 0.7
    });
    const sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
    sunSphere.position.set(0, 0, 0);
    scene.add(sunSphere);

    // Earth
    const earthGeometry = new THREE.SphereGeometry(earthSize, 32, 32);
    const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0x00FF00,
    roughness: 1,
    metalness: 0.8
    });
    const earthSphere = new THREE.Mesh(earthGeometry, earthMaterial);
    earthSphere.castShadow = true;
    earthSphere.receiveShadow = true;
    earthSphere.layers.disable(1);
    scene.add(earthSphere);

    // Moon
    const moonGeometry = new THREE.SphereGeometry(moonSize, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0x757575,
    roughness: 1,
    metalness: 0.1
    });
    const moonSphere = new THREE.Mesh(moonGeometry, moonMaterial);
    moonSphere.castShadow = true;
    moonSphere.receiveShadow = true;
    moonSphere.layers.disable(1);

    // ========== [ Orbits ] ==========
    // Earth orbit
    const earthCurve = new THREE.EllipseCurve(0, 0, earthOrbit, earthOrbit, 0, 2 * Math.PI, true);
    let earthPoints = earthCurve.getPoints(10000);
    const earthOrbitGeometry = new THREE.BufferGeometry().setFromPoints(earthPoints);
    const earthOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xc8c8c8 });
    const earthCurveObject = new THREE.Line(earthOrbitGeometry, earthOrbitMaterial);
    earthCurveObject.rotation.x = Math.PI / 2;
    scene.add(earthCurveObject);

    // Moon orbit
    const moonCurve = new THREE.EllipseCurve(0, 0, moonOrbit, moonOrbit, 0, 2 * Math.PI, true);
    let moonPoints = moonCurve.getPoints(1000);
    const moonOrbitGeometry = new THREE.BufferGeometry().setFromPoints(moonPoints);
    const moonOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xc8c8c8});
    const moonCurveObject = new THREE.Line(moonOrbitGeometry, moonOrbitMaterial);
    moonCurveObject.rotation.x = Math.PI / 2;
    scene.add(moonCurveObject);

    const moonGroup = new THREE.Group();
    moonGroup.add(moonCurveObject);
    moonGroup.add(moonSphere);
    earthSphere.add(moonGroup);

    // ========== [ Revolutions ] ==========

    let earthRevIndex = 0;
    function earthRevolution() {
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

    function revolutions() {
    earthRevolution();
    moonRevolution();
    }
    function typeWriter(elementId, text, speed, onComplete) {
        const el = document.getElementById(elementId);
        const cursorEl = document.getElementById("cursor");
      
        let i = 0;
        let typedText = ""; // accumulates typed characters
      
        function typing() {
          if (i < text.length) {
            // Add one character
            typedText += text.charAt(i);
            i++;
            // Update the element's text
            el.textContent = typedText;
            // Now put the cursor right after the newly typed text
            el.appendChild(cursorEl);
      
            setTimeout(typing, speed);
          } else {
            // Done typing this line
            if (onComplete) onComplete();
          }
        }
        typing();
      }

    // Start off in realism mode
    realismToggle();

    function createStarField() {
        const starCount = 20000;
        const geometry = new THREE.BufferGeometry();
    
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
    
        const radius = 20000;
    
        for (let i = 0; i < starCount; i++) {
        // ~~~ POSITION ~~~
        const r = radius * Math.cbrt(Math.random());
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos((Math.random() * 2) - 1);
    
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
    
        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        /* ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
         >>>>> I DON'T WANT TO WORK ON THIS ANYMORE <<<<<<<<<< 
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ */
        
        // ~~~ COLOR ~~~

        let color = new THREE.Color();
        color.setHSL(Math.random(), 0.8, 0.7);
        let rCol = color.r;
        let gCol = color.g;
        let bCol = color.b;
    
        colors[i * 3 + 0] = rCol;
        colors[i * 3 + 1] = gCol;
        colors[i * 3 + 2] = bCol;
        }
    
        // assn to geom
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
        
        const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true, // THIS is important to see variation
        transparent: true,
        opacity: 0.8
        });
    
        const starField = new THREE.Points(geometry, material);
        scene.add(starField);
    }
    
    
    createStarField();


// 2) After DOM load, wait a moment, then show #introText and type lines
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onPointerUp(event) {
    // Convert screen coords to normalized device coords
    pointer.x =  ( event.clientX / window.innerWidth )  *  2 - 1;
    pointer.y = -( event.clientY / window.innerHeight ) *  2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        // If the first intersect is the sun, do the splash
        if (intersects[0].object === sunSphere) {
        splashOutSun();
        }
    }
    }
    document.addEventListener('click', onPointerUp, false);
    // 4) The "splash" – fill screen with the sun’s color from its position
   
    function splashOutSun() {
        const sunColor = '#' + sunSphere.material.color.getHexString();
    const sunPos = new THREE.Vector3().copy(sunSphere.position);
    sunPos.project(camera);
    const screenX = (sunPos.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-sunPos.y * 0.5 + 0.5) * window.innerHeight;
    
    const splash = document.getElementById('sunSplash');
    const emreDiv = document.getElementById('emre'); // Get the Emre div
    
    // Set up intersection observer to watch for overlap
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                emreDiv.style.opacity = '1'; // Show the Emre div
                observer.disconnect(); // Stop observing once shown
            }
        });
    });
    
    // Start observing the Emre div
    observer.observe(emreDiv);
    
    splash.style.backgroundColor = sunColor;
    splash.style.left = `${screenX}px`;
    splash.style.top = `${screenY}px`;
    
    const maxDim = Math.max(window.innerWidth, window.innerHeight) * 3;
    splash.style.width = `${maxDim}px`;
    splash.style.height = `${maxDim}px`;
    splash.style.marginLeft = `-${maxDim / 2}px`;
    splash.style.marginTop = `-${maxDim / 2}px`;
    
    // Add transition listener to update during animation
    splash.addEventListener('transitionrun', () => {
        // Create a function to check if splash covers Emre div
        const checkOverlap = () => {
            const splashRect = splash.getBoundingClientRect();
            const emreRect = emreDiv.getBoundingClientRect();
            
            // Check if splash has grown to cover Emre
            if (splashRect.left <= emreRect.left &&
                splashRect.right >= emreRect.right &&
                splashRect.top <= emreRect.top &&
                splashRect.bottom >= emreRect.bottom) {
                emreDiv.style.opacity = '1';
                cancelAnimationFrame(checkId);
            }
        };
        
        // Check continuously during transition
        let checkId = requestAnimationFrame(function check() {
            checkOverlap();
            checkId = requestAnimationFrame(check);
        });
    });
    
    splash.offsetWidth;  // Force reflow

    requestAnimationFrame(() => {
        splash.style.transform = 'scale(1)';
        splash.style.backgroundColor = '#000000';
    });
        // 8. Handle completion
        splash.addEventListener('transitionend', (event) => {
            console.log("Trans");
            if (event.propertyName === 'transform') {
            console.log("Trans2");
              const overlay = document.getElementById('splashOverlay');
              overlay.style.opacity = '1';
              // Ensure transitions are complete
              Promise.all(
                [splash, overlay].map(el => 
                  new Promise(resolve => {
                    const onTransitionEnd = () => {
                      el.removeEventListener('transitionend', onTransitionEnd);
                      resolve();
                    };
                    el.addEventListener('transitionend', onTransitionEnd);
                  })
                )
              ).then(() => {
                localStorage.setItem('splashShown', 'true');
                window.location.href = 'stageTwoIndex.html';
              });
            }
          });
    }
    const sunPosition = new THREE.Vector3(0, 0, 0); // Assuming sun is at the origin
    const restrictedRadius = 2000; // Define a radius around the sun as the restricted zone
    
    /*function isInRestrictedZone(objectPosition) {
        const vectorToObject = new THREE.Vector3().subVectors(objectPosition, sunPosition);
        const angleWithCamera = vectorToObject.angleTo(camera.getWorldDirection(new THREE.Vector3()));
    
        // Check if the object is within the restricted radius and angle
        const distanceToSun = vectorToObject.length();
        return distanceToSun < restrictedRadius && angleWithCamera < Math.PI / 6; // 30-degree cone
    }
*/
    let dalek;
/*
    // Load the TARDIS
    const loader = new GLTFLoader();
    loader.load('./rss/tardis/scene.gltf', function (gltf) {
        tardis = gltf.scene;
        tardis.scale.set(30, 30, 30); // Adjust the size
        tardis.position.set(0, 1000, 0); // Position it somewhere visible
        tardis.castShadow = true;
        tardis.receiveShadow = true;
        scene.add(tardis);
        zipTardis();
    }, undefined, function (error) {
        console.error("Error loading TARDIS model:", error);
    });
   */ 
// Dalek Entry and Walk, Then Face Camera
// Create a directional light behind the camera to illuminate the Dalek
const dalekLight = new THREE.DirectionalLight(0xffffff, 1); // (color, intensity)
dalekLight.layers.set(1);
dalekLight.target.layers.set(1);
scene.add(dalekLight);

// Ensure the light follows the camera, shining in the direction of the Dalek
dalekLight.position.copy(camera.position);
function updateDalekLight() {
 // Light stays behind the camera
    dalekLight.target.position.set(dalek.position.x, dalek.position.y, dalek.position.z);
    dalekLight.target.updateMatrixWorld();
}

function enterDalek() {
    if (!dalek) return;

    // Position Dalek **just off-screen** to the right
    const startX = 500; // Slightly off-screen right
    const startY = 650; // Low position, near the camera's height
    const startZ = 3500; // Very close to the camera

    dalek.position.set(startX, startY, startZ);
    dalek.visible = true;

    // Compute the original rotation (facing left)
    const originalRotationY = Math.atan2(-1000 - startX, 3500 - startZ);
    dalek.rotation.set(0, originalRotationY, 0); // Ensure level rotation

    // Move Dalek toward `x = 0`
    new TWEEN.Tween(dalek.position)
        .to({ x: 0, y: startY, z: startZ }, 3000) // Move toward center
        .onUpdate(updateDalekLight) // Keep lighting the Dalek
        .onComplete(() => {
            // Compute the Y-axis rotation to face the camera (ignoring x and z)
            const lookAtY = Math.atan2(camera.position.x - dalek.position.x, camera.position.z - dalek.position.z);

            // Smoothly rotate toward the camera without tilting
            new TWEEN.Tween(dalek.rotation)
                .to({ y: lookAtY }, 2000) // Rotate smoothly over 2s
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onComplete(() => {
                    setTimeout(() => {
                        document.getElementById('introText').style.display = 'block';
                    
                        // 2) Type line #1 (cursor is initially next to titleLine1 in HTML)
                        typeWriter('titleLine1', "It's Emre.", 100, () => {
                          setTimeout(() =>{
                  
                  
                          // 3) Move the cursor to line #2
                          const line2 = document.getElementById('titleLine2');
                          line2.appendChild(document.getElementById('cursor'));
                    
                          // 4) Type line #2, blinking cursor follows each character
                          typeWriter('titleLine2', "Click the sun.", 100, () => {
                            // Maybe do something after the second line is done
                            document.getElementById("cursor").classList.add("cursorBlink");
                          });
                      }, 1500);
                        });
                    
                      }, 2500);
                    // Subtle tilt upwards (looking slightly up)
                    new TWEEN.Tween(dalek.rotation)
                        .to({ x: -0.3 }, 1500) // Slight upward tilt
                        .easing(TWEEN.Easing.Quadratic.InOut)
                        .onComplete(() => {
                            // Hold the tilt for a moment
                            setTimeout(() => {
                                // Tilt back down to normal
                                new TWEEN.Tween(dalek.rotation)
                                    .to({ x: 0 }, 1500)
                                    .easing(TWEEN.Easing.Quadratic.InOut)
                                    .onComplete(() => {
                                        // Smoothly rotate back to original direction
                                        new TWEEN.Tween(dalek.rotation)
                                            .to({ y: originalRotationY }, 2000)
                                            .easing(TWEEN.Easing.Quadratic.InOut)
                                            .onComplete(() => {
                                                // Continue moving left
                                                new TWEEN.Tween(dalek.position)
                                                    .to({ x: -500, y: startY, z: startZ }, 4000) // Continue moving off-screen
                                                    .onUpdate(updateDalekLight) // Keep lighting the Dalek
                                                    .onComplete(() => {
                                                        dalek.visible = false; // Hide when off-screen

                                                        // Wait a short time, then restart the movement
                                                        setTimeout(enterDalek, 1000);
                                                    })
                                                    .start();
                                            })
                                            .start();
                                    })
                                    .start();
                            }, 6000); // Hold the tilt for 1 second before tilting back
                        })
                        .start();
                })
                .start();
        })
        .start();
}

// Load the Dalek
const dalekLoader = new GLTFLoader();
dalekLoader.load('./rss/dalek/scene.gltf', function (gltf) {
    dalek = gltf.scene;
    dalek.scale.set(100, 100, 100); // Adjust Dalek size
    dalek.castShadow = true;
    dalek.receiveShadow = true;
    dalek.visible = false; // Start invisible until it enters
    dalek.layers.enable(1);
    scene.add(dalek);

    // Start the Dalek entrance sequence
    enterDalek();
}, undefined, function (error) {
    console.error("Error loading Dalek model:", error);
});

/*
// TARDIS Movement with Spin Correction
function zipTardis() {
    if (!tardis) return;

        const rangeX = 1000;
        const rangeY = 500;
        const rangeZ = 500;

        let randomX = 1000 + Math.random() * rangeX;
        let randomY = 800 + Math.random() * rangeY;
        let randomZ = -1000 + Math.random() * rangeZ;

        const targetPosition = new THREE.Vector3(randomX, randomY, randomZ);
        if (isInRestrictedZone(targetPosition)) {
            const safePosition = repositionObject(targetPosition);
            randomX = safePosition.x;
            randomY = safePosition.y;
            randomZ = safePosition.z;
        }

        // Smooth TARDIS movement
        new TWEEN.Tween(tardis.position)
            .to({ x: randomX, y: randomY, z: randomZ }, 1500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => setTimeout(zipTardis, 500))
            .start();
}

let rotationFrames = 0; // Track how many frames have passed
let rotationDirection = -0.005; // Start rotating downward
*/
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    revolutions();
    sunSphere.rotation.y += 0.007;

   /* if (tardis) {
        // Apply rotation
        tardis.rotation.x += rotationDirection;
        tardis.rotation.y += 0.05; // Keep normal spinning

        // Count frames
        rotationFrames++;

        // After 157 frames (or however long it takes to reach upside down), reverse rotation
        if (rotationFrames >= 200) {
            rotationDirection *= -1; // Reverse spin direction
            rotationFrames = 0; // Reset frame counter
        }
    }
*/
    composer.render();
}

animate();

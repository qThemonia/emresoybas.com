    import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
    import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';
    import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';
    import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
    import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
    import { SSAARenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/SSAARenderPass.js';


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
    controls.autoRotate = false;
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
    color: 0x858500,
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
    // ========== [ Animate ] ==========
    function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    revolutions();
    sunSphere.rotation.y += 0.002;
    composer.render();
    }

    // Start off in realism mode
    realismToggle();

    function createStarField() {
        const starCount = 20000;
        const geometry = new THREE.BufferGeometry();
    
        // Positions + Colors
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3); // R, G, B for each star
    
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
    
        // Assign to geometry
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
        // PointsMaterial that uses vertex colors
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
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      document.getElementById('introText').style.display = 'block';
  
      // 2) Type line #1 (cursor is initially next to titleLine1 in HTML)
      typeWriter('titleLine1', "It's Emre.", 100, () => {
  
        // 3) Move the cursor to line #2
        const line2 = document.getElementById('titleLine2');
        line2.appendChild(document.getElementById('cursor'));
  
        // 4) Type line #2, blinking cursor follows each character
        typeWriter('titleLine2', "Click the sun.", 100, () => {
          // Maybe do something after the second line is done
          document.getElementById("cursor").classList.add("cursorBlink");
        });
      });
  
    }, 2500);
  });

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
    document.addEventListener('pointerup', onPointerUp, false);
    // 4) The "splash" – fill screen with the sun’s color from its position
    function splashOutSun() {
        // 4a. Get sun color as a CSS string
        const sunColor = '#' + sunSphere.material.color.getHexString();
    
        // 4b. Project the sun’s 3D position into screen space
        const sunPos = new THREE.Vector3().copy(sunSphere.position);
        sunPos.project(camera);  
        // Now sunPos.x, sunPos.y are in normalized device coordinates (-1..1).
        // Convert to pixel coords:
        const screenX = (sunPos.x *  0.5 + 0.5) * window.innerWidth;
        const screenY = (-sunPos.y * 0.5 + 0.5) * window.innerHeight;
    
        // 4c. Setup the #sunSplash div
        const splash = document.getElementById('sunSplash');
        splash.style.backgroundColor = sunColor;
        // Position it so its center is at the sun's screen coords
        splash.style.left = `${screenX}px`;
        splash.style.top  = `${screenY}px`;
    
        // We want the circle’s center there, so we set an initial size and transform origin
        const maxDim = Math.max(window.innerWidth, window.innerHeight);
        // Make sure it's big enough to cover entire screen on scale up
        splash.style.width = `${maxDim * 2}px`;
        splash.style.height = `${maxDim * 2}px`;
        splash.style.marginLeft = `-${maxDim}px`;  // so center is at sun x
        splash.style.marginTop  = `-${maxDim}px`;
    
        // 4d. Force reflow, then scale up
        splash.offsetWidth; // this triggers a reflow so the next style transition will animate
        splash.style.transform = 'scale(1)';
    
        // Optionally, after 2s, you can do something like load your portfolio content
        // setTimeout(() => {
        //   window.location.href = 'portfolio.html';
        // }, 2000);
    }
    
    animate();
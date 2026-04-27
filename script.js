/* ============================================
   THREE.JS GLOBE & SCENE INITIALIZATION
   ============================================ */

let scene, camera, renderer, globe, stars, alumniDots = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let alumniData = [];
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotationVelocity = { x: 0, y: 0 };
let isAnimatingGlobe = false;
let initialGlobeRotation = { x: 0, y: 0 };
let initialCameraPosition = new THREE.Vector3();

// Configuration
const GLOBE_RADIUS = 50;
const DOT_RADIUS = 0.6;
const ANIMATION_DURATION = 900;
const GLOBE_SCALE_DURATION = 2200;

// Hover preview state
let currentHoveredDot = null;
let previewTimeout = null;

/* ============================================
   INITIALIZATION
   ============================================ */

async function init() {
    try {
        // Load alumni data
        await loadAlumniData();
        
        // Initialize Three.js scene
        initScene();
        
        // Initialize starfield
        initStarfield();
        
        // Create globe
        createGlobe();
        
        // Create alumni location dots
        createAlumniDots();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update stats
        updateStats();
        
        // Hide loading indicator
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 500);
        
        // Start animation loop
        animate();
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

/* ============================================
   LOAD ALUMNI DATA
   ============================================ */

async function loadAlumniData() {
    try {
        const response = await fetch('alumni.json');
        alumniData = await response.json();
        console.log(`Loaded ${alumniData.length} alumni records`);
    } catch (error) {
        console.error('Error loading alumni data:', error);
        // Use fallback data
        alumniData = [];
    }
}

/* ============================================
   THREE.JS SCENE SETUP
   ============================================ */

function initScene() {
    const container = document.getElementById('canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);

    // Camera
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    camera.position.z = 100;
    initialCameraPosition.copy(camera.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 30, 100);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x0A84FF,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

/* ============================================
   GLOBE CREATION
   ============================================ */

function createGlobe() {
    const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
    
    // Load realistic Earth texture from CDN
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
        'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-blue-marble.jpg',
        function(loadedTexture) {
            console.log('Earth texture loaded successfully');
        },
        undefined,
        function(error) {
            console.error('Error loading texture:', error);
            // Fallback to solid color if texture fails to load
            const canvas = createFallbackGlobeTexture();
            const fallbackTexture = new THREE.CanvasTexture(canvas);
            globe.material.map = fallbackTexture;
            globe.material.needsUpdate = true;
        }
    );
    
    const material = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 5,
        emissive: 0x1a3a52,
        emissiveIntensity: 0.1
    });
    
    globe = new THREE.Mesh(geometry, material);
    globe.receiveShadow = true;
    globe.castShadow = true;
    globe.userData.rotation = { x: 0, y: 0 };
    globe.scale.set(0, 0, 0); // Start at zero scale for cinematic entrance
    
    scene.add(globe);
    
    // Animate globe scale in
    animateGlobeScaleIn();
}

function createFallbackGlobeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Ocean blue gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a3d62');
    gradient.addColorStop(0.5, '#1a5f7a');
    gradient.addColorStop(1, '#0a3d62');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add continents (simplified)
    ctx.fillStyle = '#2d5d3d';
    
    // North America
    ctx.beginPath();
    ctx.ellipse(200, 300, 150, 180, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.ellipse(300, 500, 80, 120, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Europe
    ctx.beginPath();
    ctx.ellipse(950, 250, 100, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Africa
    ctx.beginPath();
    ctx.ellipse(1100, 450, 130, 140, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Asia
    ctx.beginPath();
    ctx.ellipse(1400, 350, 250, 200, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Australia
    ctx.beginPath();
    ctx.ellipse(1600, 600, 80, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas;
}

/* ============================================
   ALUMNI DOTS
   ============================================ */

function createAlumniDots() {
    const dotGeometry = new THREE.SphereGeometry(DOT_RADIUS, 32, 32);
    
    alumniData.forEach((alumni, index) => {
        // Convert lat/lng to 3D coordinates
        const position = latLngToVector(alumni.latitude, alumni.longitude);
        
        // Create glowing material
        const hue = Math.random();
        const baseColor = new THREE.Color().setHSL(hue, 0.8, 0.6);
        const emissiveColor = new THREE.Color().setHSL(hue, 0.8, 0.5);
        
        const material = new THREE.MeshBasicMaterial({
            color: baseColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.8
        });
        
        const dot = new THREE.Mesh(dotGeometry, material);
        dot.position.copy(position);
        dot.scale.set(1, 1, 1);
        dot.userData = {
            alumni: alumni,
            baseColor: baseColor,
            baseEmissive: emissiveColor,
            originalScale: 1,
            pulseStart: Math.random() * Math.PI * 2,
            pulseFrequency: 2 + Math.random() * 1,
            isHovered: false
        };
        
        // Add dot as child of globe so it rotates together
        globe.add(dot);
        alumniDots.push(dot);
    });
    
    console.log(`Created ${alumniDots.length} alumni location dots on globe`);
}

function latLngToVector(latitude, longitude) {
    const lat = (latitude * Math.PI) / 180;
    const lng = (longitude * Math.PI) / 180;
    
    const x = GLOBE_RADIUS * Math.cos(lat) * Math.cos(lng);
    const y = GLOBE_RADIUS * Math.sin(lat);
    const z = GLOBE_RADIUS * Math.cos(lat) * Math.sin(lng);
    
    return new THREE.Vector3(x, y, z);
}

/* ============================================
   STARFIELD
   ============================================ */

function initStarfield() {
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    ctx.fillStyle = '#000814';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create stars
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 1.5;
        const opacity = Math.random() * 0.5 + 0.3;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Add some twinkling stars with CSS animation
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 0.8;
        
        ctx.fillStyle = 'rgba(255, 200, 200, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/* ============================================
   EVENT LISTENERS & INTERACTIONS
   ============================================ */

function setupEventListeners() {
    // Mouse interactions
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onMouseWheel, { passive: false });
    
    // Touch interactions
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
    
    // Close card
    document.querySelector('.close-btn').addEventListener('click', closeAlumniCard);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAlumniCard();
    });
    
    // Click on background to close card
    document.getElementById('canvas-container').addEventListener('click', onCanvasClick);
}

function onMouseDown(e) {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        rotationVelocity.y = deltaX * 0.005;
        rotationVelocity.x = deltaY * 0.005;
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
    
    // Hover effect on dots
    updateDotHovers();
}

function onMouseUp(e) {
    isDragging = false;
}

function onMouseWheel(e) {
    e.preventDefault();
    
    const zoomSpeed = 2;
    const delta = e.deltaY > 0 ? 1 : -1;
    camera.position.z += delta * zoomSpeed;
    camera.position.z = Math.max(60, Math.min(200, camera.position.z));
}

function onTouchStart(e) {
    isDragging = true;
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}

function onTouchMove(e) {
    if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        
        rotationVelocity.y = deltaX * 0.005;
        rotationVelocity.x = deltaY * 0.005;
        
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
}

function onTouchEnd(e) {
    isDragging = false;
}

function onCanvasClick(e) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(alumniDots);
    
    if (intersects.length > 0) {
        const clickedDot = intersects[0].object;
        onDotClick(clickedDot);
    }
}

function updateDotHovers() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(alumniDots);
    
    alumniDots.forEach(dot => {
        const isHovered = intersects.length > 0 && intersects[0].object === dot;
        
        if (isHovered) {
            dot.scale.lerp(
                new THREE.Vector3(1.8, 1.8, 1.8),
                0.08
            );
            dot.material.emissiveIntensity = 1.2;
            dot.userData.isHovered = true;
            
            // Show preview card
            if (currentHoveredDot !== dot) {
                currentHoveredDot = dot;
                clearTimeout(previewTimeout);
                previewTimeout = setTimeout(() => {
                    showPreviewCard(dot, mouse);
                }, 200);
            }
        } else {
            dot.scale.lerp(
                new THREE.Vector3(1, 1, 1),
                0.08
            );
            dot.material.emissiveIntensity = 0.8;
            dot.userData.isHovered = false;
        }
    });
    
    // Hide preview if no dot is hovered
    if (intersects.length === 0) {
        hidePreviewCard();
        currentHoveredDot = null;
        clearTimeout(previewTimeout);
    }
}

function showPreviewCard(dot, mousePos) {
    if (!dot.userData.alumni) return;
    
    const preview = document.getElementById('alumni-preview');
    const name = dot.userData.alumni.name;
    
    document.getElementById('preview-name').textContent = name;
    
    // Position near cursor
    preview.style.left = (mousePos.x * window.innerWidth * 0.5 + window.innerWidth * 0.5) + 'px';
    preview.style.top = (mousePos.y * window.innerHeight * -0.5 + window.innerHeight * 0.5 - 40) + 'px';
    
    preview.classList.add('visible');
}

function hidePreviewCard() {
    const preview = document.getElementById('alumni-preview');
    preview.classList.remove('visible');
}

function onDotClick(dot) {
    // Hide preview immediately
    hidePreviewCard();
    clearTimeout(previewTimeout);
    
    const alumni = dot.userData.alumni;
    showAlumniCard(alumni, dot);
    
    // Animate camera to the dot
    animateCameraToPosition(dot.position);
}

/* ============================================
   ALUMNI CARD DISPLAY
   ============================================ */

function showAlumniCard(alumni, dot) {
    document.getElementById('card-name').textContent = alumni.name;
    document.getElementById('card-year').textContent = `Class of ${alumni.year}`;
    document.getElementById('card-location').textContent = alumni.location;
    document.getElementById('card-profession').textContent = alumni.profession;
    document.getElementById('card-company').textContent = alumni.company;
    
    // Update avatar image
    const cardImage = document.getElementById('card-image');
    cardImage.innerHTML = `<img src="${alumni.image}" alt="${alumni.name}">`;
    
    const card = document.getElementById('alumni-card');
    card.classList.add('active');
}

function closeAlumniCard() {
    const card = document.getElementById('alumni-card');
    card.classList.remove('active');
    hidePreviewCard();
    currentHoveredDot = null;
    
    // Return globe to initial spinning position and zoom out camera
    returnGlobeToSpinning();
    animateCameraToInitialPosition();
}

function returnGlobeToSpinning() {
    if (isAnimatingGlobe) return;
    
    isAnimatingGlobe = true;
    const startRotation = { x: globe.rotation.x, y: globe.rotation.y };
    const targetRotation = { x: initialGlobeRotation.x, y: initialGlobeRotation.y };
    const startTime = Date.now();
    const duration = 1400; // 1.4 seconds return animation
    
    function animateFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-in-out cubic)
        const easeProgress = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        globe.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
        globe.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
        
        // Reset velocity for smooth spinning
        if (progress >= 1) {
            rotationVelocity.x = 0;
            rotationVelocity.y = 0;
            isAnimatingGlobe = false;
        } else {
            requestAnimationFrame(animateFrame);
        }
    }
    
    animateFrame();
}

/* ============================================
   CAMERA ANIMATIONS
   ============================================ */

function animateGlobeScaleIn() {
    const startTime = Date.now();
    const duration = GLOBE_SCALE_DURATION;
    
    function animateFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out cubic for smooth entrance)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Scale globe in
        globe.scale.set(easeProgress, easeProgress, easeProgress);
        
        if (progress < 1) {
            requestAnimationFrame(animateFrame);
        }
    }
    
    animateFrame();
}

function animateCameraToPosition(position, duration = ANIMATION_DURATION) {
    const startPos = camera.position.clone();
    const targetPos = position.clone().normalize().multiplyScalar(80);
    
    // Store initial rotation for later return
    initialGlobeRotation.x = globe.rotation.x;
    initialGlobeRotation.y = globe.rotation.y;
    
    isAnimatingGlobe = true;
    const startTime = Date.now();
    
    function animateFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out cubic)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(startPos, targetPos, easeProgress);
        camera.lookAt(position);
        
        if (progress < 1) {
            requestAnimationFrame(animateFrame);
        } else {
            isAnimatingGlobe = false;
        }
    }
    
    animateFrame();
}

function animateCameraToInitialPosition(duration = ANIMATION_DURATION) {
    const startPos = camera.position.clone();
    const targetPos = initialCameraPosition.clone();
    
    isAnimatingGlobe = true;
    const startTime = Date.now();
    
    function animateFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-in-out cubic)
        const easeProgress = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        camera.position.lerpVectors(startPos, targetPos, easeProgress);
        camera.lookAt(0, 0, 0);
        
        if (progress < 1) {
            requestAnimationFrame(animateFrame);
        } else {
            isAnimatingGlobe = false;
        }
    }
    
    animateFrame();
}

/* ============================================
   STATS UPDATE
   ============================================ */

function updateStats() {
    document.getElementById('stat-alumni').textContent = alumniData.length;
    
    // Count unique countries
    const countries = new Set(alumniData.map(a => a.location.split(', ')[1]));
    document.getElementById('stat-countries').textContent = countries.size;
    
    // Year range
    const years = alumniData.map(a => a.year);
    const yearRange = Math.max(...years) - Math.min(...years);
    document.getElementById('stat-years').textContent = yearRange + 1;
}

/* ============================================
   WINDOW RESIZE
   ============================================ */

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    
    // Redraw starfield
    initStarfield();
}

/* ============================================
   ANIMATION LOOP
   ============================================ */

function animate() {
    requestAnimationFrame(animate);
    
    // Globe rotation with velocity damping
    if (!isDragging && !isAnimatingGlobe) {
        rotationVelocity.x *= 0.95;
        rotationVelocity.y *= 0.95;
    }
    
    globe.rotation.x += rotationVelocity.x;
    globe.rotation.y += rotationVelocity.y;
    
    // Auto-rotate when not dragging and not animating
    if (!isDragging && !isAnimatingGlobe) {
        globe.rotation.y += 0.0002;
    }
    
    // Animate alumni dots
    const time = Date.now() * 0.001;
    alumniDots.forEach(dot => {
        // Pulse animation
        const pulse = Math.sin(time * dot.userData.pulseFrequency + dot.userData.pulseStart) * 0.3 + 0.7;
        dot.material.emissiveIntensity = 0.6 + pulse * 0.4;
        
        // Subtle rotation around the globe
        const angle = Math.atan2(dot.position.z, dot.position.x);
        const distance = dot.position.length();
        
        // Keep dots on globe surface
        if (Math.abs(distance - GLOBE_RADIUS) > 0.1) {
            dot.position.normalize().multiplyScalar(GLOBE_RADIUS);
        }
    });
    
    // Render scene
    renderer.render(scene, camera);
}

/* ============================================
   INITIALIZATION ON PAGE LOAD
   ============================================ */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

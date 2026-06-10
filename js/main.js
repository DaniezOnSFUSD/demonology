// 3D Ghost Hunting Game - Main Engine
class GhostHuntingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.cameraCanvas = document.getElementById('cameraCanvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;

        // Game state
        this.playerData = {
            position: new THREE.Vector3(0, 1.6, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            sanity: 100,
            emfLevel: 0,
            temperature: 72,
            inHauntedRoom: false,
            currentRoom: 'Lobby'
        };

        this.keys = {};
        this.ghostData = {
            type: 'Unknown',
            detected: false,
            detectionLevel: 0,
            position: new THREE.Vector3(5, 1.5, -5),
            speed: 0.05,
            aggressiveness: 0.3
        };

        this.ghostOrbs = [];
        this.haunted = false;
        this.witherEffect = 0;

        this.setupScene();
        this.setupControls();
        this.createGhost();
        this.createRooms();
        this.animate();
    }

    setupScene() {
        this.scene.background = new THREE.Color(0x1a1a1a);
        this.scene.fog = new THREE.Fog(0x1a1a1a, 100, 200);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Player camera
        this.camera.position.copy(this.playerData.position);
        this.scene.add(this.camera);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createRooms() {
        const rooms = [
            { name: 'Bedroom', pos: new THREE.Vector3(0, 0, 0), size: new THREE.Vector3(10, 3, 10), color: 0x4a4a6a },
            { name: 'Kitchen', pos: new THREE.Vector3(15, 0, 0), size: new THREE.Vector3(10, 3, 10), color: 0x6a6a4a },
            { name: 'Basement', pos: new THREE.Vector3(-15, -2, 0), size: new THREE.Vector3(15, 2.5, 15), color: 0x2a2a4a },
            { name: 'Attic', pos: new THREE.Vector3(0, 6, 15), size: new THREE.Vector3(12, 2, 12), color: 0x3a3a2a }
        ];

        this.rooms = rooms;
        rooms.forEach(room => {
            // Walls
            const wallGeometry = new THREE.BoxGeometry(room.size.x, room.size.y, room.size.z);
            const wallMaterial = new THREE.MeshStandardMaterial({ 
                color: room.color,
                roughness: 0.8,
                metalness: 0.1
            });
            const roomMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            roomMesh.position.copy(room.pos);
            roomMesh.castShadow = true;
            roomMesh.receiveShadow = true;
            roomMesh.userData.roomName = room.name;
            this.scene.add(roomMesh);

            // Store room boundaries
            room.mesh = roomMesh;
        });
    }

    createGhost() {
        const ghostGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const ghostMaterial = new THREE.MeshStandardMaterial({
            color: 0x6688ff,
            emissive: 0x3344cc,
            emissiveIntensity: 0.5,
            wireframe: false,
            transparent: true,
            opacity: 0.7
        });
        this.ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
        this.ghost.position.copy(this.ghostData.position);
        this.ghost.castShadow = true;
        this.scene.add(this.ghost);

        // Ghost aura particles
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 5;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x8899ff,
            size: 0.1,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.6
        });
        this.ghostParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.ghost.add(this.ghostParticles);
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            if (e.key.toLowerCase() === 'c') {
                this.toggleCamera();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        document.addEventListener('mousemove', (e) => {
            this.handleMouseLook(e);
        });

        document.addEventListener('click', () => {
            if (document.pointerLockElement === null) {
                this.canvas.requestPointerLock();
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    handleMouseLook(event) {
        if (document.pointerLockElement !== this.canvas) return;

        const sensitivity = 0.003;
        const deltaX = event.movementX * sensitivity;
        const deltaY = event.movementY * sensitivity;

        this.pitch -= deltaY;
        this.yaw += deltaX;

        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

        const direction = new THREE.Vector3(
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch)
        );

        this.camera.lookAt(this.camera.position.clone().add(direction));
    }

    updatePlayer() {
        const speed = 0.2;
        const direction = new THREE.Vector3();

        if (this.keys['w']) direction.z -= 1;
        if (this.keys['s']) direction.z += 1;
        if (this.keys['a']) direction.x -= 1;
        if (this.keys['d']) direction.x += 1;

        if (direction.length() > 0) {
            direction.normalize();
            const moveVector = new THREE.Vector3();
            moveVector.x = Math.sin(this.yaw) * direction.z + Math.cos(this.yaw) * direction.x;
            moveVector.z = Math.cos(this.yaw) * direction.z - Math.sin(this.yaw) * direction.x;
            moveVector.multiplyScalar(speed);

            this.playerData.position.add(moveVector);
            this.camera.position.copy(this.playerData.position);

            // Reduce sanity when moving
            this.playerData.sanity = Math.max(0, this.playerData.sanity - 0.01);
        }
    }

    updateGhost() {
        // Ghost AI - wanders and occasionally hunts
        const targetPlayer = this.playerData.position.clone().sub(this.ghostData.position);
        const distanceToPlayer = targetPlayer.length();

        // Update EMF and temperature based on proximity
        if (distanceToPlayer < 15) {
            this.ghostData.detected = true;
            this.playerData.emfLevel = Math.max(this.playerData.emfLevel, 100 - distanceToPlayer * 5);
            this.playerData.temperature = Math.min(this.playerData.temperature - 0.1, 32);
            this.playerData.inHauntedRoom = true;
            this.playerData.sanity = Math.max(0, this.playerData.sanity - 0.02);
        } else {
            this.ghostData.detected = false;
            this.playerData.emfLevel = Math.max(0, this.playerData.emfLevel - 1);
            this.playerData.temperature = Math.min(72, this.playerData.temperature + 0.05);
            this.playerData.inHauntedRoom = false;
        }

        // Ghost movement
        if (distanceToPlayer < 20 && this.playerData.sanity > 30) {
            targetPlayer.normalize().multiplyScalar(this.ghostData.aggressiveness);
        } else {
            targetPlayer.set(
                Math.sin(Date.now() * 0.0001) * 0.02,
                0,
                Math.cos(Date.now() * 0.0001) * 0.02
            );
        }

        this.ghostData.position.add(targetPlayer.multiplyScalar(this.ghostData.speed));
        this.ghost.position.copy(this.ghostData.position);

        // Update ghost particles
        const positions = this.ghostParticles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += (Math.random() - 0.5) * 0.1;
            positions[i + 1] += (Math.random() - 0.5) * 0.1;
            positions[i + 2] += (Math.random() - 0.5) * 0.1;
        }
        this.ghostParticles.geometry.attributes.position.needsUpdate = true;
    }

    detectGhostOrbs() {
        const orbCount = Math.floor(this.ghostData.detectionLevel / 20);
        const orbContainer = document.getElementById('orb-container');
        const orbs = orbContainer.querySelectorAll('.orb');

        orbs.forEach((orb, index) => {
            if (index < orbCount && this.ghostData.detected) {
                orb.classList.remove('orb-inactive');
                orb.classList.add('orb-active');
            } else {
                orb.classList.add('orb-inactive');
                orb.classList.remove('orb-active');
            }
        });

        if (this.ghostData.detected) {
            this.ghostData.detectionLevel = Math.min(100, this.ghostData.detectionLevel + 1);
        } else {
            this.ghostData.detectionLevel = Math.max(0, this.ghostData.detectionLevel - 0.5);
        }
    }

    applyWithering() {
        if (this.playerData.sanity < 40) {
            this.witherEffect = Math.min(1, this.witherEffect + 0.01);
        } else {
            this.witherEffect = Math.max(0, this.witherEffect - 0.01);
        }

        // Apply screen effect
        const witherCanvas = document.getElementById('withering-effect');
        if (this.witherEffect > 0) {
            witherCanvas.style.opacity = this.witherEffect * 0.5;
            witherCanvas.style.backgroundColor = `rgba(0, 0, 0, ${this.witherEffect * 0.3})`;
            
            // Blur effect
            this.renderer.domElement.style.filter = `blur(${this.witherEffect * 3}px)`;
        } else {
            witherCanvas.style.opacity = 0;
            this.renderer.domElement.style.filter = 'blur(0px)';
        }
    }

    toggleCamera() {
        this.cameraActive = !this.cameraActive;
    }

    updateUI() {
        document.getElementById('emf-level').textContent = Math.floor(this.playerData.emfLevel);
        document.getElementById('temperature').textContent = Math.floor(this.playerData.temperature) + '°F';
        document.getElementById('ghost-type').textContent = this.ghostData.type;
        document.getElementById('sanity').textContent = Math.floor(this.playerData.sanity) + '%';
        document.getElementById('current-room').textContent = this.playerData.currentRoom;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updatePlayer();
        this.updateGhost();
        this.detectGhostOrbs();
        this.applyWithering();
        this.updateUI();

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game
const game = new GhostHuntingGame();

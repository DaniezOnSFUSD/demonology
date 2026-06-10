// Demonology - 3D Ghost Hunting Game Engine
// Full implementation with ghost types, evidence collection, and hunt mechanics

const GHOST_TYPES = {
    ASWANG: {
        name: 'Aswang',
        evidence: ['EMF_5', 'GHOST_WRITING', 'FREEZING_TEMP'],
        speed: 1.2,
        aggressiveness: 0.8,
        trait: 'Gains 15% speed boost for each player killed'
    },
    SHADOW: {
        name: 'Shadow',
        evidence: ['EMF_5', 'GHOST_WRITING', 'LASER_PROJECTION'],
        speed: 0.8,
        aggressiveness: 0.3,
        trait: 'Passive in bright light, rarely hunts if lights are on'
    },
    SKINWALKER: {
        name: 'Skinwalker',
        evidence: ['FREEZING_TEMP', 'GHOST_WRITING', 'SPIRIT_BOX'],
        speed: 0.9,
        aggressiveness: 0.6,
        trait: 'Master of deception - creates fake ghost orbs on cameras'
    },
    SPECTER: {
        name: 'Specter',
        evidence: ['EMF_5', 'FREEZING_TEMP', 'LASER_PROJECTION'],
        speed: 1.0,
        aggressiveness: 0.7,
        trait: 'High kinetic activity - throws objects 3x more than average'
    },
    SPIRIT: {
        name: 'Spirit',
        evidence: ['HANDPRINTS', 'GHOST_WRITING', 'SPIRIT_BOX'],
        speed: 0.9,
        aggressiveness: 0.5,
        trait: 'Candle flames glow blue when near it'
    },
    DEMON: {
        name: 'Demon',
        evidence: ['FREEZING_TEMP', 'GHOST_WRITING', 'SPIRIT_BOX'],
        speed: 1.3,
        aggressiveness: 0.95,
        trait: 'Ignores sanity rules - hunts at 100% sanity'
    },
    VEX: {
        name: 'Vex',
        evidence: ['EMF_5', 'HANDPRINTS', 'LASER_PROJECTION'],
        speed: 1.1,
        aggressiveness: 0.75,
        trait: 'Can walk through walls during hunts'
    },
    SIREN: {
        name: 'Siren',
        evidence: ['GHOST_ORBS', 'SPIRIT_BOX', 'HANDPRINTS'],
        speed: 1.0,
        aggressiveness: 0.6,
        trait: 'Distinctive humming audio when responding via Spirit Box'
    },
    YUREI: {
        name: 'Yurei',
        evidence: ['GHOST_ORBS', 'FREEZING_TEMP', 'HANDPRINTS'],
        speed: 0.95,
        aggressiveness: 0.7,
        trait: 'Powerful sanity drain (-20%) when seeing its manifestation'
    },
    RAIJU: {
        name: 'Raiju',
        evidence: ['EMF_5', 'GHOST_ORBS', 'LASER_PROJECTION'],
        speed: 0.85,
        aggressiveness: 0.65,
        trait: 'Feeds on electronics - speed increases near active equipment'
    },
    MARE: {
        name: 'Mare',
        evidence: ['GHOST_ORBS', 'SPIRIT_BOX', 'FREEZING_TEMP'],
        speed: 1.0,
        aggressiveness: 0.65,
        trait: 'High hunt threshold in dark (65%), low in light (40%)'
    },
    SHADE: {
        name: 'Shade',
        evidence: ['EMF_5', 'FREEZING_TEMP', 'GHOST_ORBS'],
        speed: 0.7,
        aggressiveness: 0.4,
        trait: 'Shy - stops all interactions if multiple players present'
    }
};

const MAPS = [
    {
        name: 'Fenway Drive',
        size: 50,
        rooms: ['Lobby', 'Bedroom A', 'Bedroom B', 'Kitchen', 'Bathroom', 'Basement', 'Garage'],
        difficulty: 'Amateur'
    },
    {
        name: 'Juniper Road',
        size: 40,
        rooms: ['Lobby', 'Bedroom', 'Kitchen', 'Hallway', 'Office'],
        difficulty: 'Intermediate'
    },
    {
        name: 'Asylum',
        size: 100,
        rooms: ['Entrance', 'Ward A', 'Ward B', 'Operating Room', 'Morgue', 'Basement', 'Attic'],
        difficulty: 'Professional'
    }
];

class DemonologyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        this.yaw = 0;
        this.pitch = 0;

        // Game state
        this.gameState = {
            sanity: 100,
            emfLevel: 0,
            temperature: 68,
            teamSanity: 100,
            hunting: false,
            huntTimer: 0,
            currentRoom: 'LOBBY',
            ghostRoom: null,
            difficulty: 'Amateur',
            setupTime: 300,
            setupTimer: 300,
            missionActive: true
        };

        this.selectedMap = MAPS[0];
        this.selectedGhost = Object.values(GHOST_TYPES)[Math.floor(Math.random() * Object.keys(GHOST_TYPES).length)];
        this.detectedEvidence = new Set();
        this.ghostRoomIndex = Math.floor(Math.random() * this.selectedMap.rooms.length);
        this.gameState.ghostRoom = this.selectedMap.rooms[this.ghostRoomIndex];

        this.keys = {};
        this.rooms = [];
        this.ghost = null;
        this.ghostParticles = null;

        this.setupScene();
        this.setupControls();
        this.createMap();
        this.createGhost();
        this.animate();
    }

    setupScene() {
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 150, 300);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(30, 40, 20);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        this.camera.position.set(0, 1.6, 0);
        this.scene.add(this.camera);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createMap() {
        const roomSize = 15;
        const roomHeight = 4;

        this.selectedMap.rooms.forEach((roomName, index) => {
            const x = (index % 2) * (roomSize + 5);
            const z = Math.floor(index / 2) * (roomSize + 5);

            const geometry = new THREE.BoxGeometry(roomSize, roomHeight, roomSize);
            
            let color = 0x333333;
            if (roomName === this.gameState.ghostRoom) {
                color = 0x4a3333; // Slightly red-tinted for ghost room
            }

            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.8,
                metalness: 0.1
            });

            const room = new THREE.Mesh(geometry, material);
            room.position.set(x, roomHeight / 2, z);
            room.castShadow = true;
            room.receiveShadow = true;
            room.userData = { roomName, index };

            this.scene.add(room);
            this.rooms.push({ mesh: room, name: roomName, position: new THREE.Vector3(x, 0, z) });
        });
    }

    createGhost() {
        const ghostGeometry = new THREE.IcosahedronGeometry(0.6, 4);
        const ghostMaterial = new THREE.MeshStandardMaterial({
            color: 0x4488ff,
            emissive: 0x2244dd,
            emissiveIntensity: 0.7,
            wireframe: false,
            transparent: true,
            opacity: 0.6
        });

        this.ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
        
        const ghostRoom = this.rooms.find(r => r.name === this.gameState.ghostRoom);
        if (ghostRoom) {
            this.ghost.position.copy(ghostRoom.position).add(new THREE.Vector3(0, 1.5, 0));
        }

        this.ghost.castShadow = true;
        this.scene.add(this.ghost);

        // Ghost particles
        const particleCount = 150;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 3;
            positions[i + 1] = (Math.random() - 0.5) * 3;
            positions[i + 2] = (Math.random() - 0.5) * 3;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x6699ff,
            size: 0.15,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.5
        });

        this.ghostParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.ghost.add(this.ghostParticles);
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== this.canvas) return;

            const sensitivity = 0.003;
            this.yaw += e.movementX * sensitivity;
            this.pitch -= e.movementY * sensitivity;
            this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
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

    updatePlayer() {
        const speed = this.gameState.hunting ? 0.15 : 0.2;
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

            this.camera.position.add(moveVector);

            // Sanity drain from movement
            if (!this.gameState.hunting) {
                this.gameState.sanity = Math.max(0, this.gameState.sanity - 0.05);
            }
        }

        // Update camera rotation
        const direction3D = new THREE.Vector3(
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        this.camera.lookAt(this.camera.position.clone().add(direction3D));

        // Update current room
        let nearestRoom = 'LOBBY';
        let nearestDistance = Infinity;
        this.rooms.forEach(room => {
            const distance = this.camera.position.distanceTo(room.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestRoom = room.name;
            }
        });
        this.gameState.currentRoom = nearestRoom;
    }

    updateGhost() {
        const ghostRoom = this.rooms.find(r => r.name === this.gameState.ghostRoom);
        if (!ghostRoom) return;

        const distanceToGhost = this.camera.position.distanceTo(this.ghost.position);
        const distanceToGhostRoom = this.camera.position.distanceTo(ghostRoom.position);

        // EMF and Temperature
        if (distanceToGhost < 20) {
            this.gameState.emfLevel = Math.max(this.gameState.emfLevel, 5 - Math.floor(distanceToGhost / 4));
            this.gameState.temperature = Math.max(0, this.gameState.temperature - 0.2);
        } else {
            this.gameState.emfLevel = Math.max(0, this.gameState.emfLevel - 0.5);
            this.gameState.temperature = Math.min(68, this.gameState.temperature + 0.1);
        }

        // Ghost behavior
        const shouldHunt = this.gameState.teamSanity < (this.selectedGhost.trait.includes('Demon') ? 100 : 50);

        if (shouldHunt && !this.gameState.hunting) {
            this.gameState.hunting = true;
            this.gameState.huntTimer = 0;
        }

        if (this.gameState.hunting) {
            this.gameState.huntTimer++;

            // Hunt duration (30 seconds)
            if (this.gameState.huntTimer > 1800) {
                this.gameState.hunting = false;
                this.gameState.huntTimer = 0;
            }

            // Ghost pursues player
            const directionToPlayer = this.camera.position.clone().sub(this.ghost.position);
            directionToPlayer.normalize().multiplyScalar(this.selectedGhost.speed * 0.05);
            this.ghost.position.add(directionToPlayer);

            // Sanity drain during hunt
            this.gameState.sanity = Math.max(0, this.gameState.sanity - 0.2);

            // Hunt vignette effect
            const huntIntensity = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
            document.getElementById('hunt-vignette').style.boxShadow = 
                `inset 0 0 100px rgba(255, 0, 0, ${huntIntensity * 0.3})`;
        } else {
            document.getElementById('hunt-vignette').style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0)';
        }

        // Update ghost particles
        const positions = this.ghostParticles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += (Math.random() - 0.5) * 0.15;
            positions[i + 1] += (Math.random() - 0.5) * 0.15;
            positions[i + 2] += (Math.random() - 0.5) * 0.15;
        }
        this.ghostParticles.geometry.attributes.position.needsUpdate = true;
    }

    updateEvidence() {
        // Randomly collect evidence based on ghost proximity
        const distanceToGhost = this.camera.position.distanceTo(this.ghost.position);

        if (distanceToGhost < 25 && Math.random() < 0.01) {
            const possibleEvidence = this.selectedGhost.evidence;
            const evidence = possibleEvidence[Math.floor(Math.random() * possibleEvidence.length)];
            this.detectedEvidence.add(evidence);

            // Update UI
            const evidenceElements = document.querySelectorAll('.evidence-item');
            const evidenceNames = {
                'EMF_5': 'EMF Level 5',
                'GHOST_WRITING': 'Ghost Writing',
                'FREEZING_TEMP': 'Freezing Temp',
                'GHOST_ORBS': 'Ghost Orbs',
                'SPIRIT_BOX': 'Spirit Box',
                'HANDPRINTS': 'Handprints',
                'LASER_PROJECTION': 'Laser Projection'
            };

            evidenceElements.forEach(el => {
                const text = el.textContent;
                for (const [key, name] of Object.entries(evidenceNames)) {
                    if (text.includes(name) && this.detectedEvidence.has(key)) {
                        el.classList.add('collected');
                    }
                }
            });
        }
    }

    updateSetupPhase() {
        if (this.gameState.setupTimer > 0) {
            this.gameState.setupTimer--;
            if (this.gameState.setupTimer <= 0) {
                this.gameState.hunting = true;
            }
        }
    }

    applyWithering() {
        const witherIntensity = (100 - this.gameState.sanity) / 100;
        
        if (witherIntensity > 0.3) {
            this.renderer.domElement.style.filter = `blur(${witherIntensity * 5}px) brightness(${1 - witherIntensity * 0.3})`;
        } else {
            this.renderer.domElement.style.filter = 'blur(0px) brightness(1)';
        }

        document.getElementById('withering-effect').style.opacity = witherIntensity * 0.5;
    }

    updateUI() {
        // Sanity color coding
        const sanityElement = document.getElementById('sanity-display');
        if (this.gameState.sanity < 25) {
            sanityElement.classList.add('sanity-critical');
        } else {
            sanityElement.classList.remove('sanity-critical');
        }

        document.getElementById('sanity-display').textContent = Math.floor(this.gameState.sanity) + '%';
        document.getElementById('emf-display').textContent = this.gameState.emfLevel + '/5';
        document.getElementById('temp-display').textContent = Math.floor(this.gameState.temperature) + '°F';
        document.getElementById('zone-display').textContent = this.gameState.currentRoom;
        document.getElementById('ghost-room-display').textContent = this.gameState.ghostRoom;
        document.getElementById('hunt-status').textContent = this.gameState.hunting ? 'ACTIVE' : 'DORMANT';
        document.getElementById('threat-level').textContent = 
            this.gameState.sanity < 25 ? 'CRITICAL' : this.gameState.hunting ? 'HIGH' : 'LOW';

        // Hunting indicator
        if (this.gameState.hunting) {
            document.getElementById('hunting-indicator').style.display = 'block';
        } else {
            document.getElementById('hunting-indicator').style.display = 'none';
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updatePlayer();
        this.updateGhost();
        this.updateEvidence();
        this.updateSetupPhase();
        this.applyWithering();
        this.updateUI();

        this.renderer.render(this.scene, this.camera);
    }
}

// Start game
const game = new DemonologyGame();

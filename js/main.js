// DEMONOLOGY - ULTIMATE GAME ENGINE - FULL IMPLEMENTATION
const GHOST_TYPES = {
    ASWANG: { name: 'Aswang', evidence: ['EMF_5', 'GHOST_WRITING', 'FREEZING_TEMP'], speed: 1.3, aggressiveness: 0.85, trait: 'Gains 15% speed per kill' },
    SHADOW: { name: 'Shadow', evidence: ['EMF_5', 'GHOST_WRITING', 'LASER_PROJECTION'], speed: 0.8, aggressiveness: 0.3, trait: 'Passive in light' },
    SKINWALKER: { name: 'Skinwalker', evidence: ['FREEZING_TEMP', 'GHOST_WRITING', 'SPIRIT_BOX'], speed: 0.95, aggressiveness: 0.65, trait: 'Fake orbs on camera' },
    SPECTER: { name: 'Specter', evidence: ['EMF_5', 'FREEZING_TEMP', 'LASER_PROJECTION'], speed: 1.0, aggressiveness: 0.75, trait: '3x item throws' },
    SPIRIT: { name: 'Spirit', evidence: ['HANDPRINTS', 'GHOST_WRITING', 'SPIRIT_BOX'], speed: 0.9, aggressiveness: 0.55, trait: 'Blue candle flames' },
    DEMON: { name: 'Demon', evidence: ['FREEZING_TEMP', 'GHOST_WRITING', 'SPIRIT_BOX'], speed: 1.4, aggressiveness: 0.95, trait: 'Hunts at 100% sanity' },
    VEX: { name: 'Vex', evidence: ['EMF_5', 'HANDPRINTS', 'LASER_PROJECTION'], speed: 1.15, aggressiveness: 0.8, trait: 'No-clip through walls' },
    SIREN: { name: 'Siren', evidence: ['GHOST_ORBS', 'SPIRIT_BOX', 'HANDPRINTS'], speed: 1.05, aggressiveness: 0.65, trait: 'Distinctive humming' },
    YUREI: { name: 'Yurei', evidence: ['GHOST_ORBS', 'FREEZING_TEMP', 'HANDPRINTS'], speed: 1.0, aggressiveness: 0.75, trait: '-20% sanity on sight' },
    RAIJU: { name: 'Raiju', evidence: ['EMF_5', 'GHOST_ORBS', 'LASER_PROJECTION'], speed: 0.9, aggressiveness: 0.7, trait: 'Speed boost near electronics' },
    MARE: { name: 'Mare', evidence: ['GHOST_ORBS', 'SPIRIT_BOX', 'FREEZING_TEMP'], speed: 1.0, aggressiveness: 0.7, trait: 'Variable hunt threshold' },
    SHADE: { name: 'Shade', evidence: ['EMF_5', 'FREEZING_TEMP', 'GHOST_ORBS'], speed: 0.75, aggressiveness: 0.4, trait: 'Shy - stops if multiple present' }
};

const MAPS = [
    { name: 'Fenway Drive', size: 50, rooms: ['Lobby', 'Bedroom A', 'Bedroom B', 'Kitchen', 'Bathroom', 'Basement', 'Garage'], difficulty: 'Amateur' },
    { name: 'Juniper Road', size: 40, rooms: ['Lobby', 'Bedroom', 'Kitchen', 'Hallway', 'Office', 'Cellar'], difficulty: 'Intermediate' },
    { name: 'Blackwood Asylum', size: 80, rooms: ['Entrance', 'Ward A', 'Ward B', 'Surgery', 'Morgue', 'Basement', 'Attic', 'Library'], difficulty: 'Professional' }
];

class DemonologyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        this.renderer.pixelRatio = Math.min(window.devicePixelRatio, 1.5);

        // Systems
        this.audio = new AudioManager();
        this.effects = new EffectsEngine();

        // Game state
        this.yaw = 0;
        this.pitch = 0;
        this.keys = {};
        this.frameCount = 0;

        this.playerState = {
            position: new THREE.Vector3(0, 1.6, 0),
            sanity: 100,
            stamina: 100,
            isDead: false,
            currentEquipment: null
        };

        this.gameState = {
            sanity: 100,
            emfLevel: 0,
            temperature: 68,
            hunting: false,
            huntTimer: 0,
            currentRoom: 'LOBBY',
            ghostRoom: null,
            difficulty: 'Amateur',
            setupTimer: 300,
            missionTime: 0,
            lastHeartbeat: 0
        };

        this.selectedMap = MAPS[Math.floor(Math.random() * MAPS.length)];
        this.selectedGhost = Object.values(GHOST_TYPES)[Math.floor(Math.random() * Object.keys(GHOST_TYPES).length)];
        this.ghostRoomIndex = Math.floor(Math.random() * this.selectedMap.rooms.length);
        this.gameState.ghostRoom = this.selectedMap.rooms[this.ghostRoomIndex];

        this.detectedEvidence = new Set();
        this.rooms = [];
        this.ghost = null;
        this.particles = [];
        this.lights = [];

        this.setupScene();
        this.setupControls();
        this.createMap();
        this.createGhost();
        this.createParticles();

        this.effects.addNotification(`MAP: ${this.selectedMap.name} - ${this.selectedMap.difficulty}`, 'info');
        this.effects.addNotification(`GHOST: ${this.selectedGhost.name} - TRAIT: ${this.selectedGhost.trait}`, 'warning');

        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupScene() {
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 180, 350);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
        directionalLight.position.set(50, 80, 40);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.far = 250;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.bias = -0.0001;
        this.scene.add(directionalLight);

        this.camera.position.copy(this.playerState.position);
    }

    createMap() {
        const roomSize = 16;
        const roomHeight = 4;
        const spacing = 5;

        this.selectedMap.rooms.forEach((roomName, index) => {
            const x = (index % 2) * (roomSize + spacing);
            const z = Math.floor(index / 2) * (roomSize + spacing);

            const geometry = new THREE.BoxGeometry(roomSize, roomHeight, roomSize);
            let color = 0x2a2a3a;
            if (roomName === this.gameState.ghostRoom) {
                color = 0x3a2a2a;
            }

            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.9,
                metalness: 0.02,
                side: THREE.DoubleSide
            });

            const room = new THREE.Mesh(geometry, material);
            room.position.set(x, roomHeight / 2, z);
            room.castShadow = true;
            room.receiveShadow = true;

            this.scene.add(room);

            // Room lights
            const light = new THREE.PointLight(0x8888aa, 0.7, 60);
            light.position.set(x, 3.5, z);
            light.castShadow = true;
            this.scene.add(light);
            this.lights.push(light);

            // Room details
            this.addRoomDetails(x, z, roomName);

            this.rooms.push({
                mesh: room,
                name: roomName,
                position: new THREE.Vector3(x, 0, z),
                bounds: { x: x - roomSize / 2, z: z - roomSize / 2, size: roomSize }
            });
        });

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(400, 400);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.position.y = -0.1;
        this.scene.add(ground);
    }

    addRoomDetails(x, z, roomName) {
        const detailCount = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < detailCount; i++) {
            const geos = [
                new THREE.BoxGeometry(1.5, 2.5, 0.8),
                new THREE.BoxGeometry(1, 1.5, 1),
                new THREE.CylinderGeometry(0.4, 0.4, 2.5)
            ];

            const geo = geos[Math.floor(Math.random() * geos.length)];
            const material = new THREE.MeshStandardMaterial({
                color: Math.random() * 0x555555 + 0x111111,
                roughness: 0.85,
                metalness: 0.05
            });

            const obj = new THREE.Mesh(geo, material);
            obj.position.set(
                x + (Math.random() - 0.5) * 12,
                1.2,
                z + (Math.random() - 0.5) * 12
            );
            obj.castShadow = true;
            obj.receiveShadow = true;

            this.scene.add(obj);
        }
    }

    createGhost() {
        const ghostGeometry = new THREE.IcosahedronGeometry(0.8, 5);
        const ghostMaterial = new THREE.MeshStandardMaterial({
            color: 0x5588ff,
            emissive: 0x3355ff,
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.75,
            wireframe: false
        });

        this.ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
        
        const ghostRoom = this.rooms.find(r => r.name === this.gameState.ghostRoom);
        if (ghostRoom) {
            this.ghost.position.copy(ghostRoom.position).add(new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                1.8,
                (Math.random() - 0.5) * 6
            ));
        }

        this.ghost.castShadow = true;
        this.scene.add(this.ghost);
    }

    createParticles() {
        for (let i = 0; i < 4; i++) {
            const particleCount = 120;
            const particleGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);

            for (let j = 0; j < particleCount * 3; j += 3) {
                positions[j] = (Math.random() - 0.5) * 6;
                positions[j + 1] = (Math.random() - 0.5) * 6;
                positions[j + 2] = (Math.random() - 0.5) * 6;
            }

            particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const particleMaterial = new THREE.PointsMaterial({
                color: 0x6699ff,
                size: 0.18,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.5
            });

            const points = new THREE.Points(particleGeometry, particleMaterial);
            this.ghost.add(points);
            this.particles.push({
                mesh: points,
                geometry: particleGeometry,
                offset: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random()
            });
        }
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            if (e.key === 'c' || e.key === 'C') this.toggleCamera();
            if (e.key >= '1' && e.key <= '6') this.switchEquipment(parseInt(e.key) - 1);
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        document.addEventListener('mousemove', (e) => this.handleMouseLook(e));
        document.addEventListener('click', () => {
            if (document.pointerLockElement === null) this.canvas.requestPointerLock();
        });
    }

    handleMouseLook(event) {
        if (document.pointerLockElement !== this.canvas) return;

        const sensitivity = 0.0035;
        this.yaw += event.movementX * sensitivity;
        this.pitch -= event.movementY * sensitivity;
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }

    updatePlayer() {
        const isSprinting = this.keys[' '];
        const speed = isSprinting ? 0.35 : 0.22;
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

            this.playerState.position.add(moveVector);
            this.camera.position.copy(this.playerState.position);

            if (this.gameState.hunting) {
                this.playerState.sanity = Math.max(0, this.playerState.sanity - 0.12);
            } else {
                this.playerState.sanity = Math.max(0, this.playerState.sanity - 0.015);
            }

            if (isSprinting) {
                this.playerState.stamina = Math.max(0, this.playerState.stamina - 0.6);
            } else {
                this.playerState.stamina = Math.min(100, this.playerState.stamina + 0.4);
            }
        } else {
            this.playerState.stamina = Math.min(100, this.playerState.stamina + 0.5);
        }

        const dir3D = new THREE.Vector3(
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        this.camera.lookAt(this.camera.position.clone().add(dir3D));

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
        const distanceToGhost = this.camera.position.distanceTo(this.ghost.position);

        if (distanceToGhost < 30) {
            this.gameState.emfLevel = Math.min(5, Math.max(this.gameState.emfLevel, 5 - Math.floor(distanceToGhost / 6)));
            this.gameState.temperature = Math.max(5, this.gameState.temperature - 0.3);
            
            if (this.gameState.emfLevel >= 2 && Date.now() - this.gameState.lastHeartbeat > 100) {
                this.audio.playEMFPulse(this.gameState.emfLevel);
                this.gameState.lastHeartbeat = Date.now();
            }
        } else {
            this.gameState.emfLevel = Math.max(0, this.gameState.emfLevel - 0.9);
            this.gameState.temperature = Math.min(72, this.gameState.temperature + 0.2);
        }

        if (distanceToGhost < 35 && Math.random() < 0.006) {
            const evidence = this.selectedGhost.evidence[Math.floor(Math.random() * this.selectedGhost.evidence.length)];
            if (!this.detectedEvidence.has(evidence)) {
                this.detectedEvidence.add(evidence);
                this.effects.addNotification(`📡 DETECTED: ${evidence}`, 'warning');
            }
        }

        const huntThreshold = this.selectedGhost.trait.includes('Demon') ? 0 : 50;
        if (this.playerState.sanity < huntThreshold && !this.gameState.hunting) {
            this.gameState.hunting = true;
            this.gameState.huntTimer = 0;
            document.getElementById('huntIndicator').style.display = 'block';
            this.audio.playCritical();
            this.effects.screenFlash('rgba(255, 0, 0, 0.4)', 300);
            this.effects.addNotification('⚠ HUNT INITIATED ⚠', 'danger');
        }

        if (this.gameState.hunting) {
            this.gameState.huntTimer++;

            if (this.gameState.huntTimer > 2000) {
                this.gameState.hunting = false;
                document.getElementById('huntIndicator').style.display = 'none';
                this.effects.addNotification('Hunt ended - regroup', 'info');
            }

            const direction = this.camera.position.clone().sub(this.ghost.position);
            direction.normalize().multiplyScalar(this.selectedGhost.speed * 0.1);
            this.ghost.position.add(direction);

            this.playerState.sanity = Math.max(0, this.playerState.sanity - 0.25);

            if (this.gameState.huntTimer % 25 === 0) {
                const bpm = 80 + (100 - this.playerState.sanity) * 1.8;
                this.audio.playHeartbeat(bpm);
            }

            if (this.gameState.huntTimer % 150 === 0) {
                this.effects.createScreenGlitch();
            }
        }

        this.particles.forEach((p, idx) => {
            const positions = p.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                const t = (this.frameCount + idx * 30 + i) * 0.01 + p.offset;
                positions[i] += Math.sin(t * p.speed) * 0.15;
                positions[i + 1] += Math.cos(t * p.speed) * 0.15;
                positions[i + 2] += Math.sin(t * p.speed * 0.7) * 0.15;
            }
            p.geometry.attributes.position.needsUpdate = true;
        });
    }

    updateUI() {
        this.frameCount++;

        document.getElementById('sanity-val').textContent = Math.floor(this.playerState.sanity) + '%';
        document.getElementById('sanity-bar').style.width = this.playerState.sanity + '%';
        if (this.playerState.sanity < 25) {
            document.getElementById('sanity-bar').classList.add('critical');
        } else {
            document.getElementById('sanity-bar').classList.remove('critical');
        }

        document.getElementById('stamina-val').textContent = Math.floor(this.playerState.stamina) + '%';
        document.getElementById('stamina-bar').style.width = this.playerState.stamina + '%';

        document.getElementById('emf-val').textContent = this.gameState.emfLevel + '/5';
        document.getElementById('temp-val').textContent = Math.floor(this.gameState.temperature) + '°F';
        document.getElementById('dist-val').textContent = Math.floor(this.camera.position.distanceTo(this.ghost.position)) + 'm';

        document.getElementById('ghost-type').textContent = this.selectedGhost.name.toUpperCase();
        document.getElementById('threat-level').textContent = 
            this.playerState.sanity < 10 ? 'CRITICAL' :
            this.gameState.hunting ? 'EXTREME' :
            this.playerState.sanity < 25 ? 'SEVERE' : 'NORMAL';
        document.getElementById('hunt-status').textContent = this.gameState.hunting ? '◆ ACTIVE ◆' : 'DORMANT';

        document.getElementById('zone-val').textContent = this.gameState.currentRoom;
        document.getElementById('ghost-room-val').textContent = this.gameState.ghostRoom;

        const boxes = document.querySelectorAll('.evidence-box');
        boxes.forEach(box => {
            if (this.detectedEvidence.has(box.dataset.evidence)) {
                box.classList.add('found');
            }
        });

        this.effects.updateWithering(this.playerState.sanity);
        this.effects.updateHuntVignette(this.gameState.hunting);
        this.effects.drawEMFDetector(this.gameState.emfLevel);
    }

    renderCameras() {
        const cameraCtx = document.getElementById('cameraCanvas').getContext('2d');
        const minimapCtx = document.getElementById('minimapCanvas').getContext('2d');

        if (cameraCtx && minimapCtx) {
            this.effects.drawInfraredCamera(cameraCtx, this.ghost.position, this.playerState.position, this.rooms);
            this.effects.drawMinimap(minimapCtx, this.playerState.position, this.ghost.position, this.rooms, this.gameState.ghostRoom, this.gameState.hunting);
        }
    }

    switchEquipment(index) {
        const equipmentNames = ['EMF READER', 'THERMAL CAMERA', 'SPIRIT BOX', 'UV FLASHLIGHT', 'PHOTO CAMERA', 'SALT CANISTER'];
        if (equipmentNames[index]) {
            this.playerState.currentEquipment = equipmentNames[index];
            this.effects.addNotification(`→ ${equipmentNames[index]}`, 'info');
        }
    }

    toggleCamera() {
        this.effects.addNotification('📷 CAMERA TOGGLED', 'info');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updatePlayer();
        this.updateGhost();
        this.updateUI();
        this.renderCameras();

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => {
    new DemonologyGame();
});

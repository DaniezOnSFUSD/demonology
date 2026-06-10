// Audio System for Demonology
class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.7;
        
        this.sounds = {
            ambient: null,
            hunt: null,
            heartbeat: null,
            spiritbox: null,
            emfPulse: null,
            footsteps: [],
            breathe: null,
            doors: [],
            objects: [],
            ghostScream: null
        };

        this.oscillators = [];
    }

    playTone(frequency, duration, volume = 0.5, type = 'sine', envelope = true) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.value = frequency;
        gain.connect(this.masterGain);
        osc.connect(gain);

        gain.gain.value = volume;

        if (envelope) {
            gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        }

        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + duration);

        this.oscillators.push(osc);
        return osc;
    }

    playEMFPulse(level) {
        const frequency = 200 + level * 150;
        const duration = 0.1 + level * 0.05;
        this.playTone(frequency, duration, 0.4);
    }

    playHeartbeat(bpm = 120) {
        const beatDuration = 60 / bpm;
        const gain = this.audioContext.createGain();
        gain.connect(this.masterGain);

        const playBeat = () => {
            const osc = this.audioContext.createOscillator();
            osc.frequency.setValueAtTime(60, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.1);
            osc.connect(gain);

            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.15);

            setTimeout(playBeat, beatDuration * 1000);
        };

        playBeat();
    }

    playSpiritBoxStatic() {
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        const gain = this.audioContext.createGain();
        gain.connect(this.masterGain);
        source.connect(gain);

        gain.gain.value = 0.2;
        source.start(this.audioContext.currentTime);
        source.stop(this.audioContext.currentTime + 0.5);

        return source;
    }

    playGhostVoice(phrase) {
        // Simulated ghost voice with pitch manipulation
        const words = {
            'help': [200, 220, 180],
            'who': [150, 180, 160],
            'here': [250, 230, 200],
            'fear': [220, 180, 240],
            'pain': [180, 220, 170]
        };

        const frequencies = words[phrase] || [200, 220, 180];
        const duration = 0.3;

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, duration * 0.8, 0.4, 'sine', true);
            }, index * (duration * 1000));
        });
    }

    playUVDetection() {
        this.playTone(880, 0.1, 0.6, 'square');
    }

    playCameraClick() {
        this.playTone(1200, 0.05, 0.4);
        setTimeout(() => this.playTone(1800, 0.05, 0.4), 50);
    }

    playWarning() {
        this.playTone(1000, 0.2, 0.6, 'sine');
        setTimeout(() => this.playTone(1000, 0.2, 0.6, 'sine'), 250);
    }

    playCritical() {
        this.playTone(800, 0.15, 0.7, 'sine');
        setTimeout(() => this.playTone(600, 0.15, 0.7, 'sine'), 160);
        setTimeout(() => this.playTone(800, 0.15, 0.7, 'sine'), 320);
    }

    setMasterVolume(value) {
        this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
}

window.AudioManager = AudioManager;

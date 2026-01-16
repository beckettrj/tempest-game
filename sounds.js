// Web Audio API Sound System for TEMPEST
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.effectsGain = null;
        this.initialized = false;
        this.bulletSounds = new Map(); // Track active bullet sounds
        this.backgroundMusic = null;
        this.duckLevel = 0.3; // Default duck to 30%
        this.musicVolume = 0.2;
    }

    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3;
            
            // Separate gain nodes for music and effects
            this.effectsGain = this.audioContext.createGain();
            this.effectsGain.gain.value = 1.0;
            this.effectsGain.connect(this.masterGain);
            
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            this.masterGain.connect(this.audioContext.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    setVolume(volume) {
        if (this.initialized && this.masterGain) {
            this.masterGain.gain.value = volume;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.initialized && this.musicGain) {
            this.musicGain.gain.value = volume;
        }
    }

    setDuckLevel(level) {
        this.duckLevel = level;
    }

    duckMusic(duck = true) {
        if (!this.initialized || !this.musicGain) return;
        
        const targetVolume = duck ? this.musicVolume * this.duckLevel : this.musicVolume;
        this.musicGain.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.audioContext.currentTime);
        this.musicGain.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + 0.1);
    }

    playShoot() {
        if (!this.initialized) return;
        
        // Low-tone 80s arcade blip sound
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.effectsGain);
        
        osc.type = 'sine'; // Softer sine wave
        
        // Low frequency blip (200Hz -> 400Hz)
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.04);
        
        // Short, crisp envelope
        gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.06);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.06);
    }

    playShootContinuous(bullet) {
        if (!this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'square';
        osc.frequency.value = 800 + (bullet.position * 600); // Start high, go lower
        
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        
        osc.start(this.audioContext.currentTime);
        
        // Store oscillator and gain for later updates
        this.bulletSounds.set(bullet.id, { osc, gain, bullet });
    }

    updateBulletPitch(bullet) {
        if (!this.initialized) return;
        
        const soundData = this.bulletSounds.get(bullet.id);
        if (soundData) {
            // Pitch increases as bullet travels inward (position decreases)
            const freq = 800 + ((1.0 - bullet.position) * 800);
            soundData.osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        }
    }

    stopBulletSound(bullet) {
        if (!this.initialized) return;
        
        const soundData = this.bulletSounds.get(bullet.id);
        if (soundData) {
            try {
                soundData.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
                soundData.gain.gain.setValueAtTime(soundData.gain.gain.value, this.audioContext.currentTime);
                soundData.gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                soundData.osc.stop(this.audioContext.currentTime + 0.05);
            } catch (e) {
                // Oscillator might already be stopped
            }
            this.bulletSounds.delete(bullet.id);
        }
    }

    stopAllBulletSounds() {
        if (!this.initialized) return;
        
        this.bulletSounds.forEach((soundData, id) => {
            try {
                soundData.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
                soundData.gain.gain.setValueAtTime(soundData.gain.gain.value, this.audioContext.currentTime);
                soundData.gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                soundData.osc.stop(this.audioContext.currentTime + 0.05);
            } catch (e) {
                // Ignore errors from already stopped oscillators
            }
        });
        this.bulletSounds.clear();
    }

    playExplosion() {
        if (!this.initialized) return;
        
        // Noise burst
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.4, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        noise.buffer = noiseBuffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.4);
        filter.Q.value = 1;
        
        // Add bass punch
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.25);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        noise.connect(filter);
        filter.connect(gain);
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start(this.audioContext.currentTime);
        osc.start(this.audioContext.currentTime);
        noise.stop(this.audioContext.currentTime + 0.4);
        osc.stop(this.audioContext.currentTime + 0.4);
    }

    playMove() {
        if (!this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.setValueAtTime(220, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, this.audioContext.currentTime + 0.06);
        osc.type = 'square';
        
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.06);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.06);
    }

    playZapper() {
        if (!this.initialized) return;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        osc1.frequency.setValueAtTime(80, this.audioContext.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(3000, this.audioContext.currentTime + 0.6);
        
        osc2.frequency.setValueAtTime(160, this.audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(6000, this.audioContext.currentTime + 0.6);
        
        gain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
        
        osc1.start(this.audioContext.currentTime);
        osc2.start(this.audioContext.currentTime);
        osc1.stop(this.audioContext.currentTime + 0.6);
        osc2.stop(this.audioContext.currentTime + 0.6);
    }

    playLevelComplete() {
        if (!this.initialized) return;
        
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.frequency.value = freq;
            osc.type = 'square';
            
            const startTime = this.audioContext.currentTime + i * 0.15;
            
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }

    playGameOver() {
        if (!this.initialized) return;
        
        const notes = [523.25, 493.88, 440.00, 392.00]; // C, B, A, G descending
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.frequency.value = freq;
            osc.type = 'sawtooth';
            
            const startTime = this.audioContext.currentTime + i * 0.2;
            
            gain.gain.setValueAtTime(0.4, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    playEnemySpawn() {
        if (!this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.setValueAtTime(50, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
        osc.type = 'sawtooth';
        
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    playHit() {
        if (!this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.value = 300;
        osc.type = 'square';
        
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.12);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.12);
    }

    playBlockSpawn() {
        if (!this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
        osc.frequency.linearRampToValueAtTime(300, this.audioContext.currentTime + 0.1);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    playBlockHit() {
        if (!this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.08);
        osc.type = 'triangle';
        
        gain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.08);
    }

    playBlockLand() {
        if (!this.initialized) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.value = 150;
        osc.type = 'square';
        
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    playRimClear() {
        if (!this.initialized) return;
        
        // Exciting clear sound like Tetris!
        const notes = [523.25, 587.33, 659.25, 783.99, 880.00]; // C, D, E, G, A
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.frequency.value = freq;
            osc.type = 'square';
            
            const startTime = this.audioContext.currentTime + i * 0.08;
            
            gain.gain.setValueAtTime(0.35, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });
    }

    playEnemyPulsate(enemy) {
        if (!this.initialized) return;
        
        // Different frequencies and patterns for different shapes
        let baseFreq, waveType, pulseSpeed;
        
        switch (enemy.shape) {
            case 'square':
                baseFreq = 200;
                waveType = 'square';
                pulseSpeed = 0.15;
                break;
            case 'triangle':
                baseFreq = 300;
                waveType = 'triangle';
                pulseSpeed = 0.1;
                break;
            case 'octagon':
                baseFreq = 150;
                waveType = 'sine';
                pulseSpeed = 0.2;
                break;
            case 'pentagon':
                baseFreq = 250;
                waveType = 'sawtooth';
                pulseSpeed = 0.12;
                break;
            case 'rotatingcube':
                baseFreq = 100;
                waveType = 'square';
                pulseSpeed = 0.08;
                break;
            default:
                baseFreq = 180;
                waveType = 'sine';
                pulseSpeed = 0.15;
        }
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = waveType;
        osc.frequency.value = baseFreq;
        
        // Pulsating volume
        gain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, this.audioContext.currentTime + pulseSpeed / 2);
        gain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + pulseSpeed);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + pulseSpeed);
    }

    playMissedShot() {
        if (!this.initialized) return;
        
        // Negative sound for wasted shot
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    playEnemyDrum(enemy, intensity = 1.0) {
        if (!this.initialized) return;
        
        // Different low-pitched drum sounds for each shape
        let kickFreq, snapFreq, decayTime;
        
        switch (enemy.shape) {
            case 'square':
                // Deep kick drum
                kickFreq = 60;
                snapFreq = 150;
                decayTime = 0.4;
                break;
            case 'triangle':
                // Punchy tom
                kickFreq = 80;
                snapFreq = 200;
                decayTime = 0.3;
                break;
            case 'octagon':
                // Floor tom
                kickFreq = 50;
                snapFreq = 120;
                decayTime = 0.5;
                break;
            case 'pentagon':
                // Mid tom
                kickFreq = 90;
                snapFreq = 220;
                decayTime = 0.35;
                break;
            case 'rotatingcube':
                // Bass boom
                kickFreq = 40;
                snapFreq = 100;
                decayTime = 0.6;
                break;
            default:
                kickFreq = 70;
                snapFreq = 180;
                decayTime = 0.4;
        }
        
        // Create kick drum oscillator
        const kick = this.audioContext.createOscillator();
        const kickGain = this.audioContext.createGain();
        
        kick.connect(kickGain);
        kickGain.connect(this.masterGain);
        
        kick.type = 'sine';
        kick.frequency.setValueAtTime(kickFreq, this.audioContext.currentTime);
        kick.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.05);
        
        const volume = 0.2 * intensity;
        kickGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        kickGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + decayTime);
        
        kick.start(this.audioContext.currentTime);
        kick.stop(this.audioContext.currentTime + decayTime);
        
        // Add snap/click for definition
        const snap = this.audioContext.createOscillator();
        const snapGain = this.audioContext.createGain();
        
        snap.connect(snapGain);
        snapGain.connect(this.masterGain);
        
        snap.type = 'square';
        snap.frequency.value = snapFreq;
        
        snapGain.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
        snapGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        snap.start(this.audioContext.currentTime);
        snap.stop(this.audioContext.currentTime + 0.05);
    }

    // NEW 80s ARCADE SOUNDS

    playSegmentTone(segment, totalSegments) {
        if (!this.initialized) return;
        
        // Chromatic scale starting at C3 (261.63 Hz)
        const baseFreq = 261.63;
        const semitone = Math.pow(2, 1/12);
        const segmentSemitone = segment % 12; // Wrap at octave
        const octaveShift = Math.floor(segment / 12);
        const frequency = baseFreq * Math.pow(semitone, segmentSemitone) * Math.pow(2, octaveShift);
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.effectsGain);
        
        osc.type = 'square'; // 80s arcade square wave
        osc.frequency.value = frequency;
        
        // Short 80s-style envelope (30ms)
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.03);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.03);
    }

    playLightningFlash(duration = 0.033) {
        if (!this.initialized) return;
        
        // White noise burst for lightning effect
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.effectsGain);
        
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        noise.start(this.audioContext.currentTime);
        noise.stop(this.audioContext.currentTime + duration);
    }

    playPlayerExplosion() {
        if (!this.initialized) return;
        
        // Descending sawtooth with crackle
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.effectsGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.5);
        
        // Add crackling noise
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 5);
        }
        
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        
        noise.buffer = buffer;
        noise.connect(noiseGain);
        noiseGain.connect(this.effectsGain);
        
        noiseGain.gain.value = 0.2;
        
        noise.start(this.audioContext.currentTime);
    }

    playTransitionIntro() {
        if (!this.initialized) return;
        
        // 2-second TRON-style triumphant fanfare
        // Rising arpeggio: C-E-G-C-E-G-C (over 1.5 seconds)
        const notes = [
            { freq: 261.63, time: 0.0 },     // C4
            { freq: 329.63, time: 0.2 },     // E4
            { freq: 392.00, time: 0.4 },     // G4
            { freq: 523.25, time: 0.6 },     // C5
            { freq: 659.25, time: 0.8 },     // E5
            { freq: 783.99, time: 1.0 },     // G5
            { freq: 1046.50, time: 1.2 }     // C6
        ];
        
        notes.forEach(note => {
            // Lead voice (sawtooth)
            const lead = this.audioContext.createOscillator();
            const leadGain = this.audioContext.createGain();
            
            lead.connect(leadGain);
            leadGain.connect(this.effectsGain);
            
            lead.type = 'sawtooth';
            lead.frequency.value = note.freq;
            
            const startTime = this.audioContext.currentTime + note.time;
            leadGain.gain.setValueAtTime(0.2, startTime);
            leadGain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
            leadGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            lead.start(startTime);
            lead.stop(startTime + 0.15);
            
            // Bass harmony (square wave, octave down)
            const bass = this.audioContext.createOscillator();
            const bassGain = this.audioContext.createGain();
            
            bass.connect(bassGain);
            bassGain.connect(this.effectsGain);
            
            bass.type = 'square';
            bass.frequency.value = note.freq / 2;
            
            bassGain.gain.setValueAtTime(0.15, startTime);
            bassGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            bass.start(startTime);
            bass.stop(startTime + 0.15);
        });
        
        // Final sustaining chord (C major) at 1.5 seconds
        const chordStart = this.audioContext.currentTime + 1.5;
        const chordFreqs = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        chordFreqs.forEach(freq => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.effectsGain);
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0.15, chordStart);
            gain.gain.exponentialRampToValueAtTime(0.01, chordStart + 0.5);
            
            osc.start(chordStart);
            osc.stop(chordStart + 0.5);
        });
        
        // Duck music during fanfare
        this.duckMusic(true);
        setTimeout(() => this.duckMusic(false), 2000);
    }

    playDescentWhoosh(progress) {
        if (!this.initialized) return;
        
        // Rising pitch whoosh that matches acceleration
        // progress: 0.0 to 1.0
        const startFreq = 100;
        const endFreq = 800;
        const frequency = startFreq + (endFreq - startFreq) * progress;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.effectsGain);
        
        osc.type = 'sawtooth';
        osc.frequency.value = frequency;
        
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 2;
        filter.Q.value = 5;
        
        gain.gain.value = 0.1 * progress; // Volume increases with speed
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    startBackgroundMusic() {
        if (!this.initialized || this.backgroundMusic) return;
        
        // TRON-style 8-bar loop (I-V-vi-IV progression in C major, 120 BPM)
        const bpm = 120;
        const beatDuration = 60 / bpm;
        const barDuration = beatDuration * 4;
        const loopDuration = barDuration * 8;
        
        // Chord progression: C - G - Am - F (repeated twice for 8 bars)
        const progression = [
            [261.63, 329.63, 392.00],  // C major (bar 1-2)
            [392.00, 493.88, 587.33],  // G major (bar 3-4)
            [220.00, 261.63, 329.63],  // A minor (bar 5-6)
            [174.61, 220.00, 261.63]   // F major (bar 7-8)
        ];
        
        this.backgroundMusic = { stopTime: 0, oscillators: [] };
        
        const playLoop = () => {
            if (!this.backgroundMusic) return;
            
            const startTime = this.audioContext.currentTime;
            
            progression.forEach((chord, chordIndex) => {
                const chordStart = startTime + (chordIndex * barDuration * 2);
                
                // Bass line (square wave)
                const bass = this.audioContext.createOscillator();
                const bassGain = this.audioContext.createGain();
                
                bass.connect(bassGain);
                bassGain.connect(this.musicGain);
                
                bass.type = 'square';
                bass.frequency.value = chord[0];
                
                bassGain.gain.setValueAtTime(0.3, chordStart);
                bassGain.gain.setValueAtTime(0.3, chordStart + barDuration * 2);
                
                bass.start(chordStart);
                bass.stop(chordStart + barDuration * 2);
                
                // Store oscillator reference
                if (this.backgroundMusic) {
                    this.backgroundMusic.oscillators.push(bass);
                }
                
                // Lead melody (sawtooth)
                chord.forEach((freq, noteIndex) => {
                    const lead = this.audioContext.createOscillator();
                    const leadGain = this.audioContext.createGain();
                    
                    lead.connect(leadGain);
                    leadGain.connect(this.musicGain);
                    
                    lead.type = 'sawtooth';
                    lead.frequency.value = freq * 2; // Octave up
                    
                    const noteStart = chordStart + (noteIndex * beatDuration);
                    leadGain.gain.setValueAtTime(0.15, noteStart);
                    leadGain.gain.exponentialRampToValueAtTime(0.01, noteStart + beatDuration);
                    
                    lead.start(noteStart);
                    lead.stop(noteStart + beatDuration);
                    
                    // Store oscillator reference
                    if (this.backgroundMusic) {
                        this.backgroundMusic.oscillators.push(lead);
                    }
                });
            });
            
            // Schedule next loop
            this.backgroundMusic.timeout = setTimeout(playLoop, loopDuration * 1000);
        };
        
        playLoop();
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            if (this.backgroundMusic.timeout) {
                clearTimeout(this.backgroundMusic.timeout);
            }
            // Stop all active oscillators immediately
            if (this.backgroundMusic.oscillators) {
                this.backgroundMusic.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {
                        // Oscillator may already be stopped
                    }
                });
            }
            this.backgroundMusic = null;
        }
    }
}

const soundManager = new SoundManager();


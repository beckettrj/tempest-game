// TEMPEST Game Engine - 1981 Arcade Recreation

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1400;
canvas.height = 700;

// Game State
const game = {
    state: 'start', // start, playing, paused, gameover, levelcomplete
    score: 0,
    level: 1,
    lives: 3,
    zappers: 1,
    paused: false,
    frameCount: 0,
    enemySpawnTimer: 0,
    enemySpawnRate: 240,
    blockSpawnTimer: 0,
    blockSpawnRate: 90
};

// Settings
const settings = {
    difficulty: 'easy', // easy, medium, hard, insane
    volume: 0.3,
    musicVolume: 0.2,
    duckLevel: 0.3
};

// Difficulty presets
const difficultySettings = {
    easy: {
        enemySpawnRate: 240,
        blockSpawnRate: 90,
        enemySpeedMultiplier: 1.0,
        blockSpeedMultiplier: 1.0,
        lives: 5
    },
    medium: {
        enemySpawnRate: 180,
        blockSpawnRate: 75,
        enemySpeedMultiplier: 1.3,
        blockSpeedMultiplier: 1.2,
        lives: 3
    },
    hard: {
        enemySpawnRate: 120,
        blockSpawnRate: 60,
        enemySpeedMultiplier: 1.6,
        blockSpeedMultiplier: 1.5,
        lives: 3
    },
    insane: {
        enemySpawnRate: 80,
        blockSpawnRate: 40,
        enemySpeedMultiplier: 2.0,
        blockSpeedMultiplier: 1.8,
        lives: 2
    }
};

// Level Geometries - Different tube shapes (starting simple, getting complex)
const levelShapes = [
    { type: 'widerectangle', segments: 12, name: 'Wide Rectangle', rotation: Math.PI / 4 },
    { type: 'square', segments: 4, name: 'Square' },
    { type: 'circle', segments: 6, name: 'Circle' },
    { type: 'hexagon', segments: 6, name: 'Hexagon' },
    { type: 'octagon', segments: 8, name: 'Octagon' },
    { type: 'circle', segments: 8, name: 'Circle' },
    { type: 'star', segments: 10, name: 'Star' },
    { type: 'circle', segments: 12, name: 'Circle' },
    { type: 'figure8', segments: 12, name: 'Figure 8' },
    { type: 'plus', segments: 16, name: 'Plus' }
];

// Player
const player = {
    segment: 0,
    position: 1.0, // 0 = center, 1 = rim
    color: '#ffff00',
    width: 0.05
};

// Bullets
const bullets = [];
const bulletSpeed = 0.04;
const bulletSounds = new Map(); // Track active bullet sounds

function shootBullet() {
    const bullet = {
        segment: player.segment + 0.5, // Center of player bar
        position: player.position,
        speed: bulletSpeed,
        baseSpeed: bulletSpeed,
        id: Date.now() + Math.random() // Unique ID for sound tracking
    };
    bullets.push(bullet);
    soundManager.playShootContinuous(bullet);
}

// Enemies - Random shapes (squares, triangles, octagons, pentagons, rotating cubes)
const enemies = [];
const enemyShapes = ['square', 'triangle', 'octagon', 'pentagon', 'rotatingcube'];
const enemyColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#ff0088', '#8800ff'];

// Health requirements per shape (different shapes need different hits)
const shapeHealthMap = {
    'square': 1,        // 1 hit
    'triangle': 2,      // 2 hits
    'octagon': 3,       // 3 hits
    'pentagon': 4,      // 4 hits
    'rotatingcube': 5   // 5 hits - hardest
};

const enemyTypes = {
    FLIPPER: { speed: 0.005, points: 150 },
    TANKER: { speed: 0.003, points: 250 },
    SPIKER: { speed: 0.007, points: 100 },
    SPIKE_WEAK: { speed: 0.004, points: 200, baseHealth: 2 },
    SPIKE_MEDIUM: { speed: 0.003, points: 400, baseHealth: 3 },
    SPIKE_STRONG: { speed: 0.002, points: 600, baseHealth: 4 },
    SPIKE_BOSS: { speed: 0.0015, points: 1000, baseHealth: 6 }
};

// SPIKES that grow from center - deadly obstacles
const spikes = []; // Array of { segment, length, growing }
const maxSpikeLength = 0.8; // Max spike extension (0 = center, 1 = rim)

// TETRIS-style falling blocks
const fallingBlocks = [];
const blockColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800'];
const rimBlocks = []; // Blocks that have landed at the rim - each stores {segment, color, height}

// Level geometry calculator
class LevelGeometry {
    constructor(shapeConfig) {
        this.config = shapeConfig;
        this.segments = shapeConfig.segments;
        this.rimPoints = [];
        this.centerPoints = [];
        this.calculatePoints();
    }

    calculatePoints() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const innerRadius = 0; // Hole in the middle
        
        // Wide tunnel: different radii for horizontal (X) vs vertical (Y)
        const outerRadiusX = 300; // Keep within screen bounds
        const outerRadiusY = 280; // Shorter vertically
        const outerRadius = 280; // For shapes that use uniform radius - reduced to fit
        this.tunnelHoleRadius = 50; // Visual tunnel hole

        for (let i = 0; i < this.segments; i++) {
            const angle = (i / this.segments) * Math.PI * 2;
            const nextAngle = ((i + 1) / this.segments) * Math.PI * 2;
            
            // Apply rotation if specified
            const rotation = this.config.rotation || 0;
            const rotatedAngle = angle + rotation;
            
            let rimX, rimY, centerX2, centerY2;

            switch (this.config.type) {
                case 'circle':
                    // Ellipse for wide tunnel
                    rimX = centerX + Math.cos(rotatedAngle) * outerRadiusX;
                    rimY = centerY + Math.sin(rotatedAngle) * outerRadiusY;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                case 'widerectangle':
                    const rectPt = this.wideRectanglePoint(rotatedAngle, outerRadius);
                    rimX = centerX + rectPt.x;
                    rimY = centerY + rectPt.y;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                case 'square':
                    rimX = centerX + this.squarePoint(rotatedAngle, outerRadius).x;
                    rimY = centerY + this.squarePoint(rotatedAngle, outerRadius).y;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                case 'star':
                    const starRadius = (i % 2 === 0) ? outerRadius : outerRadius * 0.5;
                    rimX = centerX + Math.cos(rotatedAngle) * starRadius;
                    rimY = centerY + Math.sin(rotatedAngle) * starRadius;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                case 'hexagon':
                    rimX = centerX + this.polygonPoint(rotatedAngle, outerRadius, 6).x;
                    rimY = centerY + this.polygonPoint(rotatedAngle, outerRadius, 6).y;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                case 'octagon':
                    rimX = centerX + this.polygonPoint(rotatedAngle, outerRadius, 8).x;
                    rimY = centerY + this.polygonPoint(rotatedAngle, outerRadius, 8).y;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                case 'figure8':
                    const fig8 = this.figure8Point(rotatedAngle, outerRadius);
                    rimX = centerX + fig8.x;
                    rimY = centerY + fig8.y;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                case 'bowtie':
                    const bowtie = this.bowtiePoint(rotatedAngle, outerRadius);
                    rimX = centerX + bowtie.x;
                    rimY = centerY + bowtie.y;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                case 'plus':
                    const plus = this.plusPoint(rotatedAngle, outerRadius);
                    rimX = centerX + plus.x;
                    rimY = centerY + plus.y;
                    centerX2 = centerX;
                    centerY2 = centerY;
                    break;

                default:
                    rimX = centerX + Math.cos(rotatedAngle) * outerRadius;
                    rimY = centerY + Math.sin(rotatedAngle) * outerRadius;
                    centerX2 = centerX;
                    centerY2 = centerY;
            }

            this.rimPoints.push({ x: rimX, y: rimY });
            this.centerPoints.push({ x: centerX2, y: centerY2 });
        }
    }

    squarePoint(angle, radius) {
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const scale = radius / Math.max(absX, absY);
        return { x: x * scale, y: y * scale };
    }

    wideRectanglePoint(angle, radius) {
        // Create a rectangle that's wider than tall but fits on screen with margins
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        
        // Scale x dimension to be wider (1.4x with safe margins for line drawing)
        const widthScale = 1.4;
        const heightScale = 1.0;
        
        // Determine which side we're on
        const scale = radius / Math.max(absX / widthScale, absY / heightScale);
        return { x: x * scale * widthScale, y: y * scale * heightScale };
    }

    polygonPoint(angle, radius, sides) {
        const sideAngle = (Math.PI * 2) / sides;
        const side = Math.floor(angle / sideAngle);
        const sideProgress = (angle % sideAngle) / sideAngle;
        
        const angle1 = side * sideAngle;
        const angle2 = (side + 1) * sideAngle;
        
        const x1 = Math.cos(angle1) * radius;
        const y1 = Math.sin(angle1) * radius;
        const x2 = Math.cos(angle2) * radius;
        const y2 = Math.sin(angle2) * radius;
        
        return {
            x: x1 + (x2 - x1) * sideProgress,
            y: y1 + (y2 - y1) * sideProgress
        };
    }

    figure8Point(angle, radius) {
        const t = angle;
        const x = Math.sin(t) * radius;
        const y = Math.sin(t) * Math.cos(t) * radius;
        return { x, y };
    }

    bowtiePoint(angle, radius) {
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle * 2) * radius * 0.5;
        return { x, y };
    }

    plusPoint(angle, radius) {
        const sector = Math.floor((angle / (Math.PI * 2)) * 4);
        const localAngle = (angle % (Math.PI * 0.5));
        
        if (localAngle < Math.PI * 0.25) {
            const x = Math.cos(sector * Math.PI * 0.5) * radius;
            const y = Math.sin(sector * Math.PI * 0.5) * radius;
            return { x, y };
        } else {
            const x = Math.cos(sector * Math.PI * 0.5 + Math.PI * 0.5) * radius;
            const y = Math.sin(sector * Math.PI * 0.5 + Math.PI * 0.5) * radius;
            return { x, y };
        }
    }

    getPoint(segment, position) {
        const s = Math.floor(segment) % this.segments;
        const nextS = (s + 1) % this.segments;
        const frac = segment - Math.floor(segment);
        
        const rim = this.rimPoints[s];
        const center = this.centerPoints[s];
        const nextRim = this.rimPoints[nextS];
        const nextCenter = this.centerPoints[nextS];
        
        // Interpolate between segments
        const rimX = rim.x + (nextRim.x - rim.x) * frac;
        const rimY = rim.y + (nextRim.y - rim.y) * frac;
        const centerX = center.x + (nextCenter.x - center.x) * frac;
        const centerY = center.y + (nextCenter.y - center.y) * frac;
        
        return {
            x: centerX + (rimX - centerX) * position,
            y: centerY + (rimY - centerY) * position
        };
    }
}

let currentGeometry = new LevelGeometry(levelShapes[0]);

// Input handling
const keys = {};
let lastMoveTime = 0;
let lastFireTime = 0;
const fireDelay = 100; // 100ms between shots (10 shots per second)

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (e.key === 'Enter') {
        if (game.state === 'start' || game.state === 'gameover') {
            startGame();
        }
    }
    
    // Level ready state - start level on any action key
    if (game.state === 'levelready') {
        if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'z' || e.key === 'Z') {
            game.state = 'playing';
            game.frameCount = 0;
            soundManager.startBackgroundMusic();
            return;
        }
    }

    if (e.key === 'Escape') {
        if (game.state === 'playing') {
            // Stop all active bullet sounds
            bullets.forEach(bullet => {
                soundManager.stopBulletSound(bullet);
            });
            soundManager.stopBackgroundMusic();
            gameOver();
        }
    }

    if (e.key === 'p' || e.key === 'P') {
        if (game.state === 'playing') {
            game.paused = !game.paused;
            // Stop bullet sounds when pausing
            if (game.paused) {
                bullets.forEach(bullet => {
                    soundManager.stopBulletSound(bullet);
                });
            }
        }
    }

    if (e.key === ' ') {
        e.preventDefault();
        // Rapid fire handled in update loop
    }

    if ((e.key === 'z' || e.key === 'Z') && game.state === 'playing' && !game.paused) {
        useZapper();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Settings menu functionality
document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('settingsScreen').classList.remove('hidden');
});

document.getElementById('settingsBtn2').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('settingsScreen').classList.remove('hidden');
});

document.getElementById('backBtn').addEventListener('click', () => {
    document.getElementById('settingsScreen').classList.add('hidden');
    // Return to appropriate screen
    if (game.state === 'gameover') {
        document.getElementById('gameOverScreen').classList.remove('hidden');
    } else {
        document.getElementById('startScreen').classList.remove('hidden');
    }
    saveSettings();
});

// Difficulty buttons
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        settings.difficulty = btn.dataset.difficulty;
    });
});

// Volume slider
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');

volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    volumeValue.textContent = volume + '%';
    settings.volume = volume / 100;
    soundManager.setVolume(settings.volume);
    saveSettings();
});

// Music volume slider
const musicVolumeSlider = document.getElementById('musicVolumeSlider');
const musicVolumeValue = document.getElementById('musicVolumeValue');

musicVolumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    musicVolumeValue.textContent = volume + '%';
    settings.musicVolume = volume / 100;
    soundManager.setMusicVolume(settings.musicVolume);
    saveSettings();
});

// Duck level slider
const duckLevelSlider = document.getElementById('duckLevelSlider');
const duckLevelValue = document.getElementById('duckLevelValue');

duckLevelSlider.addEventListener('input', (e) => {
    const level = e.target.value;
    duckLevelValue.textContent = level + '%';
    settings.duckLevel = level / 100;
    soundManager.setDuckLevel(settings.duckLevel);
    saveSettings();
});

// Invert controls checkbox
const invertControlsCheckbox = document.getElementById('invertControlsCheckbox');

invertControlsCheckbox.addEventListener('change', (e) => {
    settings.invertControls = e.target.checked;
    saveSettings();
});

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('tempestSettings');
    if (saved) {
        const loaded = JSON.parse(saved);
        settings.difficulty = loaded.difficulty || 'easy';
        settings.volume = loaded.volume !== undefined ? loaded.volume : 0.3;
        settings.musicVolume = loaded.musicVolume !== undefined ? loaded.musicVolume : 0.2;
        settings.duckLevel = loaded.duckLevel !== undefined ? loaded.duckLevel : 0.3;
        settings.invertControls = loaded.invertControls || false;
        
        // Update UI
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === settings.difficulty);
        });
        
        volumeSlider.value = settings.volume * 100;
        volumeValue.textContent = Math.round(settings.volume * 100) + '%';
        
        musicVolumeSlider.value = settings.musicVolume * 100;
        musicVolumeValue.textContent = Math.round(settings.musicVolume * 100) + '%';
        
        duckLevelSlider.value = settings.duckLevel * 100;
        duckLevelValue.textContent = Math.round(settings.duckLevel * 100) + '%';
        
        invertControlsCheckbox.checked = settings.invertControls;
        
        soundManager.setVolume(settings.volume);
        soundManager.setMusicVolume(settings.musicVolume);
        soundManager.setDuckLevel(settings.duckLevel);
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('tempestSettings', JSON.stringify(settings));
}

// Initialize settings on load
loadSettings();

function startGame() {
    soundManager.init();
    soundManager.setVolume(settings.volume);
    soundManager.setMusicVolume(settings.musicVolume);
    soundManager.setDuckLevel(settings.duckLevel);
    soundManager.stopAllBulletSounds();
    soundManager.startBackgroundMusic();
    game.state = 'playing';
    game.score = 0;
    game.level = 1;
    
    // Apply difficulty settings
    const diff = difficultySettings[settings.difficulty];
    game.lives = diff.lives;
    game.zappers = 1;
    game.paused = false;
    game.frameCount = 0;
    game.enemySpawnRate = diff.enemySpawnRate;
    game.blockSpawnRate = diff.blockSpawnRate;
    
    player.segment = 0;
    player.position = 1.0;
    bullets.length = 0;
    enemies.length = 0;
    fallingBlocks.length = 0;
    rimBlocks.length = 0;
    spikes.length = 0;
    currentGeometry = new LevelGeometry(levelShapes[(game.level - 1) % levelShapes.length]);
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('settingsScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    updateUI();
}

function useZapper() {
    if (game.zappers > 0) {
        game.zappers--;
        soundManager.playZapper();
        
        // Destroy all enemies
        enemies.forEach(enemy => {
            if (!enemy.dead) {
                enemy.dead = true;
                game.score += enemy.points * 2; // Bonus for zapper
            }
        });
        
        // Destroy all falling blocks
        fallingBlocks.forEach(block => {
            if (!block.dead) {
                block.dead = true;
                game.score += 100;
            }
        });
        
        // Clear rim blocks
        const clearedBlocks = rimBlocks.length;
        rimBlocks.length = 0;
        game.score += clearedBlocks * 50;
        
        // Clear spikes!
        spikes.length = 0;
        
        setTimeout(() => {
            enemies.length = 0;
            fallingBlocks.length = 0;
        }, 100);
        
        updateUI();
    }
}

function spawnEnemy() {
    const types = Object.keys(enemyTypes);
    let typeKey;
    
    // Level-based enemy variety
    if (game.level === 1) {
        typeKey = 'FLIPPER';
    } else if (game.level === 2) {
        typeKey = Math.random() < 0.7 ? 'FLIPPER' : 'SPIKER';
    } else if (game.level === 3) {
        const rand = Math.random();
        if (rand < 0.5) typeKey = 'FLIPPER';
        else if (rand < 0.8) typeKey = 'SPIKER';
        else typeKey = 'SPIKE_WEAK';
    } else if (game.level === 4) {
        const rand = Math.random();
        if (rand < 0.4) typeKey = 'FLIPPER';
        else if (rand < 0.6) typeKey = 'SPIKER';
        else if (rand < 0.85) typeKey = 'SPIKE_WEAK';
        else typeKey = 'SPIKE_MEDIUM';
    } else if (game.level >= 5 && game.level < 8) {
        const rand = Math.random();
        if (rand < 0.25) typeKey = 'FLIPPER';
        else if (rand < 0.4) typeKey = 'SPIKER';
        else if (rand < 0.6) typeKey = 'SPIKE_WEAK';
        else if (rand < 0.85) typeKey = 'SPIKE_MEDIUM';
        else typeKey = 'SPIKE_STRONG';
    } else {
        // Level 8+ includes all enemies including bosses
        const rand = Math.random();
        if (rand < 0.2) typeKey = 'FLIPPER';
        else if (rand < 0.35) typeKey = 'SPIKER';
        else if (rand < 0.5) typeKey = 'SPIKE_WEAK';
        else if (rand < 0.7) typeKey = 'SPIKE_MEDIUM';
        else if (rand < 0.9) typeKey = 'SPIKE_STRONG';
        else typeKey = 'SPIKE_BOSS';
    }
    
    const type = enemyTypes[typeKey];
    const segment = Math.floor(Math.random() * currentGeometry.segments) + 0.5;
    const diff = difficultySettings[settings.difficulty];
    
    // Random shape and color for all enemies
    const randomShape = enemyShapes[Math.floor(Math.random() * enemyShapes.length)];
    const randomColor = enemyColors[Math.floor(Math.random() * enemyColors.length)];
    
    // Determine health based on shape AND enemy type
    let enemyHealth;
    if (typeKey.includes('SPIKE')) {
        // SPIKE enemies get base health PLUS shape health bonus
        enemyHealth = (type.baseHealth || 1) + shapeHealthMap[randomShape];
    } else {
        // Regular enemies just use shape health
        enemyHealth = shapeHealthMap[randomShape];
    }
    
    // Calculate speed modifier based on shape health (harder shapes move slower)
    // Square (1 hit) = 1.0x speed, Triangle (2 hits) = 0.85x, Octagon (3) = 0.7x, 
    // Pentagon (4) = 0.6x, Rotating Cube (5) = 0.5x speed
    const shapeSpeedMultiplier = 1.0 - (shapeHealthMap[randomShape] - 1) * 0.15;
    
    enemies.push({
        segment: segment,
        position: 0.0,
        speed: type.speed * (1 + game.level * 0.1) * diff.enemySpeedMultiplier * shapeSpeedMultiplier,
        color: randomColor,
        points: type.points,
        type: typeKey,
        shape: randomShape,
        health: enemyHealth,
        maxHealth: enemyHealth,
        dead: false,
        rotation: 0, // For rotating cubes
        lastDrumBeat: 0 // Track last drum sound
    });
    
    // If it's a rotating cube, grow the spikes!
    if (randomShape === 'rotatingcube') {
        growSpikes();
    }
    
    soundManager.playEnemySpawn();
}

function growSpikes() {
    // Add spikes to random segments or grow existing ones
    const numSpikesToGrow = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numSpikesToGrow; i++) {
        const segment = Math.floor(Math.random() * currentGeometry.segments);
        const existingSpike = spikes.find(s => s.segment === segment);
        
        if (existingSpike) {
            // Grow existing spike
            existingSpike.targetLength = Math.min(maxSpikeLength, existingSpike.targetLength + 0.2);
            existingSpike.growing = true;
        } else {
            // Create new spike
            spikes.push({
                segment: segment,
                length: 0,
                targetLength: 0.3 + Math.random() * 0.3,
                growing: true,
                hitCount: 0 // Track hits for retraction
            });
        }
    }
}

function spawnBlock() {
    const segment = Math.floor(Math.random() * currentGeometry.segments);
    const color = blockColors[Math.floor(Math.random() * blockColors.length)];
    
    const diff = difficultySettings[settings.difficulty];
    
    // Level 1: quarter speed for easier gameplay
    const levelSpeedMultiplier = game.level === 1 ? 0.25 : (1 + (game.level - 1) * 0.08);
    
    fallingBlocks.push({
        segment: segment,
        position: 0.0,
        speed: 0.004 * levelSpeedMultiplier * diff.blockSpeedMultiplier,
        color: color,
        width: 1.0, // Full segment width
        dead: false
    });
    
    soundManager.playBlockSpawn();
}

function updatePlayer() {
    const now = Date.now();
    
    // Apply control inversion if enabled
    const leftKey = settings.invertControls ? 'ArrowRight' : 'ArrowLeft';
    const rightKey = settings.invertControls ? 'ArrowLeft' : 'ArrowRight';
    
    if (keys[leftKey] && !keys[rightKey]) {
        if (now - lastMoveTime > 100) {
            player.segment = (player.segment - 1 + currentGeometry.segments) % currentGeometry.segments;
            soundManager.playSegmentTone(player.segment, currentGeometry.segments);
            lastMoveTime = now;
        }
    } else if (keys[rightKey] && !keys[leftKey]) {
        if (now - lastMoveTime > 100) {
            player.segment = (player.segment + 1) % currentGeometry.segments;
            soundManager.playSegmentTone(player.segment, currentGeometry.segments);
            lastMoveTime = now;
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Check if bullet is passing through rim blocks (slow it down)
        let speedModifier = 1.0;
        const bulletSeg = Math.floor(bullet.segment);
        const blocksAtSegment = rimBlocks.filter(block => block.segment === bulletSeg);
        
        if (blocksAtSegment.length > 0) {
            // Check each block's position
            blocksAtSegment.forEach(block => {
                const blockThickness = 0.06;
                const blockOuterPos = 1.0 - (block.height * blockThickness);
                const blockInnerPos = blockOuterPos - blockThickness;
                
                // If bullet is within this block's range, slow it down
                if (bullet.position >= blockInnerPos && bullet.position <= blockOuterPos) {
                    speedModifier = 0.3; // Slow down to 30% speed through blocks
                }
            });
        }
        
        bullet.speed = bullet.baseSpeed * speedModifier;
        bullet.position -= bullet.speed;
        
        // Update bullet sound pitch
        soundManager.updateBulletPitch(bullet);
        
        if (bullet.position < 0) {
            soundManager.stopBulletSound(bullet);
            
            // Penalize missed shot if it didn't hit anything
            if (!bullet.hitSomething) {
                game.score = Math.max(0, game.score - 1); // Reduce score by 1 (don't go negative)
                soundManager.playMissedShot();
                updateUI();
            }
            
            bullets.splice(i, 1);
        }
    }
}

function updateEnemies() {
    // Calculate drum beat timing based on enemy count
    const enemyCount = enemies.filter(e => !e.dead).length;
    const baseBeatInterval = 600; // Base: 600ms between beats
    const minBeatInterval = 150;  // Fastest: 150ms (frantic drumming)
    // More enemies = faster drumming
    const beatInterval = Math.max(minBeatInterval, baseBeatInterval - (enemyCount * 40));
    const drumIntensity = Math.min(1.5, 0.5 + (enemyCount * 0.1)); // Volume increases with count
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        if (enemy.dead) {
            enemies.splice(i, 1);
            continue;
        }
        
        // Check if enemy is dying (descending slowly)
        if (enemy.dying) {
            enemy.position -= enemy.deathSpeed;
            // Remove when they fall below the center
            if (enemy.position <= 0) {
                enemies.splice(i, 1);
            }
            continue; // Skip normal movement and sounds
        }
        
        enemy.position += enemy.speed;
        
        // Play drum beat for this enemy as it travels
        const now = Date.now();
        if (now - enemy.lastDrumBeat > beatInterval) {
            soundManager.playEnemyDrum(enemy, drumIntensity);
            enemy.lastDrumBeat = now;
        }
        
        // Pulsating sound for each enemy shape (play occasionally)
        if (!enemy.lastPulseTime) enemy.lastPulseTime = 0;
        if (now - enemy.lastPulseTime > 800) { // Pulse every 800ms
            soundManager.playEnemyPulsate(enemy);
            enemy.lastPulseTime = now;
        }
        
        // Check if enemy reached the rim
        if (enemy.position >= 1.0) {
            // SPIKES reaching the rim = instant game over!
            if (enemy.type.includes('SPIKE')) {
                soundManager.playHit();
                gameOver();
                return;
            }
            
            // Check collision with player (accounting for player bar width)
            const playerCenter = player.segment + 0.5;
            const segmentDist = Math.abs(enemy.segment - playerCenter);
            const wrappedDist = Math.min(segmentDist, currentGeometry.segments - segmentDist);
            
            if (wrappedDist < 0.7) {
                // Player hit by enemy - trigger destruction animation
                destroyPlayer();
                enemies.splice(i, 1);
            } else {
                enemy.position = 1.0; // Enemy stays at rim
            }
        }
    }
}

function updateBlocks() {
    for (let i = fallingBlocks.length - 1; i >= 0; i--) {
        const block = fallingBlocks[i];
        
        if (block.dead) {
            fallingBlocks.splice(i, 1);
            continue;
        }
        
        block.position += block.speed;
        
        // Check if block reached the rim (position >= 1.0)
        if (block.position >= 1.0) {
            // Calculate stack height at this segment
            const segment = Math.floor(block.segment);
            const blocksAtSegment = rimBlocks.filter(b => b.segment === segment);
            const stackHeight = blocksAtSegment.length;
            
            // Add to rim blocks with height
            rimBlocks.push({
                segment: segment,
                color: block.color,
                height: stackHeight
            });
            
            fallingBlocks.splice(i, 1);
            soundManager.playBlockLand();
            checkRimComplete();
            checkBlockOverflow();
        }
    }
}

function updateSpikes() {
    // Update growing/shrinking spikes
    for (let i = spikes.length - 1; i >= 0; i--) {
        const spike = spikes[i];
        
        if (spike.growing) {
            spike.length += 0.01; // Grow gradually
            
            if (spike.length >= spike.targetLength) {
                spike.length = spike.targetLength;
                spike.growing = false;
            }
        } else if (spike.length > spike.targetLength) {
            // Shrink spike if it's longer than target (from being hit)
            spike.length -= 0.02; // Retract gradually when hit
            if (spike.length <= spike.targetLength) {
                spike.length = spike.targetLength;
            }
        }
        
        // Check if player is hit by spike
        if (spike.length > 0.5) {
            const playerCenter = player.segment + 0.5;
            const segmentDist = Math.abs(spike.segment - playerCenter);
            const wrappedDist = Math.min(segmentDist, currentGeometry.segments - segmentDist);
            
            if (wrappedDist < 0.6 && player.position < (spike.length + 0.1)) {
                loseLife();
                // Don't remove spike, it stays deadly
            }
        }
    }
}

function checkCollisions() {
    // Bullet vs Enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (enemy.dead) continue;
            
            // Check if segments are close (within 0.6 to account for width)
            const segmentDist = Math.abs(bullet.segment - enemy.segment);
            const wrappedDist = Math.min(segmentDist, currentGeometry.segments - segmentDist);
            
            if (wrappedDist < 0.6) {
                const dist = Math.abs(bullet.position - enemy.position);
                
                if (dist < 0.05) {
                    // Hit!
                    bullet.hitSomething = true; // Mark that this bullet hit something
                    enemy.health--;
                    
                    if (enemy.health <= 0) {
                        enemy.dying = true; // Mark as dying - will descend slowly
                        enemy.deathSpeed = 0.003; // Slow descent speed
                        game.score += enemy.points;
                        soundManager.playExplosion();
                    } else {
                        // Damaged but not destroyed
                        game.score += Math.floor(enemy.points * 0.2);
                        soundManager.playHit();
                    }
                    
                    soundManager.stopBulletSound(bullet);
                    bullets.splice(i, 1);
                    updateUI();
                    break;
                }
            }
        }
    }
    
    // Bullet vs Falling Block collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = fallingBlocks.length - 1; j >= 0; j--) {
            const block = fallingBlocks[j];
            
            if (block.dead) continue;
            
            // Check if bullet hits block
            const segmentMatch = Math.floor(bullet.segment) === block.segment;
            
            if (segmentMatch) {
                const dist = Math.abs(bullet.position - block.position);
                
                if (dist < 0.08) {
                    // Hit block!
                    bullet.hitSomething = true; // Mark that this bullet hit something
                    block.dead = true;
                    game.score += 50;
                    soundManager.stopBulletSound(bullet);
                    bullets.splice(i, 1);
                    soundManager.playBlockHit();
                    updateUI();
                    break;
                }
            }
        }
    }
    
    // Bullet vs Spike collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = spikes.length - 1; j >= 0; j--) {
            const spike = spikes[j];
            
            // Check if bullet hits spike
            const segmentMatch = Math.floor(bullet.segment) === spike.segment;
            
            if (segmentMatch && bullet.position <= 1.0 && bullet.position >= (1.0 - spike.length)) {
                // Hit spike!
                bullet.hitSomething = true;
                spike.hitCount = (spike.hitCount || 0) + 1;
                
                // Every 10 hits, retract spike by 1 segment's worth
                if (spike.hitCount >= 10) {
                    spike.targetLength = Math.max(0, spike.targetLength - 0.15);
                    spike.length = Math.min(spike.length, spike.targetLength); // Immediately start shrinking
                    spike.hitCount = 0;
                    game.score += 25;
                    soundManager.playHit();
                    
                    // Remove spike if too short
                    if (spike.targetLength <= 0.05) {
                        spikes.splice(j, 1);
                        game.score += 50;
                    }
                }
                
                // Don't remove bullet - let it travel through
                break;
                updateUI();
                break;
            }
        }
    }
}

function checkRimComplete() {
    // Check if all segments have blocks (like completing a Tetris line)
    const segmentCounts = new Array(currentGeometry.segments).fill(0);
    
    rimBlocks.forEach(block => {
        segmentCounts[block.segment]++;
    });
    
    // Check if all segments have at least one block
    const allFilled = segmentCounts.every(count => count > 0);
    
    if (allFilled) {
        // Clear the rim! (Like clearing a Tetris line)
        const bonus = rimBlocks.length * 100;
        game.score += bonus;
        rimBlocks.length = 0;
        soundManager.playRimClear();
        updateUI();
    }
}

function checkBlockOverflow() {
    // Check if any segment has too many blocks stacked (game over condition)
    const segmentCounts = {};
    rimBlocks.forEach(block => {
        segmentCounts[block.segment] = (segmentCounts[block.segment] || 0) + 1;
    });
    
    // If any segment has 5+ blocks, lose a life
    for (let count of Object.values(segmentCounts)) {
        if (count >= 5) {
            loseLife();
            // Clear some blocks to give player breathing room
            rimBlocks.splice(0, Math.floor(rimBlocks.length / 3));
            soundManager.playHit();
            break;
        }
    }
}

function loseLife() {
    game.lives--;
    soundManager.playHit();
    updateUI();
    
    if (game.lives <= 0) {
        gameOver();
    } else {
        // Reset player position
        player.position = 1.0;
        // Clear enemies near player
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (enemies[i].position > 0.8) {
                enemies.splice(i, 1);
            }
        }
    }
}

function gameOver() {
    game.state = 'gameover';
    
    // Stop all bullet sounds to prevent stuck sounds
    bullets.forEach(bullet => {
        soundManager.stopBulletSound(bullet);
    });
    
    // Stop background music
    soundManager.stopBackgroundMusic();
    
    soundManager.playGameOver();
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function nextLevel() {
    game.level++;
    game.zappers++;
    game.enemySpawnRate = Math.max(90, game.enemySpawnRate - 20);
    game.blockSpawnRate = Math.max(50, game.blockSpawnRate - 10);
    
    // Check if player is in danger from enemies/spikes
    checkTransitionSafety();
}

function checkTransitionSafety() {
    // Scan for enemies or spikes near player
    const dangerSegments = [];
    
    // Check enemies
    enemies.forEach(enemy => {
        const segmentDist = Math.abs(enemy.segment - player.segment);
        const wrappedDist = Math.min(segmentDist, currentGeometry.segments - segmentDist);
        if (wrappedDist <= 1 && enemy.position >= 0.7) {
            dangerSegments.push(Math.floor(enemy.segment));
        }
    });
    
    // Check spikes
    spikes.forEach(spike => {
        const segmentDist = Math.abs(spike.segment - player.segment);
        const wrappedDist = Math.min(segmentDist, currentGeometry.segments - segmentDist);
        if (wrappedDist <= 1) {
            dangerSegments.push(spike.segment);
        }
    });
    
    if (dangerSegments.length > 0) {
        game.state = 'transitionwarning';
        game.warningFrame = 0;
        game.dangerSegments = dangerSegments;
    } else {
        startTransitionSequence();
    }
}

function startTransitionSequence() {
    game.state = 'levelcomplete';
    game.transitionStage = 'lightning'; // lightning -> intro -> descent -> ready
    game.transitionFrame = 0;
    animateLevelTransition();
}

function animateLevelTransition() {
    let frame = 0;
    const lightningFrames = 18;   // 3 flashes (300ms total)
    const introFrames = 120;       // 2 seconds
    const descentFrames = 240;     // 4 seconds (middle of 3-5 range)
    const totalFrames = lightningFrames + introFrames + descentFrames;
    
    // Pre-calculate battle scars (10-20 at base of tunnel)
    const battleScars = [];
    const scarCount = Math.floor(Math.random() * 11) + 10; // 10-20
    for (let i = 0; i < scarCount; i++) {
        battleScars.push({
            segment: Math.floor(Math.random() * currentGeometry.segments),
            position: Math.random() * 0.3, // 0.0-0.3 (base 30% of tunnel)
            type: Math.random() < 0.6 ? 'crack' : 'burn',
            angle: Math.random() * Math.PI / 3 + Math.PI / 6, // 30-60 degrees
            size: Math.random() * 0.1 + 0.05
        });
    }
    
    // Spark particles around player
    const sparks = [];
    
    const transitionInterval = setInterval(() => {
        frame++;
        
        // Clear screen
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // STAGE 1: LIGHTNING FLASHES (frames 0-17)
        if (frame <= lightningFrames) {
            // Flash 1: frames 0-1 (2 frames)
            // Flash 2: frames 6-7 (2 frames)
            // Flash 3: frames 12-23 (12 frames with fade)
            if (frame <= 2 || (frame >= 6 && frame <= 7)) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                if (frame === 1 || frame === 6) {
                    soundManager.playLightningFlash();
                }
            } else if (frame >= 12 && frame <= 23) {
                if (frame === 12) {
                    soundManager.playLightningFlash(0.2); // Longer duration for fade
                }
                const fadeProgress = (frame - 12) / 11;
                const alpha = 0.95 * (1 - fadeProgress * fadeProgress); // Ease out
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Draw tunnel during flashes
            drawWeb();
            drawPlayer();
        }
        // STAGE 2: INTRO FANFARE (frames 18-137)
        else if (frame <= lightningFrames + introFrames) {
            if (frame === lightningFrames + 1) {
                soundManager.playTransitionIntro();
                soundManager.duckMusic(true);
            }
            
            const introFrame = frame - lightningFrames;
            const pulse = Math.sin(introFrame / 5) * 0.5 + 0.5;
            
            // Draw pulsing tunnel
            ctx.strokeStyle = `rgba(0, 255, 255, ${pulse * 0.8})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#0ff';
            
            const zoomFactor = 1 + (introFrame / introFrames) * 0.3;
            for (let i = 0; i < currentGeometry.segments; i++) {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const angle = (i / currentGeometry.segments) * Math.PI * 2;
                const radius = 200 * zoomFactor * pulse;
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(
                    centerX + Math.cos(angle) * radius,
                    centerY + Math.sin(angle) * radius
                );
                ctx.stroke();
            }
            
            // Draw level complete text
            ctx.fillStyle = `rgba(0, 255, 255, ${pulse})`;
            ctx.font = 'bold 64px Courier New';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#0ff';
            ctx.fillText('LEVEL ' + (game.level - 1) + ' COMPLETE!', canvas.width / 2, canvas.height / 2 - 50);
            
            ctx.font = 'bold 48px Courier New';
            ctx.fillStyle = `rgba(255, 255, 0, ${pulse})`;
            ctx.shadowColor = '#ff0';
            ctx.fillText('ENTERING LEVEL ' + game.level, canvas.width / 2, canvas.height / 2 + 20);
        }
        // STAGE 3: DESCENT ANIMATION (frames 138-377)
        else if (frame <= totalFrames) {
            const descentFrame = frame - lightningFrames - introFrames;
            const progress = descentFrame / descentFrames;
            const eased = progress * progress * progress; // Ease in cubic for acceleration
            
            // Play whoosh sound periodically
            if (descentFrame % 10 === 0) {
                soundManager.playDescentWhoosh(eased);
            }
            
            // Asymmetric tunnel stretch
            const topStretch = 1 + eased * 2.5;      // 1.0x -> 3.5x
            const bottomStretch = 1 + eased * 1.0;   // 1.0x -> 2.0x
            const sideStretch = 1 + eased * 1.2;     // 1.0x -> 2.2x
            
            // Draw stretched tunnel with battle scars
            ctx.strokeStyle = '#0088ff';
            ctx.lineWidth = 2;
            
            for (let i = 0; i < currentGeometry.segments; i++) {
                const rimPoint = currentGeometry.rimPoints[i];
                const centerPoint = currentGeometry.centerPoints[i];
                
                // Apply asymmetric stretch based on position
                const angle = (i / currentGeometry.segments) * Math.PI * 2;
                const verticalComponent = Math.sin(angle);
                const horizontalComponent = Math.cos(angle);
                
                let stretchFactor = 1.0;
                if (Math.abs(verticalComponent) > Math.abs(horizontalComponent)) {
                    // More vertical - use top/bottom stretch
                    stretchFactor = verticalComponent > 0 ? bottomStretch : topStretch;
                } else {
                    // More horizontal - use side stretch
                    stretchFactor = sideStretch;
                }
                
                const stretchedRimX = centerPoint.x + (rimPoint.x - centerPoint.x) * stretchFactor;
                const stretchedRimY = centerPoint.y + (rimPoint.y - centerPoint.y) * stretchFactor;
                
                // Add vertical shift for falling effect
                const fallShift = eased * 200;
                
                ctx.beginPath();
                ctx.moveTo(centerPoint.x, centerPoint.y + fallShift);
                ctx.lineTo(stretchedRimX, stretchedRimY + fallShift);
                ctx.stroke();
            }
            
            // Draw battle scars
            battleScars.forEach(scar => {
                const scarPos = currentGeometry.getPoint(scar.segment, scar.position);
                
                if (scar.type === 'crack') {
                    // Jagged crack
                    ctx.strokeStyle = '#666';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(scarPos.x, scarPos.y);
                    const crackLength = scar.size * 100;
                    ctx.lineTo(
                        scarPos.x + Math.cos(scar.angle) * crackLength,
                        scarPos.y + Math.sin(scar.angle) * crackLength
                    );
                    ctx.stroke();
                } else {
                    // Burn mark
                    const flickerAlpha = 0.3 + Math.random() * 0.4;
                    const gradient = ctx.createRadialGradient(scarPos.x, scarPos.y, 0, scarPos.x, scarPos.y, scar.size * 50);
                    gradient.addColorStop(0, `rgba(60, 30, 0, ${flickerAlpha})`);
                    gradient.addColorStop(1, 'rgba(60, 30, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(scarPos.x, scarPos.y, scar.size * 50, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            
            // Spawn sparks around player during middle of descent
            if (descentFrame >= 60 && descentFrame <= 200 && Math.random() < 0.3) {
                const playerRim = currentGeometry.getPoint(player.segment + 0.5, 1.0);
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 2;
                
                sparks.push({
                    x: playerRim.x,
                    y: playerRim.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 30,
                    maxLife: 30,
                    color: Math.random() < 0.5 ? '#ffffff' : '#ffff00'
                });
            }
            
            // Update and draw sparks
            for (let i = sparks.length - 1; i >= 0; i--) {
                const spark = sparks[i];
                spark.x += spark.vx;
                spark.y += spark.vy;
                spark.life--;
                
                if (spark.life <= 0) {
                    sparks.splice(i, 1);
                    continue;
                }
                
                const alpha = spark.life / spark.maxLife;
                
                // Draw trail
                ctx.fillStyle = spark.color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(spark.x, spark.y, 3, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.globalAlpha = alpha * 0.5;
                ctx.beginPath();
                ctx.arc(spark.x - spark.vx, spark.y - spark.vy, 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.globalAlpha = alpha * 0.2;
                ctx.beginPath();
                ctx.arc(spark.x - spark.vx * 2, spark.y - spark.vy * 2, 1, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.globalAlpha = 1.0;
            }
            
            // Draw player descending on their segment
            const playerRim = currentGeometry.getPoint(player.segment, 1.0);
            const playerNextRim = currentGeometry.getPoint(player.segment + 1, 1.0);
            
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 10;
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#00ff00';
            ctx.beginPath();
            ctx.moveTo(playerRim.x, playerRim.y + eased * 200);
            ctx.lineTo(playerNextRim.x, playerNextRim.y + eased * 200);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        if (frame >= totalFrames) {
            clearInterval(transitionInterval);
            finishLevelTransition();
        }
    }, 1000 / 60);
}

function finishLevelTransition() {
    currentGeometry = new LevelGeometry(levelShapes[(game.level - 1) % levelShapes.length]);
    
    bullets.length = 0;
    soundManager.stopAllBulletSounds();
    enemies.length = 0;
    fallingBlocks.length = 0;
    rimBlocks.length = 0;
    spikes.length = 0;
    game.enemySpawnTimer = 0;
    game.blockSpawnTimer = 0;
    
    updateUI();
    soundManager.duckMusic(false);
    
    // Enter 'levelready' state - wait for player input
    game.state = 'levelready';
}

// Player destruction system
const playerFragments = [];

function destroyPlayer() {
    game.state = 'playerdying';
    game.dyingFrame = 0;
    
    // Create 12 fragments radiating from player
    const playerRim = currentGeometry.getPoint(player.segment + 0.5, 1.0);
    
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const speed = Math.random() * 3 + 2;
        
        playerFragments.push({
            x: playerRim.x,
            y: playerRim.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            life: 80,
            maxLife: 80,
            size: 8
        });
    }
    
    soundManager.playPlayerExplosion();
    soundManager.duckMusic(true);
}

function updatePlayerFragments() {
    for (let i = playerFragments.length - 1; i >= 0; i--) {
        const frag = playerFragments[i];
        frag.x += frag.vx;
        frag.y += frag.vy;
        frag.rotation += frag.rotationSpeed;
        frag.life--;
        
        if (frag.life <= 0) {
            playerFragments.splice(i, 1);
        }
    }
}

function drawPlayerFragments() {
    playerFragments.forEach(frag => {
        const alpha = frag.life / frag.maxLife;
        
        ctx.save();
        ctx.translate(frag.x, frag.y);
        ctx.rotate(frag.rotation);
        ctx.fillStyle = player.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(-frag.size / 2, -frag.size / 2, frag.size, frag.size);
        ctx.globalAlpha = 1.0;
        ctx.restore();
    });
}

function updateUI() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('level').textContent = game.level;
    document.getElementById('lives').textContent = game.lives;
}

function drawWeb() {
    ctx.strokeStyle = '#0088ff';
    ctx.lineWidth = 2;
    
    // Draw radial lines
    for (let i = 0; i < currentGeometry.segments; i++) {
        const rimPoint = currentGeometry.rimPoints[i];
        const centerPoint = currentGeometry.centerPoints[i];
        
        ctx.beginPath();
        ctx.moveTo(centerPoint.x, centerPoint.y);
        ctx.lineTo(rimPoint.x, rimPoint.y);
        ctx.stroke();
    }
    
    // Draw wider center hole (tunnel entrance)
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#0088ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const holeRadius = currentGeometry.tunnelHoleRadius || 50;
    ctx.arc(canvas.width / 2, canvas.height / 2, holeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw inner glow for tunnel effect
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, 
                                               canvas.width / 2, canvas.height / 2, holeRadius + 20);
    gradient.addColorStop(0, 'rgba(0, 136, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 136, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, holeRadius + 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw concentric rings
    const rings = 10;
    for (let ring = 0; ring <= rings; ring++) {
        const t = ring / rings;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0088ff';
        ctx.beginPath();
        
        for (let i = 0; i <= currentGeometry.segments; i++) {
            const point = currentGeometry.getPoint(i % currentGeometry.segments, t);
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        
        ctx.stroke();
    }
}

function drawSpikes() {
    // Draw deadly spikes growing from center
    spikes.forEach(spike => {
        if (spike.length <= 0) return;
        
        const segment = spike.segment;
        
        // Get positions along the spike's segment
        const startPos = currentGeometry.getPoint(segment + 0.5, 0); // Center of segment
        const endPos = currentGeometry.getPoint(segment + 0.5, spike.length);
        
        // Draw thick red spike line
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 8;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0000';
        ctx.globalAlpha = 0.8;
        
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
        
        // Draw bright core
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
        
        // Draw spike tip (triangle)
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff0000';
        
        // Calculate perpendicular offset for triangle
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / length * 8;
        const perpY = dx / length * 8;
        
        // Further extend for tip point
        const tipExtend = 15;
        const tipX = endPos.x + (dx / length) * tipExtend;
        const tipY = endPos.y + (dy / length) * tipExtend;
        
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(endPos.x + perpX, endPos.y + perpY);
        ctx.lineTo(endPos.x - perpX, endPos.y - perpY);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    });
}

function drawPlayer() {
    const rimPos = currentGeometry.getPoint(player.segment, player.position);
    const nextRimPos = currentGeometry.getPoint((player.segment + 1) % currentGeometry.segments, player.position);
    const centerPos = currentGeometry.getPoint(player.segment, 0);
    const nextCenterPos = currentGeometry.getPoint((player.segment + 1) % currentGeometry.segments, 0);
    
    // Draw pulsing glow effect
    const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.7;
    
    // Fill the entire segment wedge to show player position clearly
    ctx.fillStyle = player.color;
    ctx.globalAlpha = 0.25 * pulse;
    ctx.beginPath();
    ctx.moveTo(centerPos.x, centerPos.y);
    ctx.lineTo(rimPos.x, rimPos.y);
    ctx.lineTo(nextRimPos.x, nextRimPos.y);
    ctx.lineTo(nextCenterPos.x, nextCenterPos.y);
    ctx.closePath();
    ctx.fill();
    
    // Draw outer glow on rim
    ctx.strokeStyle = '#00ff00';  // Bright green
    ctx.lineWidth = 20;
    ctx.globalAlpha = 0.5 * pulse;
    ctx.shadowBlur = 50;
    ctx.shadowColor = '#00ff00';
    
    ctx.beginPath();
    ctx.moveTo(rimPos.x, rimPos.y);
    ctx.lineTo(nextRimPos.x, nextRimPos.y);
    ctx.stroke();
    
    // Draw middle glow
    ctx.lineWidth = 10;
    ctx.globalAlpha = 0.6 * pulse;
    ctx.shadowBlur = 25;
    
    ctx.beginPath();
    ctx.moveTo(rimPos.x, rimPos.y);
    ctx.lineTo(nextRimPos.x, nextRimPos.y);
    ctx.stroke();
    
    // Draw main rim bar (BRIGHT GREEN - very visible)
    ctx.strokeStyle = '#00ff00';  // Bright green for the outer edge
    ctx.lineWidth = 12;
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#00ff00';
    
    ctx.beginPath();
    ctx.moveTo(rimPos.x, rimPos.y);
    ctx.lineTo(nextRimPos.x, nextRimPos.y);
    ctx.stroke();
    
    // Draw inner core (yellow highlight)
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 5;
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    
    ctx.beginPath();
    ctx.moveTo(rimPos.x, rimPos.y);
    ctx.lineTo(nextRimPos.x, nextRimPos.y);
    ctx.stroke();
    
    // Draw direction indicator (center dot)
    const centerX = (rimPos.x + nextRimPos.x) / 2;
    const centerY = (rimPos.y + nextRimPos.y) / 2;
    
    // Draw bright markers at rim endpoints for visibility on all sides
    ctx.fillStyle = '#00ff00';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ff00';
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(rimPos.x, rimPos.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(nextRimPos.x, nextRimPos.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 25;
    ctx.shadowColor = player.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
}

function drawHUD() {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    
    // Draw score (top left)
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 32px Courier New';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffff00';
    ctx.fillText(game.score.toString().padStart(6, '0'), 30, 45);
    
    // Draw lives as ship icons (below score)
    for (let i = 0; i < game.lives; i++) {
        const x = 40 + (i * 40);
        const y = 80;
        
        ctx.strokeStyle = '#ffff00';
        ctx.fillStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffff00';
        
        // Draw simplified ship icon (triangle/claw shape)
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x - 8, y + 8);
        ctx.lineTo(x - 3, y + 3);
        ctx.lineTo(x, y + 10);
        ctx.lineTo(x + 3, y + 3);
        ctx.lineTo(x + 8, y + 8);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw level (top center)
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 28px Courier New';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.fillText('LEVEL ' + game.level, canvas.width / 2, 45);
    
    // Check if there are any Spikes on screen - show warning
    const hasSpikes = enemies.some(e => e.type.includes('SPIKE'));
    if (hasSpikes && game.level >= 3) {
        const blink = Math.floor(Date.now() / 400) % 2;
        if (blink) {
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 36px Courier New';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
            ctx.fillText('AVOID SPIKES', canvas.width / 2, canvas.height - 40);
        }
    }
    
    // Draw zappers count (top right)
    if (game.zappers > 0) {
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 24px Courier New';
        ctx.textAlign = 'right';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00ff';
        ctx.fillText('ZAPPERS: ' + game.zappers, canvas.width - 30, 45);
    }
    
    ctx.shadowBlur = 0;
}

function drawBullets() {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff00';
    
    bullets.forEach(bullet => {
        const pos = currentGeometry.getPoint(bullet.segment, bullet.position);
        const nextPos = currentGeometry.getPoint(bullet.segment, Math.max(0, bullet.position - 0.03));
        
        // Change color if bullet is slowed by rim blocks
        if (bullet.speed < bullet.baseSpeed * 0.5) {
            ctx.strokeStyle = '#ffff00';
            ctx.shadowColor = '#ffff00';
        } else {
            ctx.strokeStyle = '#00ff00';
            ctx.shadowColor = '#00ff00';
        }
        
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(nextPos.x, nextPos.y);
        ctx.stroke();
    });
    
    ctx.shadowBlur = 0;
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.dead) return;
        
        const pos = currentGeometry.getPoint(enemy.segment, enemy.position);
        
        ctx.fillStyle = enemy.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.color;
        
        // Update rotation for rotating cubes
        if (enemy.shape === 'rotatingcube') {
            enemy.rotation = (enemy.rotation + 0.05) % (Math.PI * 2);
        }
        
        // Draw different shapes randomly assigned
        switch (enemy.shape) {
            case 'square':
                ctx.fillRect(pos.x - 10, pos.y - 10, 20, 20);
                break;
            
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y - 10);
                ctx.lineTo(pos.x + 8, pos.y + 8);
                ctx.lineTo(pos.x - 8, pos.y + 8);
                ctx.closePath();
                ctx.fill();
                break;
            
            case 'octagon':
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                    const x = pos.x + Math.cos(angle) * 10;
                    const y = pos.y + Math.sin(angle) * 10;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                break;
            
            case 'pentagon':
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                    const x = pos.x + Math.cos(angle) * 10;
                    const y = pos.y + Math.sin(angle) * 10;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                break;
            
            case 'rotatingcube':
                // 3D rotating cube effect
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(enemy.rotation);
                
                // Front face
                ctx.fillStyle = enemy.color;
                ctx.fillRect(-10, -10, 20, 20);
                
                // Top face (lighter)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.moveTo(-10, -10);
                ctx.lineTo(-5, -15);
                ctx.lineTo(15, -15);
                ctx.lineTo(10, -10);
                ctx.closePath();
                ctx.fill();
                
                // Right face (darker)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.beginPath();
                ctx.moveTo(10, -10);
                ctx.lineTo(15, -15);
                ctx.lineTo(15, 5);
                ctx.lineTo(10, 10);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
                break;
        }
        
        // Draw health bar for enemies with multiple health
        if (enemy.maxHealth > 1) {
            const barWidth = 20;
            const barHeight = 3;
            const healthPercent = enemy.health / enemy.maxHealth;
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.fillRect(pos.x - barWidth / 2, pos.y - 18, barWidth, barHeight);
            
            ctx.fillStyle = healthPercent > 0.6 ? '#0f0' : (healthPercent > 0.3 ? '#ff0' : '#f00');
            ctx.fillRect(pos.x - barWidth / 2, pos.y - 18, barWidth * healthPercent, barHeight);
        }
    });
    
    ctx.shadowBlur = 0;
}

function drawBlocks() {
    // Draw falling blocks (Tetris style!)
    fallingBlocks.forEach(block => {
        if (block.dead) return;
        
        const seg = block.segment;
        const pos1 = currentGeometry.getPoint(seg, block.position);
        const pos2 = currentGeometry.getPoint(seg + block.width, block.position);
        const pos3 = currentGeometry.getPoint(seg + block.width, Math.max(0, block.position - 0.05));
        const pos4 = currentGeometry.getPoint(seg, Math.max(0, block.position - 0.05));
        
        ctx.fillStyle = block.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = block.color;
        
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.lineTo(pos3.x, pos3.y);
        ctx.lineTo(pos4.x, pos4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    
    // Draw rim blocks (landed blocks) - stacked at the rim
    rimBlocks.forEach(block => {
        const seg = block.segment;
        const stackHeight = block.height;
        const blockThickness = 0.06; // How much each block extends inward
        
        // Calculate positions - blocks stack inward from rim
        const outerPos = 1.0 - (stackHeight * blockThickness);
        const innerPos = outerPos - blockThickness;
        
        const pos1 = currentGeometry.getPoint(seg, outerPos);
        const pos2 = currentGeometry.getPoint(seg + 1, outerPos);
        const pos3 = currentGeometry.getPoint(seg + 1, innerPos);
        const pos4 = currentGeometry.getPoint(seg, innerPos);
        
        ctx.fillStyle = block.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = block.color;
        
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.lineTo(pos3.x, pos3.y);
        ctx.lineTo(pos4.x, pos4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    
    ctx.shadowBlur = 0;
}

function update() {
    // Handle transition warning state
    if (game.state === 'transitionwarning') {
        game.warningFrame = game.warningFrame || 0;
        game.warningFrame++;
        
        // Allow player movement during warning
        updatePlayer();
        
        // After 2 seconds (120 frames), start transition
        if (game.warningFrame >= 120) {
            startTransitionSequence();
        }
        return;
    }
    
    // Handle player dying state
    if (game.state === 'playerdying') {
        game.dyingFrame++;
        updatePlayerFragments();
        
        if (game.dyingFrame >= 80) {
            playerFragments.length = 0;
            loseLife();
            if (game.lives <= 0) {
                gameOver();
            } else {
                game.state = 'playing';
                soundManager.duckMusic(false);
            }
        }
        return;
    }
    
    // Handle level ready state (waiting for input)
    if (game.state === 'levelready') {
        // Player can move but game doesn't advance
        return;
    }
    
    if (game.state !== 'playing' || game.paused) return;
    
    game.frameCount++;
    game.enemySpawnTimer++;
    game.blockSpawnTimer++;
    
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateBlocks();
    updateSpikes();
    checkCollisions();
    
    // Rapid fire when holding space
    if (keys[' ']) {
        const now = Date.now();
        if (now - lastFireTime >= fireDelay) {
            shootBullet();
            lastFireTime = now;
        }
    }
    
    // Spawn enemies
    if (game.enemySpawnTimer > game.enemySpawnRate) {
        spawnEnemy();
        game.enemySpawnTimer = 0;
    }
    
    // Spawn blocks (Tetris style!)
    if (game.blockSpawnTimer > game.blockSpawnRate) {
        spawnBlock();
        game.blockSpawnTimer = 0;
    }
    
    // Check level complete (no enemies or blocks left after certain time)
    if (game.frameCount > 600 && enemies.length === 0 && fallingBlocks.length === 0 && 
        rimBlocks.length === 0 && game.enemySpawnTimer > 200) {
        nextLevel();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw transition warning state
    if (game.state === 'transitionwarning') {
        drawSpikes();
        drawWeb();
        drawBlocks();
        drawEnemies();
        drawBullets();
        drawPlayer();
        drawHUD();
        
        // Flash dangerous segments in red
        const pulse = Math.sin(game.warningFrame / 7.5) * 0.5 + 0.5; // 4Hz pulsing
        const alpha = 0.3 + pulse * 0.7; // 0.3 to 1.0
        
        game.dangerSegments.forEach(seg => {
            const rimPos = currentGeometry.getPoint(seg, 1.0);
            const nextRimPos = currentGeometry.getPoint(seg + 1, 1.0);
            const centerPos = currentGeometry.getPoint(seg, 0);
            const nextCenterPos = currentGeometry.getPoint(seg + 1, 0);
            
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(centerPos.x, centerPos.y);
            ctx.lineTo(rimPos.x, rimPos.y);
            ctx.lineTo(nextRimPos.x, nextRimPos.y);
            ctx.lineTo(nextCenterPos.x, nextCenterPos.y);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.lineWidth = 8;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(rimPos.x, rimPos.y);
            ctx.lineTo(nextRimPos.x, nextRimPos.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        });
        
        // Warning text
        ctx.fillStyle = `rgba(255, 255, 0, ${pulse})`;
        ctx.font = 'bold 48px Courier New';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0';
        ctx.fillText('! DANGER ! MOVE NOW !', canvas.width / 2, 100);
        ctx.shadowBlur = 0;
        
        return;
    }
    
    // Draw player dying state
    if (game.state === 'playerdying') {
        drawSpikes();
        drawWeb();
        drawBlocks();
        drawEnemies();
        drawBullets();
        drawPlayerFragments();
        drawHUD();
        return;
    }
    
    // Draw level ready state
    if (game.state === 'levelready') {
        drawSpikes();
        drawWeb();
        drawPlayer();
        drawHUD();
        
        const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.font = 'bold 48px Courier New';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fff';
        ctx.fillText('PRESS FIRE TO START', canvas.width / 2, canvas.height / 2);
        ctx.shadowBlur = 0;
        return;
    }
    
    if (game.state === 'playing') {
        drawSpikes();
        drawWeb();
        drawBlocks();
        drawEnemies();
        drawBullets();
        drawPlayer();
        drawHUD();
        
        if (game.paused) {
            ctx.fillStyle = '#0ff';
            ctx.font = '48px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();

# TEMPEST × TETRIS
## The Ultimate Arcade Fusion

A modern recreation of the classic 1981 TEMPEST arcade game, blended with TETRIS mechanics for an exciting new experience!

![Game Version](https://img.shields.io/badge/version-1.0.0-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎮 About

**TEMPEST × TETRIS** combines the vector graphics tunnel shooter gameplay of Atari's TEMPEST with the block-stacking mechanics of TETRIS. Navigate a geometric tunnel, shoot enemies and falling blocks, and survive increasingly difficult levels!

### Total Lines of Code: **2,103**
- `tempest.js` - 1,390 lines (Main game engine)
- `sounds.js` - 391 lines (Web Audio API sound system)
- `styles.css` - 240 lines (Retro arcade styling)
- `index.html` - 82 lines (Game structure)

---

## ✨ Features

### Classic TEMPEST Gameplay
- **Vector Graphics** - Authentic wire-frame 3D tunnel rendering
- **8 Geometric Levels** - Circle, Square, Star, Hexagon, Octagon, Figure-8, and more
- **Multiple Enemy Types** - Random geometric shapes (squares, triangles, octagons, pentagons, rotating cubes)
- **Deadly SPIKES** - Red spikes grow from the center when rotating cubes appear!
- **Super Zapper** - Clear all enemies, blocks, and spikes with one button

### TETRIS-Inspired Mechanics
- **Falling Blocks** - Tetris pieces drop toward the rim
- **Line Clearing** - Complete all rim segments to clear blocks
- **Block Stacking** - Blocks stack at the rim, slowing your bullets
- **Strategic Depth** - Manage blocks while fighting enemies

### Game Features
- **Progressive Difficulty** - 4 difficulty settings (Easy to Insane)
- **Shape-Based Health System** - Different shapes require 1-5 hits
- **Adaptive Drum Beats** - Low-pitched drums for each shape, faster with more enemies!
- **Rapid Fire** - Hold spacebar for continuous shooting
- **Retro Sound Effects** - Authentic arcade audio using Web Audio API
- **Pulsating Enemy Sounds** - Each enemy shape has unique sound patterns
- **Accuracy Scoring** - Missed shots cost 1 point each!
- **Settings Menu** - Adjustable difficulty and volume
- **Level Transitions** - Animated morphing tunnel effects

---

## 🎯 Controls

| Key | Action |
|-----|--------|
| **← →** | Move around the rim |
| **SPACE** | Fire (Hold for rapid fire) |
| **Z** | Super Zapper |
| **ENTER** | Start / Restart game |
| **P** | Pause game |
| **ESC** | Quit to menu |

---

## 🚀 Quick Start

### Option 1: Direct Open
```bash
# Simply open index.html in your browser
start index.html
```

### Option 2: Using Python Server
```bash
# Start a local server
make serve
# or manually:
python -m http.server 8000
# Then open: http://localhost:8000
```

### Option 3: Using Node.js
```bash
make serve-node
# or manually:
npx http-server -p 8080
```

---

## 🎮 Gameplay Guide

### Enemy Types

**All enemies have random shapes and colors, but shapes determine difficulty!**

| Shape | Drum Sound | Hits Required | Speed | Difficulty |
|-------|------------|---------------|-------|------------|
| **Square** | Deep kick (60Hz) | 1 hit | 100% | Easy |
| **Triangle** | Punchy tom (80Hz) | 2 hits | 85% | Medium |
| **Octagon** | Floor tom (50Hz) | 3 hits | 70% | Hard |
| **Pentagon** | Mid tom (90Hz) | 4 hits | 60% | Very Hard |
| **Rotating Cube** | Bass boom (40Hz) | 5 hits | 50% | Extreme |

**SPIKE Enemies:** Get BONUS health on top of shape health!
- SPIKE_WEAK: +2 health
- SPIKE_MEDIUM: +3 health
- SPIKE_STRONG: +4 health
- SPIKE_BOSS: +6 health

Example: A Pentagon SPIKE_BOSS = 4 (shape) + 6 (boss bonus) = **10 hits to kill!**

**All enemies have random shapes and colors!**

### SPIKES - The Deadliest Threat!

- **Red spikes grow from the center** when rotating cube enemies spawn
- Touch a spike = **instant death!**
- Spikes continue growing longer with each rotating cube
- Can only be cleared with Super Zapper (Z key)
- **Warning message displays when SPIKE enemies appear**

### Difficulty Levels

- **EASY** - 5 lives, slow spawns, gentle speed
- **MEDIUM** - 3 lives, moderate spawns, 1.3× speed
- **HARD** - 3 lives, fast spawns, 1.6× speed
- **INSANE** - 2 lives, chaos mode, 2× speed!

### Tips & Strategy

1. **Watch for Rotating Cubes** - They spawn deadly SPIKES!
2. **Listen to the Drums** - Faster drumming = more enemies approaching!
3. **Target Weak Shapes First** - Squares (1 hit) before Cubes (5 hits)
4. **Avoid the Center** - SPIKES grow from the center and kill instantly
5. **Use Zapper Wisely** - It's the only way to clear spikes
6. **Aim Carefully** - Every missed shot costs 1 point!
7. **Don't Spam Fire** - Holding spacebar wastes bullets and reduces score
8. **Manage Rim Blocks** - They slow your bullets, shoot them early
9. **Complete Rims** - Fill all segments to clear for big bonuses
10. **Listen to Enemies** - Each shape has unique drum and pulse sounds
11. **SPIKE enemies** - Have EXTRA health on top of shape health!
12. **Pentagon + SPIKE_BOSS** - Up to 10 hits needed - avoid or focus fire!

---

## 🛠️ Technical Details

### Technologies Used
- **HTML5 Canvas** - For rendering vector graphics
- **Vanilla JavaScript** - No frameworks, pure ES6
- **Web Audio API** - Real-time procedural sound generation
- **CSS3** - Retro neon styling with glow effects
- **LocalStorage** - Persistent settings

### Game Architecture
```
├── index.html          # Game structure & UI
├── styles.css          # Retro arcade styling
├── sounds.js           # Web Audio API sound manager
├── tempest.js          # Main game engine
│   ├── Level Geometry System
│   ├── Enemy AI & Spawning
│   ├── Collision Detection
│   ├── Player Controls
│   ├── Bullet Physics
│   ├── Block Mechanics
│   └── Rendering Engine
├── Makefile            # Build commands
└── README.md           # This file
```

### Key Algorithms
- **Geometric Tunnel Generation** - Parametric shapes (circle, star, figure-8)
- **Fractional Segment Positioning** - Smooth centering for bullets/enemies
- **Health-Based Combat** - Multi-hit enemies with visual feedback
- **Block Stacking System** - Height-based rim block management
- **Bullet Speed Modulation** - Dynamic slowdown through obstacles
- **Shape-Based Sound Synthesis** - Unique pulsating frequencies per enemy
- **Accuracy Scoring System** - Penalty for missed shots (-1 per miss)

---

## 📊 Performance

- **60 FPS** - Smooth canvas rendering
- **Multiple Simultaneous Sounds** - Each bullet has its own oscillator
- **Efficient Collision Detection** - Optimized for many entities
- **Responsive Controls** - 100ms debouncing for precise movement

---

## 🎨 Credits

**Original TEMPEST** - Atari (1981)
- Designed by Dave Theurer
- Vector graphics pioneer

**TETRIS** - Alexey Pajitnov (1984)
- Block-stacking mechanics inspiration

**This Remake** - Created with ❤️ as a tribute to arcade classics

---

## 📝 License

MIT License - Feel free to modify and share!

---

## 🐛 Known Issues

- High-pitched sounds may occasionally stick (press ESC to clear)
- Performance may vary on older browsers
- Mobile touch controls not yet implemented

---

## 🎯 Future Enhancements

- [ ] Mobile touch controls
- [ ] High score persistence
- [ ] Online leaderboards
- [ ] Power-ups (speed boost, shield, multi-shot)
- [ ] More level geometries
- [ ] Boss battles
- [ ] Two-player mode

---

## 🤝 Contributing

Found a bug? Have an idea? Feel free to:
1. Report issues
2. Suggest features
3. Submit pull requests

---

## 🎮 Enjoy the Game!

**Press ENTER to start your journey down the tunnel!**

*"The only way out is through the center..."*

---

**Made with 💙 for retro arcade fans everywhere**

/**
 * Penguin B & D Antarctic Adventure
 * Built with HTML5 Canvas & Web Audio API
 */

// --- Audio Synthesizer (Web Audio API) ---
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBellySlide() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Swoosh noise + glide oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playSplash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Low frequency thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // White noise splash burst
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.3);
  }

  playCorrectChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }

  playRoundComplete() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const arpeggio = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    arpeggio.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      gain.gain.setValueAtTime(0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
  }
}

// --- Main Game Class ---
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.sfx = new SoundEffects();

    // Game state
    this.round = 1;
    this.score = 0;
    this.penguinsInRound = 10;
    this.currentPenguinIndex = 0;
    this.baseSpeed = 1.6;
    this.speedMultiplier = 1.0;

    this.activePenguin = null;
    this.particles = [];
    this.snowflakes = [];

    this.isRoundOver = false;

    // Canvas size setup
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Input listeners
    this.setupInputs();

    // Initialize environment & start game
    this.initSnowflakes();
    this.startNewRound();

    // Start render loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    this.canvas.width = wrapper.clientWidth;
    this.canvas.height = wrapper.clientHeight;

    // Water edge is set at 82% of width
    this.iceWidth = this.canvas.width * 0.82;
    this.groundY = this.canvas.height * 0.68;
  }

  initSnowflakes() {
    this.snowflakes = [];
    for (let i = 0; i < 40; i++) {
      this.snowflakes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2.5 + 1,
        speedY: Math.random() * 0.8 + 0.3,
        speedX: Math.random() * 0.5 - 0.25
      });
    }
  }

  startNewRound() {
    this.score = 0;
    this.currentPenguinIndex = 0;
    this.isRoundOver = false;
    this.speedMultiplier = 1.0 + (this.round - 1) * 0.25;

    this.updateHUD();
    document.getElementById('modal-overlay').classList.add('hidden');

    this.spawnNextPenguin();
  }

  spawnNextPenguin() {
    if (this.currentPenguinIndex >= this.penguinsInRound) {
      this.handleRoundComplete();
      return;
    }

    // Pick random letter ('b' or 'd')
    const letter = Math.random() < 0.5 ? 'b' : 'd';
    const speed = (this.baseSpeed * this.speedMultiplier) + (Math.random() * 0.3);

    this.activePenguin = {
      x: -60,
      y: this.groundY,
      letter: letter,
      state: 'WALKING', // WALKING, SLIDING, FALLING, DONE
      vx: speed,
      vy: 0,
      rotation: 0,
      waddlePhase: Math.random() * Math.PI * 2,
      slideTimer: 0,
      fallTimer: 0,
      badgeColor: letter === 'b' ? '#d81b60' : '#1e88e5'
    };

    this.currentPenguinIndex++;
    this.updateHUD();
  }

  setupInputs() {
    // Keyboard controls (B and D)
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        this.handlePlayerAction('b');
        this.triggerButtonVisual('btn-b');
      } else if (key === 'd') {
        this.handlePlayerAction('d');
        this.triggerButtonVisual('btn-d');
      }
    });

    // Touch / Click controls
    const btnB = document.getElementById('btn-b');
    const btnD = document.getElementById('btn-d');

    btnB.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.sfx.init();
      this.handlePlayerAction('b');
    });

    btnD.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.sfx.init();
      this.handlePlayerAction('d');
    });

    // Mute button
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.addEventListener('click', () => {
      this.sfx.init();
      this.sfx.isMuted = !this.sfx.isMuted;
      document.getElementById('mute-icon').textContent = this.sfx.isMuted ? '🔇' : '🔊';
    });

    // Next Round modal button
    document.getElementById('next-round-btn').addEventListener('click', () => {
      this.round++;
      this.startNewRound();
    });
  }

  triggerButtonVisual(btnId) {
    const btn = document.getElementById(btnId);
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 150);
  }

  handlePlayerAction(pressedLetter) {
    if (!this.activePenguin || this.activePenguin.state !== 'WALKING') return;

    if (pressedLetter === this.activePenguin.letter) {
      // CORRECT! Slide on belly
      this.activePenguin.state = 'SLIDING';
      this.activePenguin.vx = 8 * this.speedMultiplier; // Slide fast across ice!
      this.score++;
      this.updateHUD();

      this.sfx.playCorrectChime();
      this.sfx.playBellySlide();

      // Create ice slide sparkles
      this.createSlideParticles(this.activePenguin.x, this.activePenguin.y);
    } else {
      // INCORRECT! Splash into water
      this.triggerSplash();
    }
  }

  triggerSplash() {
    if (!this.activePenguin || this.activePenguin.state === 'FALLING') return;

    this.activePenguin.state = 'FALLING';
    this.activePenguin.vx = 1.5;
    this.activePenguin.vy = -6; // Initial hop up before splash down

    this.sfx.playSplash();
  }

  updateHUD() {
    document.getElementById('round-display').textContent = this.round;
    document.getElementById('score-display').textContent = `${this.score} / ${this.penguinsInRound}`;
    document.getElementById('speed-display').textContent = `${this.speedMultiplier.toFixed(1)}x`;
  }

  handleRoundComplete() {
    this.isRoundOver = true;
    this.sfx.playRoundComplete();

    const starsContainer = document.getElementById('star-rating');
    const feedbackText = document.getElementById('modal-feedback-text');
    const scoreText = document.getElementById('modal-score-text');

    scoreText.innerHTML = `You scored <strong>${this.score} / ${this.penguinsInRound}</strong>!`;

    if (this.score === 10) {
      starsContainer.textContent = '⭐⭐⭐';
      feedbackText.textContent = 'PERFECT! You are a master of b and d!';
    } else if (this.score >= 7) {
      starsContainer.textContent = '⭐⭐';
      feedbackText.textContent = 'Awesome job! Super fast penguin belly sliding!';
    } else {
      starsContainer.textContent = '⭐';
      feedbackText.textContent = 'Good try! Keep practicing b vs d to get more belly slides!';
    }

    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  createSlideParticles(x, y) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x + Math.random() * 20 - 10,
        y: y + 10,
        vx: -Math.random() * 4 - 2,
        vy: -Math.random() * 2,
        radius: Math.random() * 3 + 1,
        color: '#e0f7fa',
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.02
      });
    }
  }

  createWaterSplashParticles(x, y) {
    for (let i = 0; i < 25; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 3,
        radius: Math.random() * 4 + 2,
        color: Math.random() < 0.5 ? '#81d4fa' : '#ffffff',
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.015
      });
    }
  }

  // --- Main Logic & Physics Update ---
  update(dt) {
    // Update Snowflakes
    this.snowflakes.forEach(s => {
      s.y += s.speedY;
      s.x += s.speedX;
      if (s.y > this.canvas.height) s.y = -5;
      if (s.x > this.canvas.width) s.x = 0;
      if (s.x < 0) s.x = this.canvas.width;
    });

    // Update Active Penguin
    const p = this.activePenguin;
    if (p) {
      if (p.state === 'WALKING') {
        p.x += p.vx;
        p.waddlePhase += 0.15 * this.speedMultiplier;

        // If penguin reaches water edge without action, it falls in!
        if (p.x >= this.iceWidth - 20) {
          this.triggerSplash();
        }
      } else if (p.state === 'SLIDING') {
        p.x += p.vx;
        this.createSlideParticles(p.x, p.y);

        // Off screen right -> spawn next
        if (p.x > this.canvas.width + 60) {
          this.activePenguin = null;
          setTimeout(() => this.spawnNextPenguin(), 300);
        }
      } else if (p.state === 'FALLING') {
        p.x += p.vx;
        p.vy += 0.4; // Gravity
        p.y += p.vy;
        p.rotation += 0.08;

        // Hit ocean water level
        const waterY = this.groundY + 40;
        if (p.y >= waterY && p.fallTimer === 0) {
          p.fallTimer = 1;
          this.createWaterSplashParticles(p.x, waterY);
        }

        // Sunk beneath water -> spawn next
        if (p.y > this.canvas.height + 80) {
          this.activePenguin = null;
          setTimeout(() => this.spawnNextPenguin(), 400);
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Canvas Rendering ---
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawSkyAndMountains();
    this.drawIceAndWater();
    this.drawSnowflakes();

    if (this.activePenguin) {
      this.drawPenguin(this.activePenguin);
    }

    this.drawParticles();
  }

  drawSkyAndMountains() {
    // Sky Gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#81d4fa');
    skyGrad.addColorStop(0.7, '#b2ebf2');
    skyGrad.addColorStop(1, '#e0f7fa');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.groundY);

    // Soft Icebergs in background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.beginPath();
    this.ctx.moveTo(40, this.groundY);
    this.ctx.lineTo(120, this.groundY - 90);
    this.ctx.lineTo(220, this.groundY);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(224, 247, 250, 0.85)';
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width * 0.4, this.groundY);
    this.ctx.lineTo(this.canvas.width * 0.55, this.groundY - 130);
    this.ctx.lineTo(this.canvas.width * 0.7, this.groundY);
    this.ctx.fill();
  }

  drawIceAndWater() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const iceX = this.iceWidth;
    const gY = this.groundY;

    // Ocean Water (Right portion)
    const waterGrad = this.ctx.createLinearGradient(iceX, gY, w, h);
    waterGrad.addColorStop(0, '#0288d1');
    waterGrad.addColorStop(1, '#01579b');
    this.ctx.fillStyle = waterGrad;
    this.ctx.fillRect(iceX - 20, gY + 30, w - iceX + 40, h - gY);

    // Ocean Water Waves Surface
    this.ctx.fillStyle = '#4fc3f7';
    this.ctx.beginPath();
    this.ctx.arc(iceX + 30, gY + 35, 25, 0, Math.PI * 2);
    this.ctx.arc(iceX + 90, gY + 35, 30, 0, Math.PI * 2);
    this.ctx.arc(iceX + 160, gY + 35, 25, 0, Math.PI * 2);
    this.ctx.fill();

    // Snowy Ice Shelf (Left portion)
    const iceGrad = this.ctx.createLinearGradient(0, gY, 0, h);
    iceGrad.addColorStop(0, '#ffffff');
    iceGrad.addColorStop(0.2, '#e0f7fa');
    iceGrad.addColorStop(1, '#80deea');
    this.ctx.fillStyle = iceGrad;

    this.ctx.beginPath();
    this.ctx.moveTo(0, gY - 10);
    this.ctx.lineTo(iceX, gY - 10);
    this.ctx.quadraticCurveTo(iceX + 15, gY + 20, iceX - 10, gY + 60);
    this.ctx.lineTo(0, h);
    this.ctx.closePath();
    this.ctx.fill();

    // Ice shelf edge highlight line
    this.ctx.strokeStyle = '#b2ebf2';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  drawSnowflakes() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.snowflakes.forEach(s => {
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawPenguin(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);

    if (p.state === 'WALKING') {
      // Waddling sway animation
      const waddleAngle = Math.sin(p.waddlePhase) * 0.12;
      const bobY = Math.abs(Math.cos(p.waddlePhase)) * 4;
      this.ctx.translate(0, -bobY);
      this.ctx.rotate(waddleAngle);
      this.drawPenguinSprite(p, false);
    } else if (p.state === 'SLIDING') {
      // Belly sliding animation (rotated 80 degrees onto belly!)
      this.ctx.translate(0, 18);
      this.ctx.rotate(Math.PI * 0.42);
      this.drawPenguinSprite(p, true);
    } else if (p.state === 'FALLING') {
      this.ctx.rotate(p.rotation);
      this.drawPenguinSprite(p, false);
    }

    this.ctx.restore();
  }

  drawPenguinSprite(p, isSliding) {
    const ctx = this.ctx;

    // Shadow on ice
    if (!isSliding && p.state !== 'FALLING') {
      ctx.fillStyle = 'rgba(1, 87, 155, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 24, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Feet (Orange)
    if (!isSliding) {
      ctx.fillStyle = '#ff9800';
      // Left Foot
      ctx.beginPath();
      ctx.ellipse(-10, 22, 8, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Right Foot
      ctx.beginPath();
      ctx.ellipse(10, 22, 8, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body (Black / Dark Blue)
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.ellipse(0, -6, 24, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly (Clean White)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -4, 17, 23, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flippers / Arms
    ctx.fillStyle = '#263238';
    // Left Flipper
    ctx.beginPath();
    ctx.ellipse(-23, -6, 6, 16, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Right Flipper
    ctx.beginPath();
    ctx.ellipse(23, -6, 6, 16, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-7, -22, 3.5, 0, Math.PI * 2);
    ctx.arc(7, -22, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights (sparkle)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -23, 1.2, 0, Math.PI * 2);
    ctx.arc(6, -23, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Beak (Bright Orange Triangle)
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-6, -13);
    ctx.lineTo(6, -13);
    ctx.closePath();
    ctx.fill();

    // --- CHEST LETTER BADGE ('b' vs 'd') ---
    // High-contrast badge centered on penguin's belly
    ctx.save();
    
    if (isSliding) {
      // Un-rotate badge slightly when sliding so letter is readable
      ctx.rotate(-Math.PI * 0.42);
      ctx.translate(0, -10);
    }

    // Badge Background Circle
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = p.badgeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chest Letter Text ('b' or 'd')
    ctx.fillStyle = p.badgeColor;
    ctx.font = '700 24px "Comic Neue", "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.letter, 0, 3);

    ctx.restore();
  }

  drawParticles() {
    this.particles.forEach(pt => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, pt.alpha);
      this.ctx.fillStyle = pt.color;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  loop(timestamp) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.penguinGame = new Game();
});

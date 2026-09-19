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

  ensureContextActive() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBellySlide() {
    if (this.isMuted) return;
    this.ensureContextActive();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
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
    this.ensureContextActive();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
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
    this.ensureContextActive();
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
    this.ensureContextActive();
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
    this.spawnedCount = 0;
    this.baseSpeed = 1.4;
    this.speedMultiplier = 1.0;

    // Game mode state
    this.gameMode = 'VISUAL'; // 'VISUAL' or 'SPOKEN_NAME'
    this.lastSpokenPenguinId = null;

    // Multi-penguin parade queue state
    this.penguins = [];
    this.maxVisibleWalking = 3;
    this.paradeSpacing = 220;

    this.particles = [];
    this.snowflakes = [];
    this.isRoundOver = false;
    this.isGameStarted = false;

    // Canvas size setup
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Input listeners
    this.setupInputs();

    // Initialize environment snowflakes
    this.initSnowflakes();

    // Start render loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  speakLetter(letter) {
    if (this.sfx.isMuted) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      let phrase = '';
      if (this.gameMode === 'SPOKEN_NAME') {
        phrase = letter.toUpperCase(); // Speaks "B" or "D"
      }
      if (phrase) {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 0.85; // Clear pace for kids
        utterance.pitch = 1.1;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    }
  }

  repeatCurrentAudio() {
    const lead = this.getLeadPenguin();
    if (lead && lead.state === 'WALKING' && this.gameMode !== 'VISUAL') {
      this.speakLetter(lead.letter);
    }
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
    this.spawnedCount = 0;
    this.penguins = [];
    this.lastSpokenPenguinId = null;
    this.isRoundOver = false;
    this.speedMultiplier = 1.0 + (this.round - 1) * 0.25;

    // Prompt banner update according to game mode
    const promptText = document.getElementById('prompt-text');
    const repeatBtn = document.getElementById('repeat-audio-btn');

    if (this.gameMode === 'VISUAL') {
      promptText.innerHTML = `Look at the penguin's chest! Press <span class="key-badge">B</span> or <span class="key-badge">D</span>`;
      if (repeatBtn) repeatBtn.classList.add('hidden');
    } else {
      promptText.innerHTML = `Listen to the letter sound! Press <span class="key-badge">B</span> or <span class="key-badge">D</span>`;
      if (repeatBtn) repeatBtn.classList.remove('hidden');
    }

    this.updateHUD();
    document.getElementById('modal-overlay').classList.add('hidden');

    this.refillParade();
  }

  refillParade() {
    const walkingCount = this.penguins.filter(p => p.state === 'WALKING').length;
    let needed = this.maxVisibleWalking - walkingCount;

    while (needed > 0 && this.spawnedCount < this.penguinsInRound) {
      this.spawnPenguinInParade();
      needed--;
    }
  }

  spawnPenguinInParade() {
    if (this.spawnedCount >= this.penguinsInRound) return;

    const letter = Math.random() < 0.5 ? 'b' : 'd';
    const speed = this.baseSpeed * this.speedMultiplier;

    // Calculate spawn position trailing behind the last walking penguin
    const walking = this.penguins.filter(p => p.state === 'WALKING');
    let startX = -140;
    if (walking.length > 0) {
      const lastWalking = walking[walking.length - 1];
      startX = Math.min(-140, lastWalking.x - this.paradeSpacing);
    }

    const penguin = {
      id: Math.random(),
      x: startX,
      y: this.groundY - 40,
      letter: letter,
      state: 'WALKING', // WALKING, SLIDING, FALLING
      vx: speed,
      vy: 0,
      rotation: 0,
      waddlePhase: Math.random() * Math.PI * 2,
      fallTimer: 0,
      badgeColor: letter === 'b' ? '#d81b60' : '#1e88e5'
    };

    this.penguins.push(penguin);
    this.spawnedCount++;
  }

  getLeadPenguin() {
    // Lead penguin is the front-most walking penguin (highest X position)
    const walking = this.penguins.filter(p => p.state === 'WALKING');
    if (walking.length === 0) return null;
    return walking.reduce((prev, curr) => (curr.x > prev.x ? curr : prev));
  }

  setupInputs() {
    // Unlock Web Audio API immediately on ANY initial user gesture anywhere on page
    const unlockAudio = () => {
      this.sfx.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // Mode cards selection on Start Screen
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.gameMode = card.getAttribute('data-mode') || 'VISUAL';
      });
    });

    // Repeat Audio Button click
    const repeatBtn = document.getElementById('repeat-audio-btn');
    if (repeatBtn) {
      repeatBtn.addEventListener('click', () => {
        this.sfx.init();
        this.repeatCurrentAudio();
      });
    }

    // Keyboard controls (B, D, and Space for audio repeat)
    window.addEventListener('keydown', (e) => {
      this.sfx.ensureContextActive();

      if (e.code === 'Space' || e.key === ' ') {
        if (this.gameMode !== 'VISUAL') {
          e.preventDefault();
          this.repeatCurrentAudio();
        }
        return;
      }

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

    // Start Game modal button
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.sfx.init();
        this.isGameStarted = true;
        document.getElementById('start-modal-overlay').classList.add('hidden');
        this.startNewRound();
      });
    }

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
    const lead = this.getLeadPenguin();
    if (!lead || lead.state !== 'WALKING') return;

    if (pressedLetter === lead.letter) {
      // CORRECT! Slide lead penguin on belly
      lead.state = 'SLIDING';
      lead.vx = 9 * this.speedMultiplier;
      this.score++;
      this.updateHUD();

      this.sfx.playCorrectChime();
      this.sfx.playBellySlide();
      this.createSlideParticles(lead.x, lead.y);
    } else {
      // INCORRECT! Splash lead penguin into water
      this.triggerSplash(lead);
    }

    this.refillParade();
  }

  triggerSplash(targetPenguin) {
    const lead = targetPenguin || this.getLeadPenguin();
    if (!lead || lead.state === 'FALLING') return;

    lead.state = 'FALLING';
    lead.vx = 1.5;
    lead.vy = -6; // Initial hop before splash down

    this.sfx.playSplash();
    this.refillParade();
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
      feedbackText.textContent = 'Awesome job! Super fast parade belly sliding!';
    } else {
      starsContainer.textContent = '⭐';
      feedbackText.textContent = 'Good try! Keep practicing b vs d!';
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

    if (!this.isGameStarted) return;

    const lead = this.getLeadPenguin();

    // Trigger audio speech when a new lead penguin steps up in audio modes
    if (lead && lead.state === 'WALKING') {
      if (this.gameMode !== 'VISUAL' && this.lastSpokenPenguinId !== lead.id) {
        this.lastSpokenPenguinId = lead.id;
        this.speakLetter(lead.letter);
      }
    }

    // Update All Penguins in Scene
    for (let i = this.penguins.length - 1; i >= 0; i--) {
      const p = this.penguins[i];

      if (p.state === 'WALKING') {
        p.x += p.vx;
        p.waddlePhase += 0.15 * this.speedMultiplier;

        // If lead penguin reaches water edge without action, it falls in!
        if (p === lead && p.x >= this.iceWidth - 55) {
          this.triggerSplash(p);
        }
      } else if (p.state === 'SLIDING') {
        p.x += p.vx;
        this.createSlideParticles(p.x, p.y);

        // Remove penguin off-screen right
        if (p.x > this.canvas.width + 180) {
          this.penguins.splice(i, 1);
        }
      } else if (p.state === 'FALLING') {
        p.x += p.vx;
        p.vy += 0.4; // Gravity
        p.y += p.vy;
        p.rotation += 0.08;

        const waterY = this.groundY + 40;
        if (p.y >= waterY && p.fallTimer === 0) {
          p.fallTimer = 1;
          this.createWaterSplashParticles(p.x, waterY);
        }

        // Remove penguin sunk beneath water
        if (p.y > this.canvas.height + 80) {
          this.penguins.splice(i, 1);
        }
      }
    }

    // Continuously ensure parade line is refilled
    this.refillParade();

    // Check if round complete
    if (this.spawnedCount >= this.penguinsInRound && this.penguins.length === 0 && !this.isRoundOver) {
      this.handleRoundComplete();
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

    // Render penguins back to front (so front lead penguin draws on top)
    const sortedPenguins = [...this.penguins].sort((a, b) => a.x - b.x);
    sortedPenguins.forEach(p => this.drawPenguin(p));

    this.drawParticles();
  }

  drawSkyAndMountains() {
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#81d4fa');
    skyGrad.addColorStop(0.7, '#b2ebf2');
    skyGrad.addColorStop(1, '#e0f7fa');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.groundY);

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

    const waterGrad = this.ctx.createLinearGradient(iceX, gY, w, h);
    waterGrad.addColorStop(0, '#0288d1');
    waterGrad.addColorStop(1, '#01579b');
    this.ctx.fillStyle = waterGrad;
    this.ctx.fillRect(iceX - 20, gY + 30, w - iceX + 40, h - gY);

    this.ctx.fillStyle = '#4fc3f7';
    this.ctx.beginPath();
    this.ctx.arc(iceX + 30, gY + 35, 25, 0, Math.PI * 2);
    this.ctx.arc(iceX + 90, gY + 35, 30, 0, Math.PI * 2);
    this.ctx.arc(iceX + 160, gY + 35, 25, 0, Math.PI * 2);
    this.ctx.fill();

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
    this.ctx.scale(3.0, 3.0); // 3x scaled penguins (another 50% bigger!)

    if (p.state === 'WALKING') {
      const waddleAngle = Math.sin(p.waddlePhase) * 0.12;
      const bobY = Math.abs(Math.cos(p.waddlePhase)) * 4;
      this.ctx.translate(0, -bobY);
      this.ctx.rotate(waddleAngle);
      this.drawPenguinSprite(p, false);
    } else if (p.state === 'SLIDING') {
      this.ctx.translate(0, 10);
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

    if (!isSliding && p.state !== 'FALLING') {
      ctx.fillStyle = 'rgba(1, 87, 155, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 24, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!isSliding) {
      ctx.fillStyle = '#ff9800';
      ctx.beginPath();
      ctx.ellipse(-10, 22, 8, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(10, 22, 8, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.ellipse(0, -6, 24, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -4, 17, 23, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.ellipse(-23, -6, 6, 16, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(23, -6, 6, 16, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-7, -22, 3.5, 0, Math.PI * 2);
    ctx.arc(7, -22, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -23, 1.2, 0, Math.PI * 2);
    ctx.arc(6, -23, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-6, -13);
    ctx.lineTo(6, -13);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    
    if (isSliding) {
      ctx.rotate(-Math.PI * 0.42);
      ctx.translate(0, -10);
    }

    const isMystery = this.gameMode !== 'VISUAL' && p.state === 'WALKING';
    const strokeColor = isMystery ? '#263238' : p.badgeColor;
    const textColor = isMystery ? '#263238' : p.badgeColor;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '700 24px "Comic Neue", "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isMystery) {
      ctx.fillText('❓', 0, 3);
    } else {
      ctx.fillText(p.letter, 0, 3);
    }

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

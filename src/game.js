import { 
  STATE_START, STATE_RUNNING, STATE_PAUSED, STATE_NO_HAND, STATE_GAME_OVER, 
  STATE_COUNTDOWN, STATE_DYING,
  WIDTH, HEIGHT, DEBUG_MODE, LIVES_COUNT, WAVE_DELAY_MIN, WAVE_DELAY_MAX, 
  COMBO_TIME_WINDOW, BOMB_SPAWN_CHANCE, PINCH_HOLD_DURATION, SLASH_RADIUS_FORGIVENESS,
  BURST_DELAY_MIN, BURST_DELAY_MAX
} from './config.js';
import { Fruit, FruitHalf } from './entities.js';
import { lineIntersectsCircle } from './utils.js';

export class GameManager {
  constructor(ui) {
    this.ui = ui; 
    this.state = null;
    this.score = 0;
    this.lives = LIVES_COUNT;
    this.mode = 'classic';
    
    this.fruits = [];
    this.fruitHalves = [];
    
    this.spawnTimer = 0;
    this.waveQueue = []; 
    
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboTexts = [];
    
    this.pinchHoldTimer = 0;
    this.pinchCooldown = 0;

    this.countdownTimer = 0;
    this.deathTimer = 0;
    this.highScore = parseInt(localStorage.getItem('fruitninja_high_score') || '0', 10);
  }

  reset() {
    this.score = 0;
    this.lives = LIVES_COUNT;
    this.fruits = [];
    this.fruitHalves = [];
    this.waveQueue = [];
    this.spawnTimer = WAVE_DELAY_MAX;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboTexts = [];
    this.pinchHoldTimer = 0;
    this.countdownTimer = 0;
    this.deathTimer = 0;
    this.highScore = parseInt(localStorage.getItem('fruitninja_high_score') || '0', 10);
    this.ui.updateScore(this.score);
    this.ui.updateLives(this.lives, this.mode);
  }

  updateHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('fruitninja_high_score', this.highScore.toString());
    }
  }

  startGame() {
    this.state = STATE_RUNNING;
    this.ui.hideOverlay();
    this.ui.updateLives(this.lives, this.mode);
  }

  resumeFromPause() {
    if (this.state === STATE_PAUSED) {
      this.state = STATE_COUNTDOWN;
      this.countdownTimer = 60; // 1 second
      this.ui.hideOverlay();
      this.pinchHoldTimer = 0;
      this.pinchCooldown = 30;
    }
  }

  goToMainMenu() {
    this.state = STATE_START;
    this.fruits = [];
    this.fruitHalves = [];
    this.waveQueue = [];
    this.score = 0;
    this.lives = LIVES_COUNT;
    this.ui.resumeVideo();
    this.ui.showOverlay("FRUIT NINJA AR", "Touch some fruits", "START GAME");
  }

  update(bladeSegment, handDetected, isPinching, indexPos, thumbPos) {
    this.indexPos = indexPos;
    this.thumbPos = thumbPos;
    this.isPinching = isPinching;

    if (this.pinchCooldown > 0) this.pinchCooldown--;

    if (this.state === null) return;

    // Handle dying sequence
    if (this.state === STATE_DYING) {
      this.deathTimer--;
      if (this.deathTimer <= 0) {
        this.ui.resumeVideo();
        this.triggerGameOver();
      }
      return;
    }

    // Handle countdown sequence
    if (this.state === STATE_COUNTDOWN) {
      this.countdownTimer--;
      if (this.countdownTimer <= 0) {
        this.state = STATE_RUNNING;
      }
      return;
    }

    if (isPinching && this.pinchCooldown === 0) {
      if (this.state === STATE_START || this.state === STATE_GAME_OVER) {
        this.reset();
        this.startGame();
        this.pinchCooldown = 30; 
      } else if (this.state === STATE_PAUSED) {
        this.pinchHoldTimer++;
        if (this.pinchHoldTimer > PINCH_HOLD_DURATION) { 
          this.resumeFromPause();
        }
      } else if (this.state === STATE_RUNNING) {
        this.pinchHoldTimer++;
        if (this.pinchHoldTimer > PINCH_HOLD_DURATION) {
          this.state = STATE_PAUSED;
          this.ui.showOverlay("PAUSED", "PINCH TO RESUME", null);
          this.pinchHoldTimer = 0;
          this.pinchCooldown = 30;
        }
      }
    } else {
      this.pinchHoldTimer = 0;
    }

    if (!handDetected && this.state === STATE_RUNNING) {
      this.state = STATE_NO_HAND;
      this.ui.showOverlay("NO HAND DETECTED", "Show your hand to resume", null);
    } else if (handDetected && this.state === STATE_NO_HAND) {
      this.state = STATE_COUNTDOWN;
      this.countdownTimer = 60; // 1-second countdown upon hand detection reacquired
      this.ui.hideOverlay();
    }

    if (this.state !== STATE_RUNNING) return;

    for (let i = this.waveQueue.length - 1; i >= 0; i--) {
      this.waveQueue[i].timer--;
      if (this.waveQueue[i].timer <= 0) {
        const item = this.waveQueue.splice(i, 1)[0];
        this.fruits.push(new Fruit(item.x, item.isBomb));
      }
    }

    if (this.spawnTimer > 0) {
      this.spawnTimer--;
    } else {
      this._scheduleWave();
      this.spawnTimer = WAVE_DELAY_MIN + Math.random() * (WAVE_DELAY_MAX - WAVE_DELAY_MIN);
    }

    for (const f of this.fruits) {
      f.update();
      if (f.y > HEIGHT + f.radius && !f.isBomb && f.active) {
        if (!DEBUG_MODE && this.mode !== 'zen') {
          this.lives--;
          this.ui.updateLives(this.lives, this.mode);
          if (this.lives <= 0) {
            this.ui.resumeVideo();
            this.triggerGameOver();
            this.fruits = [];
            this.fruitHalves = [];
          }
        }
        f.active = false;
      }
    }
    
    for (const h of this.fruitHalves) {
      h.update();
    }
    
    if (this.comboTimer > 0) {
      this.comboTimer--;
    } else {
      if (this.comboCount >= 3) {
        this.comboTexts.push({
          text: `COMBO x${this.comboCount}`,
          timer: 60,
          pos: { x: WIDTH / 2, y: 100 }
        });
        this.score += this.comboCount - 2;
        this.ui.updateScore(this.score);
      }
      this.comboCount = 0;
    }
    
    this.comboTexts.forEach(ct => ct.timer--);
    this.comboTexts = this.comboTexts.filter(ct => ct.timer > 0);
 
    this.fruits = this.fruits.filter(f => f.active);
    this.fruitHalves = this.fruitHalves.filter(h => h.active);
 
    if (bladeSegment && !isPinching) { 
      const [p1, p2] = bladeSegment;
      for (const f of this.fruits) {
        const hitRadius = f.radius * SLASH_RADIUS_FORGIVENESS;
        if (lineIntersectsCircle(p1, p2, {x: f.x, y: f.y}, hitRadius)) {
          f.active = false;
          if (f.isBomb) {
            if (!DEBUG_MODE && this.mode !== 'zen') {
              this.triggerBombExplosion();
            }
          } else {
            this.score++;
            this.ui.updateScore(this.score);
            this.fruitHalves.push(new FruitHalf(f.x, f.y, f.vy, f.color, f.type, true));
            this.fruitHalves.push(new FruitHalf(f.x, f.y, f.vy, f.color, f.type, false));
            this.comboCount++;
            this.comboTimer = COMBO_TIME_WINDOW;
          }
        }
      }
    }
  }
 
  triggerBombExplosion() {
    this.state = STATE_DYING;
    this.deathTimer = 120; // 2 seconds death pause on bomb hit
    this.fruits = [];
    this.fruitHalves = [];
    this.ui.triggerBombFlash();
  }
 
  _scheduleWave() {
    const r = Math.random();
    const count = r < 0.45 ? 1 : (r < 0.82 ? 2 : 3); // Spawns up to 3 fruits max (removed the 4-fruit chaos to scale to 60% difficulty)
    let currentDelay = 0;
    for (let i = 0; i < count; i++) {
      const x = WIDTH * 0.15 + Math.random() * (WIDTH * 0.7);
      const isBomb = this.mode === 'zen' ? false : (Math.random() < BOMB_SPAWN_CHANCE);
      this.waveQueue.push({ timer: currentDelay, x, isBomb });
      currentDelay += BURST_DELAY_MIN + Math.random() * (BURST_DELAY_MAX - BURST_DELAY_MIN);
    }
  }
 
  triggerGameOver() {
    this.state = STATE_GAME_OVER;
    this.updateHighScore();
    this.ui.showOverlay("GAME OVER", `Final Score: ${this.score}`, null);
  }
 
  draw(ctx) {
    for (const f of this.fruits) {
      f.draw(ctx);
    }
    for (const h of this.fruitHalves) {
      h.draw(ctx);
    }
    for (const ct of this.comboTexts) {
      ctx.fillStyle = 'yellow';
      ctx.font = 'bold 36px "Gang of Three"';
      ctx.textAlign = 'center';
      ctx.fillText(ct.text, ct.pos.x, ct.pos.y);
    }

    if (this.state === STATE_COUNTDOWN) {
      ctx.save();
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 120px "Gang of Three"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const count = Math.ceil(this.countdownTimer / 20);
      ctx.fillText(count.toString(), WIDTH / 2, HEIGHT / 2);
      ctx.restore();
    }
    
    if (this.isPinching && this.indexPos && this.thumbPos) {
      const cx = (this.indexPos.x + this.thumbPos.x) / 2;
      const cy = (this.indexPos.y + this.thumbPos.y) / 2;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const r = 15 + (this.pinchHoldTimer / PINCH_HOLD_DURATION) * 10;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

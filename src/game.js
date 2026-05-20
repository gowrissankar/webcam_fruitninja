import { 
  STATE_START, STATE_RUNNING, STATE_PAUSED, STATE_NO_HAND, STATE_GAME_OVER, 
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
    
    this.fruits = [];
    this.fruitHalves = [];
    
    this.spawnTimer = 0;
    this.waveQueue = []; 
    
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboTexts = [];
    
    this.pinchHoldTimer = 0;
    this.pinchCooldown = 0;
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
    this.ui.updateScore(this.score);
    this.ui.updateLives(this.lives);
  }

  startGame() {
    this.state = STATE_RUNNING;
    this.ui.hideOverlay();
  }

  update(bladeSegment, handDetected, isPinching, indexPos, thumbPos) {
    this.indexPos = indexPos;
    this.thumbPos = thumbPos;
    this.isPinching = isPinching;

    if (this.pinchCooldown > 0) this.pinchCooldown--;

    if (this.state === null) return;

    if (isPinching && this.pinchCooldown === 0) {
      if (this.state === STATE_START || this.state === STATE_GAME_OVER) {
        this.reset();
        this.startGame();
        this.pinchCooldown = 30; 
      } else if (this.state === STATE_PAUSED) {
        this.pinchHoldTimer++;
        if (this.pinchHoldTimer > PINCH_HOLD_DURATION) { 
          this.state = STATE_RUNNING;
          this.ui.hideOverlay();
          this.pinchHoldTimer = 0;
          this.pinchCooldown = 30;
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
      this.state = STATE_RUNNING;
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
      if (f.y > HEIGHT + 50 && !f.isBomb && f.active) {
        if (!DEBUG_MODE) {
          this.lives--;
          this.ui.updateLives(this.lives);
          if (this.lives <= 0) {
            this.triggerGameOver();
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
            if (!DEBUG_MODE) this.triggerGameOver();
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

  _scheduleWave() {
    const r = Math.random();
    const count = r < 0.5 ? 1 : (r < 0.8 ? 2 : 3);
    let currentDelay = 0;
    for (let i = 0; i < count; i++) {
      const x = WIDTH * 0.15 + Math.random() * (WIDTH * 0.7);
      const isBomb = Math.random() < BOMB_SPAWN_CHANCE;
      this.waveQueue.push({ timer: currentDelay, x, isBomb });
      currentDelay += BURST_DELAY_MIN + Math.random() * (BURST_DELAY_MAX - BURST_DELAY_MIN);
    }
  }

  triggerGameOver() {
    this.state = STATE_GAME_OVER;
    this.ui.showOverlay("GAME OVER", `Final Score: ${this.score} - PINCH TO RESTART`, null);
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
      ctx.font = 'bold 36px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(ct.text, ct.pos.x, ct.pos.y);
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

import { 
  GRAVITY, INITIAL_Y_VELOCITY_MIN, INITIAL_Y_VELOCITY_MAX, 
  HORIZONTAL_DRIFT_RANGE, HEIGHT, FRUIT_SIZE, HALF_HORIZONTAL_SPLIT_SPEED, BOMB_SPAWN_CHANCE 
} from './config.js';
import { drawHalfCircle } from './utils.js';

const COLORS = ['#ff3232', '#32ff32', '#ffff32']; 
const BOMB_COLOR = '#000000';

export class Fruit {
  constructor(x, isBomb = false) {
    this.x = x;
    this.y = HEIGHT + FRUIT_SIZE * 2; 
    this.vx = (Math.random() - 0.5) * 2 * HORIZONTAL_DRIFT_RANGE; 
    this.vy = INITIAL_Y_VELOCITY_MIN + Math.random() * (INITIAL_Y_VELOCITY_MAX - INITIAL_Y_VELOCITY_MIN);
    this.radius = FRUIT_SIZE;
    this.isBomb = isBomb;
    this.active = true;
    
    this.color = this.isBomb ? BOMB_COLOR : COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    
    if (this.y > HEIGHT + FRUIT_SIZE * 4) this.active = false;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    if (this.isBomb) {
      ctx.fillStyle = '#ff3232';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 20, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class FruitHalf {
  constructor(x, y, vy, color, isLeft) {
    this.x = x;
    this.y = y;
    this.vy = vy;
    this.isLeft = isLeft;
    this.vx = isLeft ? -HALF_HORIZONTAL_SPLIT_SPEED : HALF_HORIZONTAL_SPLIT_SPEED;
    this.radius = FRUIT_SIZE;
    this.color = color;
    this.active = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    if (this.y > HEIGHT + FRUIT_SIZE * 4) this.active = false;
  }

  draw(ctx) {
    drawHalfCircle(ctx, this.color, this.x, this.y, this.radius, this.isLeft);
  }
}

import { 
  GRAVITY, INITIAL_Y_VELOCITY_MIN, INITIAL_Y_VELOCITY_MAX, 
  HORIZONTAL_DRIFT_RANGE, HEIGHT, FRUIT_SIZE, HALF_HORIZONTAL_SPLIT_SPEED 
} from './config.js';
import { drawHalfCircle } from './utils.js';

const FRUIT_TYPES = [
  { name: 'apple', color: '#ff3b30' },
  { name: 'orange', color: '#ff9500' },
  { name: 'banana', color: '#ffcc00' },
  { name: 'watermelon', color: '#4cd964' }
];

const BOMB_COLOR = '#1c1c1e';

// Image loading cache
const imageCache = {};

function loadImage(key, src) {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    imageCache[key] = img;
  };
  img.onerror = () => {
    console.warn(`Failed to preload asset: ${src}. Graceful vector fallback will be active.`);
  };
}

// Preload fruit assets
loadImage('bomb', '/assets/fruits/bomb.png');
FRUIT_TYPES.forEach(fruit => {
  loadImage(fruit.name, `/assets/fruits/${fruit.name}.png`);
  loadImage(`${fruit.name}_left`, `/assets/fruits/${fruit.name}_left.png`);
  loadImage(`${fruit.name}_right`, `/assets/fruits/${fruit.name}_right.png`);
});

export class Fruit {
  constructor(x, isBomb = false) {
    this.x = x;
    this.y = HEIGHT + FRUIT_SIZE * 2; 
    this.vx = (Math.random() - 0.5) * 2 * HORIZONTAL_DRIFT_RANGE; 
    this.vy = INITIAL_Y_VELOCITY_MIN + Math.random() * (INITIAL_Y_VELOCITY_MAX - INITIAL_Y_VELOCITY_MIN);
    this.radius = FRUIT_SIZE;
    this.isBomb = isBomb;
    this.active = true;
    
    if (this.isBomb) {
      this.type = 'bomb';
      this.color = BOMB_COLOR;
    } else {
      const choice = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      this.type = choice.name;
      this.color = choice.color;
    }
    
    // Mid-air rotation physics
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.08;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    this.angle += this.rotationSpeed;
    
    if (this.y > HEIGHT + FRUIT_SIZE * 4) this.active = false;
  }

  draw(ctx) {
    const img = imageCache[this.type];
    
    // If the image is loaded and is not an empty/blank placeholder (width > 1)
    if (img && img.complete && img.naturalWidth > 1) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();
    } else {
      // Graceful high-quality vector fallbacks
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw details to look premium even as vectors
      if (this.isBomb) {
        // Draw standard bomb wick
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y - 18, 8, Math.PI, Math.PI * 1.6);
        ctx.stroke();
        
        // Draw spark sparkler
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y - 28, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Add a slice gleam highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(this.x - 6, this.y - 6, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export class FruitHalf {
  constructor(x, y, vy, color, type, isLeft) {
    this.x = x;
    this.y = y;
    this.vy = vy;
    this.isLeft = isLeft;
    this.vx = isLeft ? -HALF_HORIZONTAL_SPLIT_SPEED : HALF_HORIZONTAL_SPLIT_SPEED;
    this.radius = FRUIT_SIZE;
    this.color = color;
    this.type = type;
    this.active = true;
    
    // Splitting fruits spin outwards rapidly
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (isLeft ? -1 : 1) * (0.08 + Math.random() * 0.08);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    this.angle += this.rotationSpeed;
    if (this.y > HEIGHT + FRUIT_SIZE * 4) this.active = false;
  }

  draw(ctx) {
    const key = `${this.type}_${this.isLeft ? 'left' : 'right'}`;
    const img = imageCache[key];
    
    if (img && img.complete && img.naturalWidth > 1) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();
    } else {
      drawHalfCircle(ctx, this.color, this.x, this.y, this.radius, this.isLeft);
    }
  }
}

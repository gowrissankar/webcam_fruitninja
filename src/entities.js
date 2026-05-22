import { 
  GRAVITY, INITIAL_Y_VELOCITY_MIN, INITIAL_Y_VELOCITY_MAX, 
  HORIZONTAL_DRIFT_RANGE, HEIGHT, WIDTH, FRUIT_SIZE, HALF_HORIZONTAL_SPLIT_SPEED 
} from './config.js';
import { drawHalfCircle } from './utils.js';

const FRUIT_TYPES = [
  { name: 'apple', color: '#ff3b30', symmetric: true },
  { name: 'orange', color: '#ff9500', symmetric: true },
  { name: 'banana', color: '#ffcc00', symmetric: false },
  { name: 'watermelon', color: '#4cd964', symmetric: true }
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
  if (fruit.symmetric) {
    loadImage(`${fruit.name}_half`, `/assets/fruits/${fruit.name}_half.png`);
  } else {
    loadImage(`${fruit.name}_left`, `/assets/fruits/${fruit.name}_left.png`);
    loadImage(`${fruit.name}_right`, `/assets/fruits/${fruit.name}_right.png`);
  }
});

export class Fruit {
  constructor(x, isBomb = false) {
    this.x = x;
    this.radius = FRUIT_SIZE;
    this.y = HEIGHT + this.radius * 2; 
    
    // Inward trajectory sweep: left spawns move right, right spawns move left
    const minDrift = 0.5;
    const drift = minDrift + Math.random() * (HORIZONTAL_DRIFT_RANGE - minDrift);
    this.vx = this.x < WIDTH / 2 ? drift : -drift;
    
    this.vy = INITIAL_Y_VELOCITY_MIN + Math.random() * (INITIAL_Y_VELOCITY_MAX - INITIAL_Y_VELOCITY_MIN);
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
    
    // Mid-air rotation physics: slowed down significantly to look realistic and graceful
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.035;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    this.angle += this.rotationSpeed;
    
    if (this.y > HEIGHT + this.radius * 4) this.active = false;
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
        ctx.lineWidth = Math.max(1.5, this.radius * 0.1);
        ctx.beginPath();
        ctx.arc(this.x + this.radius * 0.27, this.y - this.radius * 0.6, this.radius * 0.27, Math.PI, Math.PI * 1.6);
        ctx.stroke();
        
        // Draw spark sparkler
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(this.x + this.radius * 0.33, this.y - this.radius * 0.93, this.radius * 0.13, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Add a slice gleam highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.2, this.y - this.radius * 0.2, this.radius * 0.4, 0, Math.PI * 2);
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
    if (this.y > HEIGHT + this.radius * 4) this.active = false;
  }

  draw(ctx) {
    const fruitConfig = FRUIT_TYPES.find(f => f.name === this.type);
    const isSymmetric = fruitConfig ? fruitConfig.symmetric : false;
    
    let img;
    let flipHorizontal = false;
    
    if (isSymmetric) {
      img = imageCache[`${this.type}_half`];
      if (!this.isLeft) {
        flipHorizontal = true;
      }
    } else {
      const key = `${this.type}_${this.isLeft ? 'left' : 'right'}`;
      img = imageCache[key];
    }
    
    if (img && img.complete && img.naturalWidth > 1) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      if (flipHorizontal) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();
    } else {
      drawHalfCircle(ctx, this.color, this.x, this.y, this.radius, this.isLeft);
    }
  }
}

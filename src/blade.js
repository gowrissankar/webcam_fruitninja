import { MAX_BLADE_TRAIL_LENGTH } from './config.js';

export class Blade {
  constructor() {
    this.history = [];
    this.maxLength = MAX_BLADE_TRAIL_LENGTH;
  }

  update(pos) {
    if (pos) {
      this.history.push({ x: pos.x, y: pos.y }); 
      if (this.history.length > this.maxLength) {
        this.history.shift();
      }
    } else {
      if (this.history.length > 0) {
        this.history.shift();
      }
    }
  }

  draw(ctx) {
    if (this.history.length < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < this.history.length - 1; i++) {
      const p1 = this.history[i];
      const p2 = this.history[i + 1];

      const progress = i / (this.history.length - 1);
      
      const widthOuter = 2 + progress * 12; 
      const widthInner = 1 + progress * 6;  

      const alphaOuter = progress * 0.5; 
      const alphaInner = progress * 1.0; 

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      
      ctx.strokeStyle = `rgba(180, 180, 255, ${alphaOuter})`;
      ctx.lineWidth = widthOuter;
      ctx.stroke();
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${alphaInner})`;
      ctx.lineWidth = widthInner;
      ctx.stroke();
    }
    
    const last = this.history[this.history.length - 1];
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  getLastSegment() {
    if (this.history.length >= 2) {
      return [this.history[this.history.length - 2], this.history[this.history.length - 1]];
    }
    return null;
  }
}

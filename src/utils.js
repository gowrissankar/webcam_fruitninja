export function lineIntersectsCircle(p1, p2, center, radius) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lineLenSq = dx * dx + dy * dy;
  
  if (lineLenSq === 0) {
    const ddx = p1.x - center.x;
    const ddy = p1.y - center.y;
    return ddx * ddx + ddy * ddy <= radius * radius;
  }
  
  const t = Math.max(0, Math.min(1, ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / lineLenSq));
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  
  const ddx = center.x - projX;
  const ddy = center.y - projY;
  return ddx * ddx + ddy * ddy <= radius * radius;
}

export function drawHalfCircle(ctx, color, x, y, radius, isLeft) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const startAngle = isLeft ? Math.PI / 2 : -Math.PI / 2;
  const endAngle = isLeft ? 3 * Math.PI / 2 : Math.PI / 2;
  ctx.arc(x, y, radius, startAngle, endAngle);
  ctx.fill();
}

/**
 * Generate a high-contrast synthwave scene so the neon halftone styles look
 * great out of the box without requiring an upload.
 */
export function createSampleImage(width = 720, height = 720): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const horizon = height * 0.6;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#0b1030");
  sky.addColorStop(0.55, "#3b1470");
  sky.addColorStop(1, "#ff6b9d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);

  // Sun
  const cx = width / 2;
  const sunY = horizon - 40;
  const sun = ctx.createLinearGradient(0, sunY - 150, 0, sunY + 40);
  sun.addColorStop(0, "#fff3b0");
  sun.addColorStop(0.5, "#ffb14e");
  sun.addColorStop(1, "#ff3d81");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, sunY, 150, Math.PI, Math.PI * 2);
  ctx.arc(cx, sunY, 150, 0, Math.PI);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(cx - 160, sunY - 160, 320, 320);
  // horizontal cutout bands (classic synthwave sun)
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  for (let i = 0; i < 7; i++) {
    const bandY = sunY - 10 + i * 16;
    ctx.fillRect(cx - 160, bandY, 320, 7 + i);
  }
  ctx.restore();

  // Ground
  const ground = ctx.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, "#170a33");
  ground.addColorStop(1, "#050110");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, width, height - horizon);

  // Perspective grid
  ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
  ctx.lineWidth = 2;
  for (let x = -10; x <= 10; x++) {
    ctx.beginPath();
    ctx.moveTo(cx, horizon);
    ctx.lineTo(cx + x * (width / 6), height);
    ctx.stroke();
  }
  for (let i = 1; i <= 14; i++) {
    const t = i / 14;
    const y = horizon + t * t * (height - horizon);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Mountain silhouettes on the horizon
  ctx.fillStyle = "#120633";
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  const peaks = [0.08, 0.2, 0.32, 0.68, 0.8, 0.92];
  ctx.lineTo(0, horizon - 30);
  for (const p of peaks) {
    ctx.lineTo(width * p, horizon - 30 - Math.abs(Math.sin(p * 9)) * 70);
    ctx.lineTo(width * (p + 0.06), horizon - 30);
  }
  ctx.lineTo(width, horizon - 30);
  ctx.lineTo(width, horizon);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

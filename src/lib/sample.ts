/**
 * Generate a colorful sample image so the app is instantly usable without an
 * upload. Returns an ImageBitmap-compatible canvas.
 */
export function createSampleImage(width = 720, height = 480): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#0ea5e9");
  sky.addColorStop(0.6, "#e0f2fe");
  sky.addColorStop(1, "#fef3c7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(width * 0.78, height * 0.28, 70, 0, Math.PI * 2);
  ctx.fill();

  // Rolling hills
  const hills = [
    { color: "#22c55e", y: 0.7, amp: 40 },
    { color: "#16a34a", y: 0.8, amp: 55 },
    { color: "#15803d", y: 0.9, amp: 35 },
  ];
  for (const hill of hills) {
    ctx.fillStyle = hill.color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 8) {
      const y =
        height * hill.y + Math.sin((x / width) * Math.PI * 3) * hill.amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }

  // A few clouds
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const clouds = [
    { x: 0.2, y: 0.2, r: 26 },
    { x: 0.28, y: 0.22, r: 34 },
    { x: 0.36, y: 0.2, r: 24 },
    { x: 0.55, y: 0.14, r: 20 },
    { x: 0.62, y: 0.16, r: 28 },
  ];
  for (const c of clouds) {
    ctx.beginPath();
    ctx.arc(width * c.x, height * c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/** Lightweight full-screen canvas particle system for big hits. */

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'spark' | 'star' | 'dust' | 'ring';
  spin: number;
  rot: number;
  g: number;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let parts: P[] = [];
let running = false;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'particles-canvas';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const resize = () => {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const PALETTES = {
  common: ['#e1d8c2', '#ffffff'],
  uncommon: ['#ffcf97', '#ffe7c9', '#ffffff'],
  rare: ['#8cc0ff', '#d4e6ff', '#ffffff'],
  epic: ['#c89cff', '#e8d6ff', '#8f5bff', '#ffffff'],
  legendary: ['#ffd766', '#fff1b8', '#ffb300', '#ffffff'],
  mythic: ['#ff6b6b', '#ffd36b', '#7dff9b', '#6be4ff', '#8a7dff', '#ff7de9', '#ffffff'],
  gold: ['#ffd766', '#fff1b8', '#e0a800', '#fffbe6'],
};

/** level 1: dust puff, 2: spark burst, 3: huge burst + ring, 4: 1-of-1 golden storm. */
export function burst(x: number, y: number, level: number, colors: string[]) {
  ensureCanvas();
  const n = [0, 50, 130, 260, 420][Math.min(4, level)];
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const speed = rand(2, 5 + level * 3.2);
    const kind: P['kind'] = level >= 2 && Math.random() < 0.28 ? 'star' : Math.random() < 0.55 ? 'spark' : 'dust';
    parts.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - rand(0, 2),
      life: 0,
      max: rand(50, 90 + level * 25),
      size: kind === 'star' ? rand(4, 9) : kind === 'spark' ? rand(1.5, 3) : rand(1, 2.5),
      color: pick(colors),
      kind,
      spin: rand(-0.2, 0.2),
      rot: rand(0, Math.PI),
      g: kind === 'dust' ? -0.01 : 0.06,
    });
  }
  if (level >= 3) {
    for (let r = 0; r < (level >= 4 ? 3 : 1); r++) {
      parts.push({ x, y, vx: 0, vy: 0, life: -r * 10, max: 55, size: 10, color: pick(colors), kind: 'ring', spin: 0, rot: 0, g: 0 });
    }
  }
  if (level >= 4) {
    // golden rain from the top of the screen
    for (let i = 0; i < 260; i++) {
      parts.push({
        x: rand(0, innerWidth),
        y: rand(-innerHeight * 0.6, -10),
        vx: rand(-0.6, 0.6),
        vy: rand(2, 5),
        life: 0,
        max: rand(160, 260),
        size: rand(3, 7),
        color: pick(PALETTES.gold),
        kind: 'star',
        spin: rand(-0.1, 0.1),
        rot: rand(0, Math.PI),
        g: 0.02,
      });
    }
  }
  if (!running) {
    running = true;
    requestAnimationFrame(tick);
  }
}

function drawStar(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2);
    c.quadraticCurveTo(0, 0, 0, -r);
    c.quadraticCurveTo(0, 0, r * 0.001, 0);
  }
  c.fill();
  c.restore();
}

function tick() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.globalCompositeOperation = 'lighter';
  parts = parts.filter((p) => p.life < p.max);
  for (const p of parts) {
    p.life++;
    if (p.life < 0) continue;
    const t = p.life / p.max;
    const alpha = t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    if (p.kind === 'ring') {
      ctx.lineWidth = 4 * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 + t * Math.max(innerWidth, innerHeight) * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    p.vx *= 0.975;
    p.vy = p.vy * 0.975 + p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    if (p.kind === 'spark') {
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
      ctx.stroke();
    } else if (p.kind === 'star') {
      drawStar(ctx, p.x, p.y, p.size * (1 - t * 0.5), p.rot);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(tick);
  else {
    running = false;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
}

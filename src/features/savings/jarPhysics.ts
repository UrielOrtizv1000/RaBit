/**
 * Física de las monedas dentro de un frasco: gravedad dependiente de la inclinación, choques moneda–moneda y contra
 * el cristal (rectángulo con esquinas redondeadas). Es pura (solo números) para poder probarla sin DOM.
 */
export interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
}

/** Interior del frasco en px de layout (el cristal mide 146×170 menos el borde). */
export const GLASS_W = 143;
export const GLASS_H = 167;
const PAD = 3;
const R_BOTTOM = 42;
const R_TOP = 36;

/** Rebota la moneda contra el cristal por los cuatro lados y las cuatro esquinas redondeadas. */
export function collideGlass(c: Coin, bounce: number): void {
  const hit = (nx: number, ny: number) => {
    const vn = c.vx * nx + c.vy * ny;
    if (vn > 0) {
      c.vx -= (1 + bounce) * vn * nx;
      c.vy -= (1 + bounce) * vn * ny;
      c.vx *= 0.94;
      c.vy *= 0.94;
    }
  };
  const { r } = c;
  if (c.x < PAD + r) {
    c.x = PAD + r;
    hit(-1, 0);
  }
  if (c.x > GLASS_W - PAD - r) {
    c.x = GLASS_W - PAD - r;
    hit(1, 0);
  }
  if (c.y > GLASS_H - PAD - r) {
    c.y = GLASS_H - PAD - r;
    hit(0, 1);
    c.vx *= 0.9;
  }
  if (c.y < PAD + r) {
    c.y = PAD + r;
    hit(0, -1);
  }
  const corners: [number, number, number, number][] = [
    [PAD + R_BOTTOM, GLASS_H - PAD - R_BOTTOM, R_BOTTOM, 1],
    [GLASS_W - PAD - R_BOTTOM, GLASS_H - PAD - R_BOTTOM, R_BOTTOM, 1],
    [PAD + R_TOP, PAD + R_TOP, R_TOP, -1],
    [GLASS_W - PAD - R_TOP, PAD + R_TOP, R_TOP, -1],
  ];
  for (const [cx, cy, R, dir] of corners) {
    const inX = cx < GLASS_W / 2 ? c.x < cx : c.x > cx;
    const inY = dir > 0 ? c.y > cy : c.y < cy;
    if (!inX || !inY) continue;
    const ex = c.x - cx;
    const ey = c.y - cy;
    const dd = Math.sqrt(ex * ex + ey * ey) || 1;
    const lim = R - r;
    if (dd > lim) {
      const nx = ex / dd;
      const ny = ey / dd;
      c.x = cx + nx * lim;
      c.y = cy + ny * lim;
      hit(nx, ny);
    }
  }
}

/** Un paso de simulación. `angle` = inclinación del frasco (grados); `acc` = aceleración lateral del carrusel. */
export function stepCoins(coins: Coin[], angle: number, acc: number): void {
  const rad = (angle * Math.PI) / 180;
  const sn = Math.sin(rad);
  const cs = Math.cos(rad);
  const g = 0.42;
  const fx = g * sn - acc * 0.3 * cs;
  const fy = g * cs + acc * 0.3 * sn;
  const VMAX = 7;
  for (const c of coins) {
    c.vx = (c.vx + fx) * 0.985;
    c.vy = (c.vy + fy) * 0.985;
    const sp = Math.hypot(c.vx, c.vy);
    if (sp > VMAX) {
      c.vx *= VMAX / sp;
      c.vy *= VMAX / sp;
    }
    c.x += c.vx;
    c.y += c.vy;
  }
  for (let it = 0; it < 6; it++) {
    for (let i = 0; i < coins.length; i++) {
      for (let k = i + 1; k < coins.length; k++) {
        const A = coins[i];
        const B = coins[k];
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const m = A.r + B.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= m * m) continue;
        const d = Math.sqrt(d2) || 0.01;
        const nx = d2 ? dx / d : 1;
        const ny = d2 ? dy / d : 0;
        const o = (m - d) / 2;
        A.x -= nx * o;
        A.y -= ny * o;
        B.x += nx * o;
        B.y += ny * o;
        const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
        if (rv < 0) {
          const j = rv * 0.6;
          A.vx += j * nx;
          A.vy += j * ny;
          B.vx -= j * nx;
          B.vy -= j * ny;
        }
      }
    }
    for (const c of coins) collideGlass(c, 0.35);
  }
  for (const c of coins) {
    collideGlass(c, 0.35);
    if (Math.abs(c.vx) < 0.01) c.vx = 0;
    if (Math.abs(c.vy) < 0.01) c.vy = 0;
    c.rot += c.vx * 4.5;
  }
}

/** Moneda nueva cayendo por la boca del frasco. */
export const newCoin = (rand: () => number = Math.random): Coin => {
  const r = 8.6 + rand() * 1.4;
  return { x: 58 + rand() * 27, y: r + 4, vx: (rand() - 0.5) * 1.4, vy: 1.5, r, rot: rand() * 360 };
};

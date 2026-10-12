/**
 * Frasco de cristal con monedas que se mueven de verdad: el carrusel lo sacude (`sway.acc`), se inclina como péndulo,
 * cae con rebote al crearse y suelta chispas al completarse. Las monedas y chispas se dibujan en un <canvas>, así la
 * animación no toca el DOM (FitPage observa mutaciones y reescalaría la página en cada cuadro).
 */
import { useEffect, useRef, type MutableRefObject } from "react";
import { lighten } from "../../domain/savings";
import { newCoin, stepCoins, type Coin } from "./jarPhysics";

export interface Sway {
  acc: number;
}

interface Spark {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  age: number;
  life: number;
}

const JAR_W = 146;
const JAR_H = 196;
const GLASS_X = 1.5; // borde del cristal dentro del frasco
const GLASS_Y = 26 + 1.5;
const SCALE = 2; // resolución interna del canvas (nítido al escalar la página)

const sprites = new Map<number, HTMLCanvasElement>();
/** Moneda dorada con su «$», pre-dibujada una vez por radio. */
function coinSprite(r: number): HTMLCanvasElement {
  const key = Math.round(r * 10);
  const hit = sprites.get(key);
  if (hit) return hit;
  const size = Math.ceil(r * 2 * SCALE);
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d");
  if (g) {
    const c = size / 2;
    const rad = c - 0.5;
    const fill = g.createRadialGradient(size * 0.34, size * 0.3, 0, c, c, rad);
    fill.addColorStop(0, "#fff6c4");
    fill.addColorStop(0.26, "#f6d365");
    fill.addColorStop(0.6, "#e3a92b");
    fill.addColorStop(1, "#b47a10");
    g.fillStyle = fill;
    g.beginPath();
    g.arc(c, c, rad, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 1.5 * SCALE;
    g.strokeStyle = "rgba(150,98,6,.6)";
    g.beginPath();
    g.arc(c, c, rad - 0.75 * SCALE, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1.6 * SCALE;
    g.strokeStyle = "rgba(255,233,150,.45)";
    g.beginPath();
    g.arc(c, c, rad - 3 * SCALE, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(150,98,6,.85)";
    g.font = `800 ${Math.round(r * 1.05 * SCALE)}px 'Plus Jakarta Sans',sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("$", c, c + size * 0.03);
  }
  sprites.set(key, cv);
  return cv;
}

interface JarState {
  a: number;
  w: number;
  coins: Coin[];
  dy: number;
  vy: number;
  wait: number;
  sq: number;
  kick: number;
  spark: number;
  sp: number;
  boot: boolean | undefined;
  sparks: Spark[];
}

const fresh = (drop: boolean): JarState => ({
  a: drop ? -6 : 0,
  w: 0,
  coins: [],
  dy: drop ? -280 : 0,
  vy: 0,
  wait: drop ? 26 : 0,
  sq: 0,
  kick: 0,
  spark: 0,
  sp: 0,
  boot: undefined,
  sparks: [],
});

export function Jar({
  color,
  coins,
  drop,
  sparkToken,
  sway,
  reduced,
}: {
  color: string;
  /** monedas que deben verse (0–58) */
  coins: number;
  /** el frasco acaba de crearse: entra cayendo */
  drop: boolean;
  /** cambia (>0) cada vez que hay que soltar chispas */
  sparkToken: number;
  sway: MutableRefObject<Sway>;
  reduced: boolean;
}) {
  const jarEl = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const want = useRef(coins);
  const st = useRef<JarState>(fresh(drop));
  /** al tocar el frasco las monedas saltan un poco (la define el efecto de animación) */
  const pokeRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    want.current = coins;
  }, [coins]);

  useEffect(() => {
    if (sparkToken > 0) st.current.spark = 140;
  }, [sparkToken]);

  useEffect(() => {
    const el = jarEl.current;
    const cv = canvas.current;
    const sh = shadow.current;
    if (!el || !cv) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const j = st.current;
    if (reduced) {
      // sin movimiento: monedas ya asentadas, dibujadas una vez
      while (j.coins.length < want.current) j.coins.push(newCoin());
      for (let i = 0; i < 80; i++) stepCoins(j.coins, 0, 0);
    }
    pokeRef.current = () => {
      j.kick = (Math.random() > 0.5 ? 1 : -1) * 1.8;
      for (const c of j.coins) {
        c.vy -= 1.5 + Math.random() * 2;
        c.vx += (Math.random() - 0.5) * 2;
      }
    };
    let raf = 0;
    let last = 0;
    let running = true;

    const frame = (ts: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (ts - last < 14) return; // ~60 fps como máximo
      last = ts;
      const n = want.current;
      const C = j.coins;
      const acc = reduced ? 0 : sway.current.acc;

      // caída de entrada con rebote
      if (j.wait > 0) j.wait--;
      else if (j.dy < 0 || j.vy) {
        j.vy += 1.25;
        j.dy += j.vy;
        if (j.dy >= 0) {
          j.dy = 0;
          if (j.vy > 3) {
            j.sq = Math.min(0.16, j.vy * 0.012);
            j.kick = (Math.random() > 0.5 ? 1 : -1) * Math.min(2.2, j.vy * 0.12);
            j.vy *= -0.32;
          } else j.vy = 0;
        }
      }
      j.sq *= 0.82;
      if (j.sq < 0.002) j.sq = 0;
      if (sh) {
        const k = Math.max(0.25, 1 + j.dy / 300);
        sh.style.transform = `scaleX(${k.toFixed(3)})`;
        sh.style.opacity = k.toFixed(3);
      }

      // péndulo: el carrusel lo empuja, la gravedad lo endereza
      const load = 0.6 + Math.min(1, n / 58) * 0.6;
      j.w += (-acc * 0.55) / load - j.a * 0.06 + j.kick;
      j.kick = 0;
      j.w *= 0.87;
      j.a += j.w;
      if (j.a > 16) {
        j.a = 16;
        j.w *= -0.3;
      }
      if (j.a < -16) {
        j.a = -16;
        j.w *= -0.3;
      }
      if (Math.abs(j.a) < 0.03 && Math.abs(j.w) < 0.03) {
        j.a = 0;
        j.w = 0;
      }
      el.style.transformOrigin = j.a >= 0 ? "84% 100%" : "16% 100%";
      el.style.transform =
        `${j.dy ? `translateY(${j.dy.toFixed(1)}px) ` : ""}${j.a ? `rotate(${j.a.toFixed(2)}deg) ` : ""}${j.sq ? `scale(${(1 + j.sq * 0.6).toFixed(3)},${(1 - j.sq).toFixed(3)})` : ""}` ||
        "none";

      // monedas: entran de una en una (rápido al cargar, más pausado después) y salen de la última a la primera
      j.sp++;
      const rate = j.boot === undefined || j.boot ? 1 : 5;
      if (C.length >= n) j.boot = false;
      if (C.length < n && j.sp >= rate) {
        j.sp = 0;
        C.push(newCoin());
        if (!j.boot) j.kick += (Math.random() - 0.5) * 0.25;
      }
      if (j.boot === undefined) j.boot = true;
      while (C.length > n) C.pop();
      stepCoins(C, j.a, acc);

      // chispas de meta cumplida
      if (j.spark > 0) {
        j.spark--;
        if (j.spark % 3 === 0) {
          const dx = (Math.random() - 0.5) * 120;
          const dy = -60 - Math.random() * 90;
          j.sparks.push({
            x: 20 + Math.random() * 106,
            y: 40 + Math.random() * 90,
            dx,
            dy,
            size: 6 + Math.random() * 9,
            color: Math.random() > 0.4 ? "#3ddc84" : "#fff3b0",
            age: 0,
            life: 66 + Math.random() * 40,
          });
        }
      }

      g.clearRect(0, 0, cv.width, cv.height);
      g.save();
      g.scale(SCALE, SCALE);
      for (const c of C) {
        g.save();
        g.translate(GLASS_X + c.x, GLASS_Y + c.y);
        g.rotate((c.rot * Math.PI) / 180);
        g.drawImage(coinSprite(c.r), -c.r, -c.r, c.r * 2, c.r * 2);
        g.restore();
      }
      j.sparks = j.sparks.filter((s) => s.age < s.life);
      for (const s of j.sparks) {
        s.age++;
        const t = s.age / s.life;
        const ease = 1 - Math.pow(1 - t, 3);
        const alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
        const sc = (t < 0.3 ? 0.2 + (t / 0.3) * 0.9 : 1.1 - ((t - 0.3) / 0.7) * 0.8) * s.size;
        g.save();
        g.globalAlpha = Math.max(0, alpha);
        g.fillStyle = s.color;
        g.shadowColor = s.color;
        g.shadowBlur = 4;
        g.translate(s.x + s.dx * ease, s.y + s.dy * ease);
        g.rotate(t * 3.4);
        g.beginPath();
        const h = sc / 2;
        const q = h * 0.24;
        g.moveTo(0, -h);
        g.lineTo(q, -q);
        g.lineTo(h, 0);
        g.lineTo(q, q);
        g.lineTo(0, h);
        g.lineTo(-q, q);
        g.lineTo(-h, 0);
        g.lineTo(-q, -q);
        g.closePath();
        g.fill();
        g.restore();
      }
      g.restore();
    };

    if (reduced) {
      frame(100);
      running = false;
      cancelAnimationFrame(raf);
      return;
    }
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [sway, reduced]);

  return (
    <>
      <div
        ref={shadow}
        style={{
          position: "absolute",
          bottom: 11,
          left: "50%",
          width: 150,
          height: 14,
          marginLeft: -75,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center,rgba(20,48,34,.34),rgba(20,48,34,.12) 48%,transparent 72%)",
        }}
      />
      <div ref={jarEl} onPointerDown={() => pokeRef.current()} style={{ position: "relative", width: JAR_W, height: JAR_H, transformOrigin: "50% 100%" }}>
        <div
          style={{
            position: "absolute",
            left: 26,
            right: 26,
            top: 0,
            height: 18,
            borderRadius: 8,
            background: `linear-gradient(180deg,${lighten(color, 0.25)},${color})`,
            border: `1px solid ${lighten(color, 0.45)}`,
            transition: "background .8s ease,border-color .8s ease",
            boxShadow: "inset 0 -4px 8px -4px rgba(18,38,30,.2),0 6px 12px -8px rgba(18,38,30,.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 33,
            right: 33,
            top: 16,
            height: 12,
            background: "linear-gradient(90deg,rgba(255,255,255,.65),rgba(255,255,255,.18),rgba(255,255,255,.6))",
            borderLeft: "1.5px solid rgba(255,255,255,.95)",
            borderRight: "1.5px solid rgba(255,255,255,.95)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 26,
            bottom: 0,
            borderRadius: "40px 40px 48px 48px",
            overflow: "hidden",
            background: "linear-gradient(105deg,rgba(255,255,255,.7),rgba(255,255,255,.18) 38%,rgba(255,255,255,.1) 62%,rgba(255,255,255,.5))",
            border: "1.5px solid rgba(255,255,255,.95)",
            boxShadow: "inset 0 0 0 1px rgba(18,38,30,.05),inset 0 -16px 28px -16px rgba(18,38,30,.25),0 10px 14px -12px rgba(20,48,34,.38)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 16,
              top: 20,
              bottom: 28,
              width: 13,
              borderRadius: 8,
              background: "linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.08))",
            }}
          />
          <div style={{ position: "absolute", right: 20, top: 26, width: 6, height: 40, borderRadius: 4, background: "rgba(255,255,255,.55)" }} />
        </div>
        <canvas
          ref={canvas}
          width={JAR_W * SCALE}
          height={JAR_H * SCALE}
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: JAR_W, height: JAR_H, pointerEvents: "none", zIndex: 4 }}
        />
      </div>
    </>
  );
}

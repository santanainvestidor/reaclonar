// Gráfico de candles com volume e níveis de Fibonacci, desenhado em SVG.
import { preco } from "./ui.js";

const NIVEIS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const W = 360;
const HP = 200;
const HV = 44;
const DIR = 80;

/** Desenha os últimos `mostrar` candles; `fib` vem de analisar(). */
export const desenhar = (el, candles, fib, mostrar = 60) => {
  const ini = Math.max(0, candles.length - mostrar);
  const vis = candles.slice(ini);
  const niveis = fib ? NIVEIS.map((k) => fib.p0 - (fib.p0 - fib.p1) * k) : [];
  const hi = Math.max(...vis.map((c) => c.high), ...niveis);
  const lo = Math.min(...vis.map((c) => c.low), ...niveis);
  const vMax = Math.max(...vis.map((c) => c.volume)) || 1;
  const larg = (W - DIR) / vis.length;
  const y = (v) => 6 + ((hi - v) / (hi - lo || 1)) * (HP - 12);
  const partes = [];

  if (fib) {
    const x0 = Math.max(0, (fib.inicio - ini) * larg);
    const z1 = y(fib.p0 - (fib.p0 - fib.p1) * 0.382);
    const z2 = y(fib.p0 - (fib.p0 - fib.p1) * 0.618);
    partes.push(
      `<rect x="${x0}" y="${Math.min(z1, z2)}" width="${W - DIR - x0}" height="${Math.abs(z2 - z1)}" fill="#3b82f6" opacity=".12"/>`,
    );
    NIVEIS.forEach((k, i) => {
      const yy = y(niveis[i]);
      partes.push(
        `<line x1="${x0}" x2="${W - DIR}" y1="${yy}" y2="${yy}" stroke="#3b82f6" stroke-width=".6" stroke-dasharray="3 3"/>`,
        `<text x="${W - DIR + 3}" y="${yy + 3}" fill="#8b98a5" font-size="8">${(k * 100).toFixed(1)}% ${preco(niveis[i])}</text>`,
      );
    });
  }

  vis.forEach((c, i) => {
    const x = i * larg + larg / 2;
    const cr = c.close >= c.open ? "#22c55e" : "#ef4444";
    const topo = y(Math.max(c.open, c.close));
    const corpo = Math.max(1, Math.abs(y(c.open) - y(c.close)));
    const hv = (c.volume / vMax) * (HV - 4);
    partes.push(
      `<line x1="${x}" x2="${x}" y1="${y(c.high)}" y2="${y(c.low)}" stroke="${cr}" stroke-width=".8"/>`,
      `<rect x="${x - larg * 0.35}" y="${topo}" width="${larg * 0.7}" height="${corpo}" fill="${cr}"/>`,
      `<rect x="${x - larg * 0.35}" y="${HP + HV - hv}" width="${larg * 0.7}" height="${hv}" fill="${cr}" opacity=".45"/>`,
    );
  });

  el.innerHTML = `<svg viewBox="0 0 ${W} ${HP + HV}" role="img" aria-label="Gráfico de candles">${partes.join("")}</svg>`;
};

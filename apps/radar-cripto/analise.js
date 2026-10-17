// Junta busca de candles e regras: usado pela tela de análise e pela varredura.
import { analisar, diaDe } from "./core.js";
import { candles } from "./dados.js";
import { ativo } from "./moedas.js";

/** Candle diário em formação do BTC (perpétuo), para o voto de tendência. */
export const btcDiario = async () => {
  const c = await candles(ativo("BTCUSDT.P"), "1D", 2);
  return c[c.length - 1] ?? null;
};

/** Candles do ativo no tempo gráfico e o resultado das regras. */
export const analisarAtivo = async (a, tf, btcDia) => {
  const c = await candles(a, tf);
  const dia = tf === "1D" ? c[c.length - 1] : diaDe(c);
  return { candles: c, r: analisar(c, dia, btcDia) };
};

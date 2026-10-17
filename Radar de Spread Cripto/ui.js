// Formatação e pequenos utilitários de tela.
export const $ = (id) => document.getElementById(id);

export const preco = (v) =>
  !Number.isFinite(v)
    ? "—"
    : Math.abs(v) >= 1000
      ? v.toFixed(2)
      : Math.abs(v) >= 1
        ? v.toFixed(4)
        : v.toPrecision(5);

export const pct = (v, sinal = false) =>
  !Number.isFinite(v) ? "—" : (sinal && v > 0 ? "+" : "") + v.toFixed(2) + "%";

export const cor = (v) => (v > 0 ? "alta" : v < 0 ? "baixa" : "neutro");

export const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/** Compra, Venda ou Aguardar a partir do lado da entrada. */
export const rotulo = (lado) =>
  lado === 1
    ? ["Compra", "compra"]
    : lado === -1
      ? ["Venda", "venda"]
      : ["Aguardar", "aguardar"];

const INTERVALO_TV = { "30m": "30", "2h": "120", "4h": "240", "1D": "D" };

export const linkTv = (tv, tf) =>
  `https://www.tradingview.com/chart/?symbol=BINANCE:${encodeURIComponent(tv)}&interval=${INTERVALO_TV[tf]}`;

export const lista = (pares) =>
  pares.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");

/** Executa tarefas com no máximo `n` em paralelo. */
export const emLotes = async (itens, n, tarefa) => {
  let i = 0;
  const trabalhador = async () => {
    while (i < itens.length) {
      const item = itens[i++];
      await tarefa(item);
    }
  };
  await Promise.all(Array.from({ length: n }, trabalhador));
};

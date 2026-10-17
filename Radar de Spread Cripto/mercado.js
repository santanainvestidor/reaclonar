// Tabela "Mercado agora" com as criptos do app.
import { tickers } from "./dados.js";
import { LISTA, ativo } from "./moedas.js";
import { $, cor, esc, pct, preco } from "./ui.js";

let linhas = [];
let ordem = { campo: "var", desc: true };

const desenhar = (aoEscolher) => {
  const q = $("busca").value.trim().toUpperCase();
  const { campo, desc } = ordem;
  const vis = linhas
    .filter((x) => x.tv.includes(q))
    .sort(
      (a, b) =>
        (campo === "tv" ? a.tv.localeCompare(b.tv) : a[campo] - b[campo]) *
        (desc ? -1 : 1),
    );
  $("mercado").innerHTML = vis
    .map(
      (x) =>
        `<tr data-tv="${esc(x.tv)}"><td>${esc(x.tv)}</td><td>${preco(x.preco)}</td><td class="${cor(x.var)}">${pct(x.var, true)}</td><td>${pct(x.amp)}</td></tr>`,
    )
    .join("");
  $("mercado")
    .querySelectorAll("tr")
    .forEach((tr) =>
      tr.addEventListener("click", () => aoEscolher(tr.dataset.tv)),
    );
};

/** Busca as variações de 24 h e redesenha a tabela; devolve o mapa por símbolo. */
export const carregarMercado = async (aoEscolher) => {
  const ativos = LISTA.map(ativo);
  const t = await tickers([
    ...new Set(ativos.filter((a) => !a.futuro).map((a) => a.api)),
  ]);
  const faltam = [];
  linhas = [];
  for (const a of ativos) {
    const x = (a.futuro ? t.futuro : t.spot).get(a.api);
    if (!x) {
      faltam.push(a.tv);
      continue;
    }
    const hi = +x.highPrice;
    const lo = +x.lowPrice;
    linhas.push({
      tv: a.tv,
      preco: +x.lastPrice,
      var: +x.priceChangePercent,
      amp: lo > 0 ? ((hi - lo) / lo) * 100 : NaN,
    });
  }
  $("faltando").textContent = faltam.length
    ? `Sem cotação na Binance agora: ${faltam.join(", ")}.`
    : "";
  desenhar(aoEscolher);
  return new Map(linhas.map((x) => [x.tv, x]));
};

/** Liga a busca e a ordenação da tabela. */
export const iniciarMercado = (aoEscolher) => {
  $("busca").addEventListener("input", () => desenhar(aoEscolher));
  document.querySelectorAll("th[data-ordem]").forEach((th) =>
    th.addEventListener("click", () => {
      const campo = th.dataset.ordem;
      ordem = {
        campo,
        desc: ordem.campo === campo ? !ordem.desc : campo !== "tv",
      };
      desenhar(aoEscolher);
    }),
  );
};

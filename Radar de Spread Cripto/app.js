// Tela principal do Radar de Spread Cripto: par escolhido, tempo gráfico, abas e atualização.
import { analisarAtivo, btcDiario } from "./analise.js";
import { spread } from "./core.js";
import { desenhar } from "./grafico.js";
import { carregarMercado, iniciarMercado } from "./mercado.js";
import { LISTA, ativo } from "./moedas.js";
import { $, cor, esc, linkTv, lista, pct, preco, rotulo } from "./ui.js";
import { iniciarVarredura } from "./varredura.js";

const ler = (k, padrao) => {
  try {
    return localStorage.getItem(k) || padrao;
  } catch {
    return padrao;
  }
};
const gravar = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // Sem armazenamento: o app só não lembra a última escolha.
  }
};

const estado = {
  tv: ler("rc.par", "BTCUSDT.P"),
  tf: ler("rc.tf", "2h"),
  aba: "analise",
  tickers: new Map(),
};
if (!LISTA.includes(estado.tv)) estado.tv = "BTCUSDT.P";
let pedido = 0;

const aviso = (txt) => {
  $("aviso").hidden = !txt;
  $("aviso").textContent = txt || "";
};

const mostrarResultado = (c, r) => {
  const ult = c.slice(-50);
  const s = spread(ult);
  const t = estado.tickers.get(estado.tv);
  $("k-preco").textContent = preco(c[c.length - 1].close);
  $("k-24h").textContent = t ? pct(t.var, true) : "—";
  $("k-24h").className = t ? cor(t.var) : "";
  $("k-recuo").textContent = pct(s.recuo);
  $("k-repique").textContent = pct(s.repique);
  $("k-amp").textContent = pct(s.amplitude);
  desenhar($("grafico"), c, r?.fib);

  const [txt, cls] = rotulo(r?.entrada.lado ?? 0);
  $("badge").textContent = txt;
  $("badge").className = `badge ${cls}`;
  $("spread").innerHTML = lista([
    ["Pavio superior médio", pct(s.pavioSup)],
    ["Pavio inferior médio", pct(s.pavioInf)],
    ["Corpo médio", pct(s.corpo)],
    ["Range médio (máx − mín)", pct(s.range)],
  ]);
  if (!r) {
    $("decisao").textContent = "Poucos candles para calcular as regras.";
    return;
  }
  const e = r.entrada;
  $("decisao").textContent = e.decisao;
  $("decisao").className = `decisao ${cor(e.lado)}`;
  $("entrada").innerHTML = lista([
    ["Médias 9/21/50", e.medias],
    ["PP SuperTrend", e.supertrend],
    ["Volume", e.volume],
    ["Ultimate RSI", e.rsi],
    ["Confluência", e.confluencia],
    ["Permanência (Fibonacci)", e.permanencia],
    ...(e.faltam ? [["Falta para entrar", e.faltam]] : []),
  ]);
  $("fibo").textContent =
    `Tendência de ${r.fib.tendencia.toLowerCase()} · retração ${r.fib.retracao_pct.toFixed(1)}% · continua: ${r.fib.continua}. ${r.fib.leitura}.`;
  $("conf").innerHTML =
    `<b class="${cor(r.conf.estado)}">${esc(r.conf.sinal)}</b> · ${r.conf.votos} de ${r.conf.total} votos (alta ${r.conf.alta}, baixa ${r.conf.baixa}) · ${esc(r.conf.status)}`;
  $("painel").innerHTML = r.ind
    .map(
      (x) =>
        `<tr><td>${esc(x.indicador)}</td><td class="${cor(x.voto)}">${esc(x.leitura)}</td><td>${x.peso === 0 ? "" : x.voto > 0 ? "▲" : x.voto < 0 ? "▼" : "•"}${x.peso === 2 ? " x2" : ""}</td></tr>`,
    )
    .join("");
};

const carregarPar = async () => {
  const meu = ++pedido;
  $("badge").textContent = "…";
  $("badge").className = "badge";
  $("tv").href = linkTv(estado.tv, estado.tf);
  try {
    const btcDia = await btcDiario().catch(() => null);
    const { candles, r } = await analisarAtivo(
      ativo(estado.tv),
      estado.tf,
      btcDia,
    );
    if (meu !== pedido) return;
    mostrarResultado(candles, r);
    aviso(btcDia ? "" : "Sem o diário do BTC agora; esse voto ficou neutro.");
  } catch (e) {
    if (meu !== pedido) return;
    $("badge").textContent = "Sem dados";
    aviso(
      `Não consegui buscar ${estado.tv} na Binance (${e.message || e}). Verifique a internet e toque em ↻.`,
    );
  }
};

const atualizarMercado = () =>
  carregarMercado(escolher)
    .then((m) => {
      estado.tickers = m;
      const t = m.get(estado.tv);
      if (t && estado.aba === "analise") {
        $("k-24h").textContent = pct(t.var, true);
        $("k-24h").className = cor(t.var);
      }
    })
    .catch(() => {});

function escolher(tv) {
  estado.tv = tv;
  $("par").value = tv;
  gravar("rc.par", tv);
  trocarAba("analise");
  window.scrollTo({ top: 0 });
  carregarPar();
}

function trocarAba(aba) {
  estado.aba = aba;
  document
    .querySelectorAll(".aba")
    .forEach((s) => (s.hidden = s.id !== `aba-${aba}`));
  document
    .querySelectorAll(".abas button")
    .forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
  if (aba === "mercado") atualizarMercado();
}

const marcarTempo = () =>
  document
    .querySelectorAll("#tempos button")
    .forEach((b) => b.classList.toggle("ativo", b.dataset.tf === estado.tf));

$("par").innerHTML = LISTA.map(
  (tv) => `<option value="${esc(tv)}">${esc(tv)}</option>`,
).join("");
$("par").value = estado.tv;
$("par").addEventListener("change", (ev) => escolher(ev.target.value));
document.querySelectorAll("#tempos button").forEach((b) =>
  b.addEventListener("click", () => {
    estado.tf = b.dataset.tf;
    gravar("rc.tf", estado.tf);
    marcarTempo();
    carregarPar();
  }),
);
document
  .querySelectorAll(".abas button")
  .forEach((b) => b.addEventListener("click", () => trocarAba(b.dataset.aba)));
$("atualizar").addEventListener("click", () => {
  carregarPar();
  atualizarMercado();
});
iniciarMercado(escolher);
iniciarVarredura(() => estado.tf, escolher);
marcarTempo();
carregarPar();
atualizarMercado();

// Atualiza o par a cada minuto enquanto o app está na tela.
setInterval(() => {
  if (document.visibilityState === "visible" && estado.aba === "analise")
    carregarPar();
}, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") carregarPar();
});

if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("sw.js").catch(() => {});

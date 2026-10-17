// Varredura de todas as criptos e avisos de novas entradas.
import { analisarAtivo, btcDiario } from "./analise.js";
import { LISTA, ativo } from "./moedas.js";
import { $, emLotes, esc, rotulo } from "./ui.js";

const CHAVE_AVISADOS = "rc.avisados";
let resultados = [];
let rodando = false;
let timer = 0;

const lerAvisados = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_AVISADOS) || "[]"));
  } catch {
    return new Set();
  }
};

const salvarAvisados = (s) => {
  try {
    localStorage.setItem(CHAVE_AVISADOS, JSON.stringify([...s].slice(-300)));
  } catch {
    // Sem armazenamento: só perde a memória de avisos já enviados.
  }
};

const avisar = async (novos, tf) => {
  if (
    !novos.length ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;
  const reg = await navigator.serviceWorker?.ready;
  const corpo = novos.map((x) => `${x.tv}: ${rotulo(x.lado)[0]}`).join("\n");
  const titulo =
    novos.length === 1 ? "Nova entrada" : `${novos.length} novas entradas`;
  const opcoes = {
    body: `${corpo}\nTempo gráfico ${tf}`,
    icon: "icons/icon-192.png",
    tag: "entradas",
  };
  if (reg) await reg.showNotification(titulo, opcoes);
  else new Notification(titulo, opcoes);
};

const desenhar = (aoEscolher) => {
  const so = $("so-entradas").checked;
  const linhas = resultados.filter((x) => !so || x.lado !== 0);
  $("varredura").innerHTML = linhas.length
    ? linhas
        .map((x) => {
          const [txt, cls] = rotulo(x.lado);
          const detalhe = x.erro
            ? `Sem dados: ${esc(x.erro)}`
            : x.lado !== 0
              ? `Confluência ${esc(x.e.confluencia)} · RSI ${x.e.rsi_valor.toFixed(0)} · volume ${Math.round(x.e.vol_pct)}% · Fibonacci: ${esc(x.e.fibo_continua)}`
              : esc(x.e.faltam || "—");
          return `<div class="resultado" data-tv="${esc(x.tv)}"><div class="linha"><b>${esc(x.tv)}</b><span class="tag ${cls}">${txt}</span></div><div class="nota">${detalhe}</div></div>`;
        })
        .join("")
    : `<p class="nota">${so ? "Nenhuma entrada agora pela regra." : "Sem resultados."}</p>`;
  $("varredura")
    .querySelectorAll(".resultado")
    .forEach((el) =>
      el.addEventListener("click", () => aoEscolher(el.dataset.tv)),
    );
};

/** Roda a regra de entrada em todas as criptos do app no tempo `tf`. */
const varrer = async (tf, aoEscolher) => {
  if (rodando) return;
  rodando = true;
  $("varrer").disabled = true;
  const out = [];
  let feitos = 0;
  try {
    const btcDia = await btcDiario().catch(() => null);
    await emLotes(LISTA, 6, async (tv) => {
      try {
        const { candles, r } = await analisarAtivo(ativo(tv), tf, btcDia);
        if (!r) throw new Error("poucos candles");
        out.push({
          tv,
          lado: r.entrada.lado,
          e: r.entrada,
          votos: r.conf.votos,
          vela: candles[candles.length - 1].time,
        });
      } catch (e) {
        out.push({ tv, lado: 0, erro: e.message || String(e) });
      }
      $("progresso").textContent = `Analisando ${++feitos} de ${LISTA.length}…`;
    });
    resultados = out.sort(
      (a, b) =>
        Math.abs(b.lado) - Math.abs(a.lado) || (b.votos ?? 0) - (a.votos ?? 0),
    );
    const entradas = resultados.filter((x) => x.lado !== 0);
    const falhas = resultados.filter((x) => x.erro).length;
    $("progresso").textContent =
      `${entradas.length} entrada(s) em ${LISTA.length} criptos no ${tf}, ${new Date().toLocaleTimeString("pt-BR")}` +
      (falhas ? `. ${falhas} sem dados.` : ".");
    const avisados = lerAvisados();
    const novos = entradas.filter(
      (x) => !avisados.has(`${x.tv}|${tf}|${x.vela}|${x.lado}`),
    );
    novos.forEach((x) => avisados.add(`${x.tv}|${tf}|${x.vela}|${x.lado}`));
    salvarAvisados(avisados);
    if ($("alertas").checked) await avisar(novos, tf);
    desenhar(aoEscolher);
  } finally {
    rodando = false;
    $("varrer").disabled = false;
  }
};

/** Liga os controles da aba Varredura. `tf()` devolve o tempo gráfico atual. */
export const iniciarVarredura = (tf, aoEscolher) => {
  $("varrer").addEventListener("click", () => varrer(tf(), aoEscolher));
  $("so-entradas").addEventListener("change", () => desenhar(aoEscolher));
  $("alertas").addEventListener("change", async (ev) => {
    clearInterval(timer);
    if (!ev.target.checked) return;
    if ("Notification" in window && Notification.permission === "default")
      await Notification.requestPermission();
    if (!("Notification" in window) || Notification.permission !== "granted") {
      $("progresso").textContent =
        "As notificações estão bloqueadas. No iPhone, instale o app na tela inicial antes de ativar.";
    }
    varrer(tf(), aoEscolher);
    timer = setInterval(() => varrer(tf(), aoEscolher), 5 * 60 * 1000);
  });
};

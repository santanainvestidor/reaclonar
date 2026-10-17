// Busca preços nas APIs públicas da Binance (sem chave e sem login).
const FUTUROS = ["https://fapi.binance.com/fapi/v1"];
const SPOT = [
  "https://api.binance.com/api/v3",
  "https://data-api.binance.vision/api/v3",
];

const INTERVALO = { "30m": "30m", "2h": "2h", "4h": "4h", "1D": "1d" };

const buscar = async (bases, caminho) => {
  let erro;
  for (const base of bases) {
    try {
      const r = await fetch(base + caminho, { cache: "no-store" });
      if (r.ok) return await r.json();
      erro = new Error(`HTTP ${r.status} em ${base}${caminho}`);
    } catch (e) {
      erro = e;
    }
  }
  throw erro;
};

/** Candles em ordem cronológica: { time, open, high, low, close, volume }. */
export const candles = async (a, tf, limite = 300) => {
  const linhas = await buscar(
    a.futuro ? FUTUROS : SPOT,
    `/klines?symbol=${a.api}&interval=${INTERVALO[tf]}&limit=${limite}`,
  );
  return linhas.map((k) => ({
    time: k[0],
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4],
    volume: +k[5],
  }));
};

/** Variação de 24 h por mercado: { futuro: Map, spot: Map }, chave = símbolo da API. */
export const tickers = async (simbolosSpot) => {
  const lista = encodeURIComponent(JSON.stringify(simbolosSpot));
  const [f, s] = await Promise.allSettled([
    buscar(FUTUROS, "/ticker/24hr"),
    // Um símbolo fora de listagem derruba o pedido em lote; aí buscamos o mercado todo.
    buscar(SPOT, `/ticker/24hr?symbols=${lista}`).catch(() =>
      buscar(SPOT, "/ticker/24hr"),
    ),
  ]);
  const mapa = (res) =>
    new Map(
      res.status === "fulfilled" ? res.value.map((t) => [t.symbol, t]) : [],
    );
  return { futuro: mapa(f), spot: mapa(s) };
};

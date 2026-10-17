// Regras do indicador SINAL MILIONARIO (painel de confluência), entrada e Fibonacci.
// Mesma lógica da dashboard "Radar de Spread Cripto" e do script Pine.

/** Analisa candles em ordem cronológica: { ind, conf, fib, entrada } ou null. */
export const analisar = (candles, dia, btcDia) => {
  const n = candles.length;
  if (n < 30) return null;
  const H = candles.map((c) => c.high),
    L = candles.map((c) => c.low),
    C = candles.map((c) => c.close),
    V = candles.map((c) => c.volume);
  const ok = (v) => typeof v === "number" && !Number.isNaN(v);
  const nz = (v, d = 0) => (ok(v) ? v : d);
  const win = (x, i, len) =>
    i - len + 1 < 0 ? null : x.slice(i - len + 1, i + 1);
  const smaAt = (x, i, len) => {
    const w = win(x, i, len);
    return w && w.every(ok) ? w.reduce((a, b) => a + b, 0) / len : NaN;
  };
  const sma = (x, len) => x.map((_, i) => smaAt(x, i, len));
  const rec = (x, len, alpha) => {
    const o = [];
    for (let i = 0; i < x.length; i++) {
      const p = i > 0 ? o[i - 1] : NaN;
      o.push(ok(p) ? alpha * x[i] + (1 - alpha) * p : smaAt(x, i, len));
    }
    return o;
  };
  const ema = (x, len) => rec(x, len, 2 / (len + 1));
  const rma = (x, len) => rec(x, len, 1 / len);
  const highest = (x, len) =>
    x.map((_, i) => {
      const w = win(x, i, len);
      return w ? Math.max(...w) : NaN;
    });
  const lowest = (x, len) =>
    x.map((_, i) => {
      const w = win(x, i, len);
      return w ? Math.min(...w) : NaN;
    });
  const barssince = (cond, i) => {
    for (let k = 0; k <= i; k++) if (cond[i - k]) return k;
    return NaN;
  };
  const last = n - 1,
    close = C[last];
  const fmt = (v) =>
    Math.abs(v) >= 1000
      ? v.toFixed(2)
      : Math.abs(v) >= 1
        ? v.toFixed(4)
        : v.toPrecision(5);
  const dir = (v) => (v > 0 ? "Alta" : v < 0 ? "Baixa" : "Neutro");
  const ind = [];

  // 1) Candle diário do ativo (dia em formação)
  const voteCandle = !dia
    ? 0
    : dia.close > dia.open
      ? 1
      : dia.close < dia.open
        ? -1
        : 0;
  ind.push({
    indicador: "Candle diário",
    leitura: dia ? dir(voteCandle) : "Neutro (sem o candle do dia)",
    voto: voteCandle,
    peso: 1,
  });

  // 2) Pivot Point SuperTrend (período 1, fator 1.0, ATR 10)
  const tr = C.map((_, i) =>
    i === 0
      ? H[i] - L[i]
      : Math.max(
          H[i] - L[i],
          Math.abs(H[i] - C[i - 1]),
          Math.abs(L[i] - C[i - 1]),
        ),
  );
  const atr = rma(tr, 10);
  let center = NaN,
    TUp = NaN,
    TDown = NaN,
    Trend = NaN;
  const trends = [];
  for (let i = 0; i < n; i++) {
    let ph = NaN,
      pl = NaN;
    if (i >= 2) {
      if (H[i - 1] > H[i - 2] && H[i - 1] >= H[i]) ph = H[i - 1];
      if (L[i - 1] < L[i - 2] && L[i - 1] <= L[i]) pl = L[i - 1];
    }
    const lastpp = ok(ph) ? ph : pl;
    if (ok(lastpp)) center = ok(center) ? (center * 2 + lastpp) / 3 : lastpp;
    const Up = center - atr[i],
      Dn = center + atr[i];
    const pUp = TUp,
      pDown = TDown,
      pTrend = Trend;
    TUp = i > 0 && C[i - 1] > nz(pUp) ? Math.max(Up, nz(pUp)) : Up;
    TDown = i > 0 && C[i - 1] < nz(pDown) ? Math.min(Dn, nz(pDown)) : Dn;
    Trend = C[i] > nz(pDown) ? 1 : C[i] < nz(pUp) ? -1 : nz(pTrend, 1);
    trends.push(Trend);
  }
  const voteSt = Trend === 1 ? 1 : Trend === -1 ? -1 : 0;
  ind.push({
    indicador: "PP SuperTrend",
    leitura: dir(voteSt),
    voto: voteSt,
    peso: 1,
  });

  // 3) Médias Monster: SMA 9, SMA 21, EMA 50
  const ma9 = sma(C, 9)[last],
    ma21 = sma(C, 21)[last],
    ma50 = ema(C, 50)[last];
  const voteMa =
    ma9 > ma21 && ma21 > ma50 ? 1 : ma9 < ma21 && ma21 < ma50 ? -1 : 0;
  ind.push({
    indicador: "Médias 9/21/50",
    leitura: ok(ma50) ? dir(voteMa) : "Neutro (faltam candles para a EMA 50)",
    voto: voteMa,
    peso: 1,
  });

  // 4) Suporte / Resistência do ZigZag (9) e rompimento (validade 3 barras, 5 pivôs)
  const hh = highest(H, 9),
    ll = lowest(L, 9);
  const toUp = H.map((h, i) => h >= hh[i]),
    toDown = L.map((l, i) => l <= ll[i]);
  const toUpPrev = toUp.map((_, i) => (i > 0 ? toUp[i - 1] : false)),
    toDownPrev = toDown.map((_, i) => (i > 0 ? toDown[i - 1] : false));
  const highs = [NaN, NaN, NaN, NaN, NaN],
    lows = [NaN, NaN, NaN, NaN, NaN];
  const below = (arr, c) => {
    let v = NaN;
    arr.slice(-5).forEach((x) => {
      if (ok(x) && x <= c) v = ok(v) ? Math.max(v, x) : x;
    });
    return v;
  };
  const above = (arr, c) => {
    let v = NaN;
    arr.slice(-5).forEach((x) => {
      if (ok(x) && x >= c) v = ok(v) ? Math.min(v, x) : x;
    });
    return v;
  };
  let zz = 1;
  const sup = [],
    res = [];
  for (let i = 0; i < n; i++) {
    const prev = zz;
    zz = zz === 1 && toDown[i] ? -1 : zz === -1 && toUp[i] ? 1 : zz;
    if (i > 0 && zz !== prev) {
      const su = barssince(toUpPrev, i),
        sd = barssince(toDownPrev, i);
      const lenL = su > 0 ? su : 1,
        lenH = sd > 0 ? sd : 1;
      if (zz === 1)
        lows.push(Math.min(...L.slice(Math.max(0, i - lenL + 1), i + 1)));
      if (zz === -1)
        highs.push(Math.max(...H.slice(Math.max(0, i - lenH + 1), i + 1)));
    }
    sup.push(below(lows, C[i]));
    res.push(above(highs, C[i]));
  }
  const brkUp = C.map((c, i) => i > 0 && ok(res[i - 1]) && c > res[i - 1]);
  const brkDn = C.map((c, i) => i > 0 && ok(sup[i - 1]) && c < sup[i - 1]);
  const bsu = barssince(brkUp, last),
    bsd = barssince(brkDn, last);
  const brkState =
    bsu <= 3 && (!ok(bsd) || bsu < bsd)
      ? 1
      : bsd <= 3 && (!ok(bsu) || bsd < bsu)
        ? -1
        : 0;
  const s = sup[last],
    r = res[last];
  const zone =
    !ok(s) && !ok(r)
      ? 0
      : !ok(r)
        ? 1
        : !ok(s)
          ? -1
          : close - s < r - close
            ? 1
            : r - close < close - s
              ? -1
              : 0;
  const voteSr = brkState !== 0 ? brkState : zone;
  const srTxt =
    brkState === 1
      ? "Rompeu resistência " + fmt(res[last - bsu - 1])
      : brkState === -1
        ? "Rompeu suporte " + fmt(sup[last - bsd - 1])
        : zone === 1
          ? "Suporte " + fmt(s)
          : zone === -1
            ? "Resistência " + fmt(r)
            : "Neutro";
  ind.push({
    indicador: "S/R e Rompimento",
    leitura: srTxt,
    voto: voteSr,
    peso: 1,
  });

  // 5) Ultimate RSI (14, RMA; sinal 14, EMA)
  const up = highest(C, 14),
    lo = lowest(C, 14);
  const diff = C.map((c, i) => {
    const rr = up[i] - lo[i];
    if (i > 0 && up[i] > up[i - 1]) return rr;
    if (i > 0 && lo[i] < lo[i - 1]) return -rr;
    return i > 0 ? c - C[i - 1] : NaN;
  });
  const num = rma(diff, 14),
    den = rma(diff.map(Math.abs), 14);
  const arsi = num.map((v, i) => (v / den[i]) * 50 + 50);
  const sig = ema(arsi, 14);
  const voteRsi = arsi[last] > sig[last] ? 1 : -1;
  ind.push({
    indicador: "Ultimate RSI",
    leitura: dir(voteRsi),
    voto: voteRsi,
    peso: 1,
  });

  // 6) Tendência diária do BTC
  const voteBtc = !btcDia
    ? 0
    : btcDia.close > btcDia.open
      ? 1
      : btcDia.close < btcDia.open
        ? -1
        : 0;
  ind.push({
    indicador: "Tendência BTC (diário)",
    leitura: dir(voteBtc),
    voto: voteBtc,
    peso: 1,
  });

  // 7) Força do volume (14 barras, limiar 10%) com reforço x2 se o volume estiver 20% acima da média
  let comp = 0,
    vend = 0;
  for (let i = Math.max(0, n - 14); i < n; i++) {
    const rg = H[i] - L[i];
    comp += rg > 0 ? (V[i] * (C[i] - L[i])) / rg : V[i] / 2;
    vend += rg > 0 ? (V[i] * (H[i] - C[i])) / rg : V[i] / 2;
  }
  const ratio = comp + vend > 0 ? ((comp - vend) / (comp + vend)) * 100 : 0;
  const voteVol = ratio >= 10 ? 1 : ratio <= -10 ? -1 : 0;
  const volAcima = (i) => {
    const m = smaAt(V, i, 14);
    return m > 0 ? (V[i] / m - 1) * 100 : 0;
  };
  const vsAvg = volAcima(last);
  const peso = voteVol !== 0 && vsAvg >= 20 ? 2 : 1;
  ind.push({
    indicador: "Força do Volume",
    leitura:
      (voteVol === 1 ? "Compra" : voteVol === -1 ? "Venda" : "Neutro") +
      " (" +
      Math.round(ratio) +
      "%)" +
      (peso === 2 ? " x2" : ""),
    voto: voteVol,
    peso,
  });
  ind.push({
    indicador: "Variação do Volume",
    leitura:
      (vsAvg >= 20
        ? "Acima da média"
        : vsAvg <= -20
          ? "Abaixo da média"
          : "Na média") +
      " (" +
      Math.round(vsAvg) +
      "%)",
    voto: 0,
    peso: 0,
  });

  // Confluência (mínimo 4 votos)
  const alta = ind.reduce((t, x) => t + (x.voto === 1 ? x.peso : 0), 0);
  const baixa = ind.reduce((t, x) => t + (x.voto === -1 ? x.peso : 0), 0);
  const total = ind.reduce((t, x) => t + x.peso, 0);
  const estado =
    alta >= 4 && alta > baixa ? 1 : baixa >= 4 && baixa > alta ? -1 : 0;
  const conf = {
    sinal: estado === 1 ? "Alta" : estado === -1 ? "Baixa" : "Aguardar",
    estado,
    votos: estado === 1 ? alta : estado === -1 ? baixa : Math.max(alta, baixa),
    alta,
    baixa,
    total,
    status:
      estado === 0
        ? "Sem confluência"
        : voteCandle === estado
          ? "Confirmado pelo candle diário"
          : "Divergente do candle diário",
  };

  // Fibonacci da última perna
  // Últimos 50 candles, como o fib_len do script Pine.
  const f0 = Math.max(0, n - 50);
  let iH = f0,
    iL = f0;
  for (let i = f0; i < n; i++) {
    if (H[i] > H[iH]) iH = i;
    if (L[i] < L[iL]) iL = i;
  }
  const fAlta = iL < iH,
    rg = H[iH] - L[iL];
  const p0 = fAlta ? H[iH] : L[iL],
    p1 = fAlta ? L[iL] : H[iH];
  const ret = rg > 0 ? ((p0 - close) / (p0 - p1)) * 100 : 0;
  const tt = fAlta ? "alta" : "baixa";
  const fibLeitura =
    ret < 0
      ? `Além do extremo: tendência de ${tt} continuando, alvos em 127,2% e 161,8%`
      : ret <= 38.2
        ? `Retração rasa (até 38,2%): tendência de ${tt} forte`
        : ret <= 61.8
          ? `Dentro da zona 38,2%–61,8%: correção saudável, tendência de ${tt} preservada`
          : ret <= 78.6
            ? "Retração profunda (61,8%–78,6%): atenção, tendência enfraquecendo"
            : `Passou de 78,6%: saiu da Fibonacci, tendência de ${tt} perdendo validade`;
  const fib = {
    tendencia: fAlta ? "Alta" : "Baixa",
    retracao_pct: ret,
    p0,
    p1,
    inicio: f0,
    leitura: fibLeitura,
    continua: ret <= 61.8 ? "Sim" : ret <= 78.6 ? "Atenção" : "Não",
  };

  // Entrada: médias + sinal do SuperTrend no último candle + volume 50% acima da média + RSI fora da zona contrária + confluência mínima 4
  const sinal =
    last > 0 && trends[last] !== trends[last - 1] ? trends[last] : 0;
  const volPct = volAcima(last);
  const volume = volPct >= 50;
  const rsi = arsi[last];
  const rsiZona = !ok(rsi) ? 0 : rsi >= 70 ? 1 : rsi <= 30 ? -1 : 0;
  const lado0 = sinal !== 0 ? sinal : voteMa;
  const rsiOk =
    ok(rsi) &&
    !(lado0 === 1 && rsiZona === 1) &&
    !(lado0 === -1 && rsiZona === -1);
  const confOk = sinal !== 0 && conf.estado === sinal;
  let decisao = "Sem entrada",
    lado = 0;
  if (sinal !== 0 && voteMa === sinal && volume && rsiOk && confOk) {
    lado = sinal;
    decisao = sinal === 1 ? "Entrada de compra" : "Entrada de venda";
  }
  const faltam = [];
  if (sinal === 0) faltam.push("sem sinal novo do SuperTrend no último candle");
  if (sinal !== 0 && voteMa !== sinal)
    faltam.push("médias não alinhadas com o sinal");
  if (sinal !== 0 && !confOk)
    faltam.push(
      `confluência sem 4 votos a favor (${sinal === 1 ? alta : baixa}/${total})`,
    );
  if (!rsiOk)
    faltam.push(
      !ok(rsi)
        ? "RSI sem candles suficientes"
        : rsiZona === 1
          ? "RSI sobrecomprado (" + rsi.toFixed(0) + "), não comprar"
          : "RSI sobrevendido (" + rsi.toFixed(0) + "), não vender",
    );
  if (!volume)
    faltam.push(
      "volume sem aumento de 50% (" + Math.round(volPct) + "% vs média)",
    );
  const entrada = {
    decisao,
    lado,
    medias:
      voteMa === 1
        ? "Alinhadas para alta (9 > 21 > 50)"
        : voteMa === -1
          ? "Alinhadas para baixa (9 < 21 < 50)"
          : "Sem alinhamento",
    supertrend:
      sinal === 1
        ? "Buy no último candle"
        : sinal === -1
          ? "Sell no último candle"
          : Trend === 1
            ? "Em alta, sem sinal novo"
            : "Em baixa, sem sinal novo",
    volume:
      (volume ? "Aumento de " : "Sem aumento suficiente: ") +
      Math.round(volPct) +
      "% vs média de 14",
    rsi: !ok(rsi)
      ? "—"
      : rsi.toFixed(1) +
        (rsiZona === 1
          ? " · sobrecomprado"
          : rsiZona === -1
            ? " · sobrevendido"
            : " · zona neutra (30–70)"),
    confluencia: `${conf.sinal} (${conf.votos}/${conf.total})`,
    permanencia: fib.leitura,
    faltam: faltam.join("; "),
    rsi_valor: rsi,
    vol_pct: volPct,
    conf_votos: conf.votos,
    conf_estado: conf.estado,
    fibo_continua: fib.continua,
    retracao_pct: ret,
  };
  return { ind, conf, fib, entrada };
};

/** Spread do período: recuo do topo, repique do fundo, amplitude e pavios por candle. */
export const spread = (candles) => {
  const hi = Math.max(...candles.map((c) => c.high));
  const lo = Math.min(...candles.map((c) => c.low));
  const close = candles[candles.length - 1].close;
  const media = (f) => candles.reduce((t, c) => t + f(c), 0) / candles.length;
  return {
    recuo: ((hi - close) / hi) * 100,
    repique: ((close - lo) / lo) * 100,
    amplitude: ((hi - lo) / lo) * 100,
    pavioSup: media(
      (c) => ((c.high - Math.max(c.open, c.close)) / c.open) * 100,
    ),
    pavioInf: media(
      (c) => ((Math.min(c.open, c.close) - c.low) / c.open) * 100,
    ),
    corpo: media((c) => (Math.abs(c.close - c.open) / c.open) * 100),
    range: media((c) => ((c.high - c.low) / c.open) * 100),
  };
};

/** Candle diário de hoje (00:00 UTC) montado a partir dos candles intradiários. */
export const diaDe = (candles) => {
  const inicio = new Date();
  inicio.setUTCHours(0, 0, 0, 0);
  const hoje = candles.filter((c) => c.time >= inicio.getTime());
  if (!hoje.length) return null;
  return {
    open: hoje[0].open,
    close: hoje[hoje.length - 1].close,
    high: Math.max(...hoje.map((c) => c.high)),
    low: Math.min(...hoje.map((c) => c.low)),
  };
};

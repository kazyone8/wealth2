// Vercel Serverless Function
// Fetches live prices: VT (VWRA proxy), QQQ (CSNDX proxy), SPY (CSPX proxy), SMH
// Uses 3-method fallback chain: v7 batch → v7 query2 → v8 chart per ticker

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const tickers = ["VT", "QQQ", "SPY", "SMH"];

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://finance.yahoo.com/",
    "Origin": "https://finance.yahoo.com",
  };

  // Method 1 & 2: v7 batch quote
  async function tryV7Batch(base) {
    const url = `https://${base}.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(",")}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChangePercent,marketState,currency`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`v7/${base} HTTP ${r.status}`);
    const data = await r.json();
    const quotes = data?.quoteResponse?.result;
    if (!quotes || quotes.length === 0) throw new Error(`v7/${base} no results`);
    return quotes;
  }

  // Method 3: v8 chart per ticker (parallel, more reliable when v7 is blocked)
  async function tryV8Chart(ticker) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1d&includePrePost=false`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`v8/chart/${ticker} HTTP ${r.status}`);
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) throw new Error(`v8/chart/${ticker} no meta`);
    const prev = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice;
    const changePct = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
    return {
      symbol: ticker,
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketPreviousClose: prev,
      regularMarketChangePercent: changePct,
      currency: meta.currency || "USD",
      marketState: meta.marketState || "CLOSED",
    };
  }

  // Method 4: v8 chart via query2 fallback
  async function tryV8ChartQ2(ticker) {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1d&includePrePost=false`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`v8q2/chart/${ticker} HTTP ${r.status}`);
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) throw new Error(`v8q2/chart/${ticker} no meta`);
    const prev = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice;
    const changePct = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
    return {
      symbol: ticker,
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketPreviousClose: prev,
      regularMarketChangePercent: changePct,
      currency: meta.currency || "USD",
      marketState: meta.marketState || "CLOSED",
    };
  }

  const errors = [];

  try {
    let quotes = null;
    let method = "";

    // Try v7 batch (query1)
    try {
      quotes = await tryV7Batch("query1");
      method = "v7/query1";
    } catch (e1) {
      errors.push(e1.message);
    }

    // Try v7 batch (query2)
    if (!quotes) {
      try {
        quotes = await tryV7Batch("query2");
        method = "v7/query2";
      } catch (e2) {
        errors.push(e2.message);
      }
    }

    // Try v8 chart per ticker (query1) in parallel
    if (!quotes) {
      try {
        quotes = await Promise.all(tickers.map(t => tryV8Chart(t)));
        method = "v8/chart/query1";
      } catch (e3) {
        errors.push(e3.message);
      }
    }

    // Try v8 chart per ticker (query2) in parallel
    if (!quotes) {
      try {
        quotes = await Promise.all(tickers.map(t => tryV8ChartQ2(t)));
        method = "v8/chart/query2";
      } catch (e4) {
        errors.push(e4.message);
        throw new Error(`All methods failed: ${errors.join(" | ")}`);
      }
    }

    // Build result
    const raw = {};
    for (const q of quotes) {
      const changePct = typeof q.regularMarketChangePercent === "number"
        ? q.regularMarketChangePercent
        : parseFloat(q.regularMarketChangePercent) || 0;
      raw[q.symbol] = {
        price: q.regularMarketPrice,
        previousClose: q.regularMarketPreviousClose,
        change: changePct.toFixed(2),
        currency: q.currency || "USD",
        marketState: q.marketState || "CLOSED",
        timestamp: new Date().toISOString(),
      };
    }

    const mapped = {
      VWRA:  raw["VT"]  || null,
      CSNDX: raw["QQQ"] || null,
      CSPX:  raw["SPY"] || null,
      SMH:   raw["SMH"] || null,
    };

    return res.status(200).json({
      success: true,
      prices: mapped,
      proxies: { VWRA: "VT", CSNDX: "QQQ", CSPX: "SPY", SMH: "SMH" },
      method,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

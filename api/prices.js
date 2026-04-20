// Vercel Serverless Function
// Fetches live prices: VT (VWRA proxy), QQQ (CSNDX proxy), SPY (CSPX proxy), SMH

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const tickers = ["VT", "QQQ", "SPY", "SMH"];

  // Yahoo Finance v7 quote — single batch request, more reliable than v8 chart
  const buildUrl = (base) =>
    `https://${base}.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(",")}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChangePercent,marketState,currency`;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
  };

  try {
    // Try query1 first, fall back to query2
    let response = await fetch(buildUrl("query1"), { headers });
    if (!response.ok) {
      response = await fetch(buildUrl("query2"), { headers });
    }
    if (!response.ok) {
      throw new Error(`Yahoo Finance HTTP ${response.status}`);
    }

    const data = await response.json();
    const quotes = data?.quoteResponse?.result;

    if (!quotes || quotes.length === 0) {
      throw new Error("No data returned from Yahoo Finance");
    }

    // Index by ticker symbol
    const raw = {};
    for (const q of quotes) {
      raw[q.symbol] = {
        price: q.regularMarketPrice,
        previousClose: q.regularMarketPreviousClose,
        change: q.regularMarketChangePercent?.toFixed(2),
        currency: q.currency || "USD",
        marketState: q.marketState, // REGULAR, PRE, POST, CLOSED
        timestamp: new Date().toISOString(),
      };
    }

    // Map proxy tickers → ETF names (UI keeps CSNDX/CSPX headers)
    const mapped = {
      VWRA:  raw["VT"]  || null,  // VT  = FTSE All-World proxy for VWRA
      CSNDX: raw["QQQ"] || null,  // QQQ = Nasdaq 100 proxy for CSNDX
      CSPX:  raw["SPY"] || null,  // SPY = S&P 500 proxy for CSPX
      SMH:   raw["SMH"] || null,  // SMH = direct match
    };

    return res.status(200).json({
      success: true,
      prices: mapped,
      proxies: { VWRA: "VT", CSNDX: "QQQ", CSPX: "SPY", SMH: "SMH" },
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

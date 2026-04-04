// Vercel Serverless Function — fetches live prices from Yahoo Finance
// Tickers: VT (proxy VWRA), QQQ (proxy CSNDX), SPY (proxy CSPX/was CSPX), SMH

export default async function handler(req, res) {
  // Allow CORS from your frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const tickers = ["VT", "QQQ", "SPY", "SMH"];

  try {
    const results = {};

    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0",
              "Accept": "application/json",
            },
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          const meta = data?.chart?.result?.[0]?.meta;

          if (meta) {
            results[ticker] = {
              price: meta.regularMarketPrice || meta.previousClose,
              previousClose: meta.previousClose,
              change: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
              currency: meta.currency,
              marketState: meta.marketState, // REGULAR, PRE, POST, CLOSED
              timestamp: new Date().toISOString(),
            };
          }
        } catch (e) {
          results[ticker] = { error: e.message };
        }
      })
    );

    // Map proxy tickers back to your ETF names
    const mapped = {
      VWRA:  results["VT"]  || null,  // VT = FTSE All-World proxy for VWRA
      CSNDX: results["QQQ"] || null,  // QQQ = Nasdaq 100 proxy for CSNDX
      CSPX:  results["SPY"] || null,  // SPY = S&P 500 (replacing CSPX as requested)
      SMH:   results["SMH"] || null,  // SMH = direct match
    };

    res.status(200).json({
      success: true,
      prices: mapped,
      note: "VWRA=VT proxy, CSNDX=QQQ proxy, CSPX=SPY (as requested)",
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

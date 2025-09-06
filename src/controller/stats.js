import express from "express";

import Instrument52WeekStats from "../schema/instrument52WStats.js";
import {
  calculateIncrementalEMA, calculate52WeekHighLow,
  calculateEMA, calculateAverageVolume,
} from "../utils/index.js";

const router = express.Router();

router.post("/sync-52week-stats", async (req, res) => {
  const stocks = niftymidsmall400;

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return res.status(400).json({ error: "Invalid or empty stocks input" });
  }

  try {
    await sequelize.sync();

    const endDate = moment().format("YYYY-MM-DD");
    const startDate = moment().subtract(1, "years").format("YYYY-MM-DD");

    for (const instrument of stocks) {
      try {
        const instrumentKeyEncoded = encodeURIComponent(instrument.instrument_key);
        const url = `https://api.upstox.com/v3/historical-candle/${instrumentKeyEncoded}/days/1/${endDate}/${startDate}`;
        const headers = { Accept: "application/json" };

        const response = await axios.get(url, { headers });
        const candles = response.data?.data?.candles || [];

        if (candles.length === 0) {
          continue;
        }

        const { high, low } = calculate52WeekHighLow(candles);

        const ema10 = calculateEMA(candles.slice(-10), 10);
        const ema21 = calculateEMA(candles.slice(-21), 21);
        const ema50 = calculateEMA(candles.slice(-50), 50);

        const avgVolume21d = calculateAverageVolume(candles, 21);

        await Instrument52WeekStats.upsert({
          instrumentKey: instrument.instrument_key,
          tradingsymbol: instrument.tradingsymbol,
          lastSyncDate: endDate,
          fiftyTwoWeekHigh: high,
          fiftyTwoWeekLow: low,
          lastPrice: candles[0][4],
          ema10,
          ema21,
          ema50,
          avgVolume21d,
          lastUpdated: new Date()
        });

      } catch (e) {
        console.error(`Failed to process instrument ${instrument.instrument_key}:`, e.message);
      }
    }

    res.json({ message: "52-week stats synced successfully." });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync 52-week stats." });
  }
});

router.post("/sync-daily-all", async (req, res) => {
  const stocks = niftymidsmall400;

  for (const instrument of stocks) {
    try {
      // Fetch intraday candle for today
      const urlToday = `https://api.upstox.com/v3/historical-candle/intraday/${encodeURIComponent(instrument.instrument_key)}/days/1`;
      const responseToday = await axios.get(urlToday, { headers: { "Accept": "application/json" } });
      let todayCandle = responseToday.data?.data?.candles || [];

      // Fallback: if intraday data empty, fetch historical daily candle for last 1 day
      if (todayCandle.length === 0) {
        console.warn(`No intraday candle for ${instrument.instrument_key}, fetching historical daily candle.`);

        const endDate = moment().format("YYYY-MM-DD");
        const startDate = endDate; // for a single day

        const urlHistorical = `https://api.upstox.com/v3/historical-candle/${encodeURIComponent(instrument.instrument_key)}/days/1/${startDate}/${endDate}`;
        const responseHistorical = await axios.get(urlHistorical, { headers: { "Accept": "application/json" } });
        todayCandle = responseHistorical.data?.data?.candles || [];

        if (todayCandle.length === 0) {
          console.warn(`No historical candle available for ${instrument.instrument_key} as fallback.`);
          continue; // skip this instrument as no data is available
        }
      }

      const closePrice = todayCandle[0][4];

      const previousStats = await Instrument52WeekStats.findOne({
        where: { instrumentKey: instrument.instrument_key }
      });

      const ema10 = calculateIncrementalEMA(previousStats?.ema_10, closePrice, 10);
      const ema21 = calculateIncrementalEMA(previousStats?.ema_21, closePrice, 21);
      const ema50 = calculateIncrementalEMA(previousStats?.ema_50, closePrice, 50);

      const todayHigh = todayCandle[0][2];
      const todayLow = todayCandle[0][3];
      let fifty_two_week_high = todayHigh;
      let fifty_two_week_low = todayLow;

      if (previousStats) {
        if (previousStats.fifty_two_week_high > fifty_two_week_high) {
          fifty_two_week_high = previousStats.fifty_two_week_high;
        }
        if (previousStats.fifty_two_week_low < fifty_two_week_low) {
          fifty_two_week_low = previousStats.fifty_two_week_low;
        }
      }

      await Instrument52WeekStats.upsert({
        instrumentKey: instrument.instrument_key,
        tradingsymbol: instrument.tradingsymbol,
        lastSyncDate: moment().format("YYYY-MM-DD"),
        fiftyTwoWeekHigh: fifty_two_week_high,
        fiftyTwoWeekLow: fifty_two_week_low,
        lastPrice: closePrice,
        ema10,
        ema21,
        ema50,
        lastUpdated: new Date(),
      });
    }
    catch (e) {
      console.error(`Error for ${instrument.instrument_key}:`, e.message);
    }
  }

  res.json({ message: "processed successfully." });
});

router.get("/stats/all", async (req, res) => {
  try {
    const allStats = await Instrument52WeekStats.findAll({
      order: [["instrument_key", "ASC"]]
    });

    const statsMap = allStats.reduce((map, stat) => {
      map[stat.instrumentKey] = stat;
      return map;
    }, {});

    res.json({
      status: "success",
      data: statsMap
    });
  } catch (error) {
    console.error("Failed to fetch all stats:", error);
    res.status(500).json({ error: "Failed to retrieve instrument stats" });
  }
});

export default router;
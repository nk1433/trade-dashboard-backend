import express from 'express';
import axios from 'axios';
import { sequelize } from './database/index.js';
import Instrument52WeekStats from './schema/instrument52WStats.js';
import niftymidsmall400 from './index/niftymidsmall400.json' with { type: "json" };
import moment from "moment";
import {
  calculateIncrementalEMA, calculate52WeekHighLow,
  calculateEMA, calculateAverageVolume,
  calculatePctChange5Days,
} from './utils/index.js';
import cors from 'cors';
import MarketBreadth from './schema/marketBreath.js';

const app = express();
app.use(cors())
app.use(express.json());

app.post('/sync-52week-stats', async (req, res) => {
  const stocks = niftymidsmall400;

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty stocks input' });
  }

  try {
    await sequelize.sync();

    const endDate = moment().format("YYYY-MM-DD");
    const startDate = moment().subtract(1, "years").format("YYYY-MM-DD");

    for (const instrument of stocks) {
      try {
        const instrumentKeyEncoded = encodeURIComponent(instrument.instrument_key);
        const url = `https://api.upstox.com/v3/historical-candle/${instrumentKeyEncoded}/days/1/${endDate}/${startDate}`;
        const headers = { Accept: 'application/json' };

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

    res.json({ message: '52-week stats synced successfully.' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync 52-week stats.' });
  }
});

app.post('/sync-52week-marketbreath', async (req, res) => {
  const stocks = niftymidsmall400;

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty stocks input' });
  }

  const dateMap = new Map();

  try {
    await sequelize.sync();

    const endDate = moment().format("YYYY-MM-DD");
    const startDate = moment().subtract(1, "years").format("YYYY-MM-DD");
    
    const batchSize = 50;
    const totalBatches = Math.ceil(stocks.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = stocks.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

      await Promise.all(batch.map(async (instrument) => {
        try {
          const instrumentKeyEncoded = encodeURIComponent(instrument.instrument_key);
          const url = `https://api.upstox.com/v3/historical-candle/${instrumentKeyEncoded}/days/1/${endDate}/${startDate}`;
          const headers = { Accept: 'application/json' };

          const response = await axios.get(url, { headers });
          const candles = response.data?.data?.candles || [];

          if (candles.length === 0) return;

          // Compute 5-day pct changes
          const pctChange5dMap = calculatePctChange5Days(candles);

          // Process each candle for daily 4% breadth
          for (const candle of candles) {
            const date = candle[0].split('T')[0];
            const open = candle[1];
            const close = candle[4];
            const pctChange = ((close - open) / open) * 100;

            if (!dateMap.has(date)) {
              dateMap.set(date, {
                upCount: 0,
                downCount: 0,
                total: 0,
                up20Count: 0,
                down20Count: 0,
              });
            }

            const dayStats = dateMap.get(date);
            dayStats.total++;

            // 4% breadth counts
            if (pctChange >= 4) dayStats.upCount++;
            else if (pctChange <= -4) dayStats.downCount++;

            // 20% breadth counts over 5 days (if date is in pctChange5dMap)
            const pctChange5d = pctChange5dMap.get(date);
            if (pctChange5d !== undefined) {
              if (pctChange5d >= 20) dayStats.up20Count++;
              else if (pctChange5d <= -20) dayStats.down20Count++;
            }
          }
        } catch (e) {
          console.error(`Failed to process instrument ${instrument.instrument_key}:`, e.message);
        }
      }));

      // Wait 10 seconds to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // After processing all batches, upsert daily market breadth stats
    for (const [date, stats] of dateMap.entries()) {
      await MarketBreadth.upsert({
        date,
        up4Percent: stats.upCount,
        down4Percent: stats.downCount,
        totalStocks: stats.total,
        up20Pct5d: stats.up20Count || 0,
        down20Pct5d: stats.down20Count || 0,
      });
    }

    res.json({ message: '52-week breadth synced successfully.' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync 52-week breadth.' });
  }
});

app.post('/sync-daily-all', async (req, res) => {
  const stocks = niftymidsmall400;

  for (const instrument of stocks) {
    try {
      const urlToday = `https://api.upstox.com/v3/historical-candle/intraday/${encodeURIComponent(instrument.instrument_key)}/days/1`;
      const responseToday = await axios.get(urlToday, { headers: { 'Accept': 'application/json' } });
      const todayCandle = responseToday.data?.data?.candles || [];
      if (todayCandle.length === 0) {
        console.warn(`No daily candle for ${instrument.instrument_key}`);
        continue;
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
        lastSyncDate: moment().format('YYYY-MM-DD'),
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

  res.json({ message: 'processed successfully.' });
});

app.get('/stats/all', async (req, res) => {
  try {
    const allStats = await Instrument52WeekStats.findAll({
      order: [['instrument_key', 'ASC']]
    });

    const statsMap = allStats.reduce((map, stat) => {
      map[stat.instrumentKey] = stat;
      return map;
    }, {});

    res.json({
      status: 'success',
      data: statsMap
    });
  } catch (error) {
    console.error('Failed to fetch all stats:', error);
    res.status(500).json({ error: 'Failed to retrieve instrument stats' });
  }
});

app.get('/market-breadth', async (req, res) => {
  try {
    const breadthData = await MarketBreadth.findAll({
      order: [['date', 'DESC']]
    });

    res.json({
      status: 'success',
      data: breadthData
    });
  } catch (error) {
    console.error('Failed to fetch market breadth:', error);
    res.status(500).json({ error: 'Failed to retrieve market breadth data' });
  }
});

// TODO: Create daily sync endpoint for market breadth

const PORT = 3015;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

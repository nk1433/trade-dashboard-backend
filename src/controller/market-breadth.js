import axios from "axios";
import express from "express";
import moment from "moment";

// import { sequelize } from "../database/index.js";
// import niftymidsmall400 from "../index/niftymidsmall400.json" with { type: 'json' };
// import MarketBreadth from "../schema/marketBreath.js";
// import { calculatePctChange5Days } from "../utils/index.js";

const router = express.Router();

// router.post("/sync-52week-marketbreath", async (req, res) => {
//   const stocks = niftymidsmall400;

//   if (!Array.isArray(stocks) || stocks.length === 0) {
//     return res.status(400).json({ error: "Invalid or empty stocks input" });
//   }

//   const dateMap = new Map();

//   try {
//     await sequelize.sync();

//     const endDate = moment().format("YYYY-MM-DD");
//     const startDate = moment().subtract(1, "years").format("YYYY-MM-DD");
    
//     const batchSize = 50;
//     const totalBatches = Math.ceil(stocks.length / batchSize);

//     for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
//       const batch = stocks.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

//       await Promise.all(batch.map(async (instrument) => {
//         try {
//           const instrumentKeyEncoded = encodeURIComponent(instrument.instrument_key);
//           const url = `https://api.upstox.com/v3/historical-candle/${instrumentKeyEncoded}/days/1/${endDate}/${startDate}`;
//           const headers = { Accept: "application/json" };

//           const response = await axios.get(url, { headers });
//           const candles = response.data?.data?.candles || [];

//           if (candles.length === 0) {return;}

//           const pctChange5dMap = calculatePctChange5Days(candles);

//           for (const candle of candles) {
//             const date = candle[0].split("T")[0];
//             const open = candle[1];
//             const close = candle[4];
//             const pctChange = ((close - open) / open) * 100;

//             if (!dateMap.has(date)) {
//               dateMap.set(date, {
//                 upCount: 0,
//                 downCount: 0,
//                 total: 0,
//                 up20Count: 0,
//                 down20Count: 0,
//               });
//             }

//             const dayStats = dateMap.get(date);
//             dayStats.total++;

//             if (pctChange >= 4) {dayStats.upCount++;}
//             else if (pctChange <= -4) {dayStats.downCount++;}

//             const pctChange5d = pctChange5dMap.get(date);
//             if (pctChange5d !== undefined) {
//               if (pctChange5d >= 20) {dayStats.up20Count++;}
//               else if (pctChange5d <= -20) {dayStats.down20Count++;}
//             }
//           }
//         } catch (e) {
//           console.error(`Failed to process instrument ${instrument.instrument_key}:`, e.message);
//         }
//       }));

//       await new Promise(resolve => setTimeout(resolve, 10000));
//     }

//     for (const [date, stats] of dateMap.entries()) {
//       // TODO: Add column no.of.stocks which are up by +-25% in quater
//       // TODO: Add column no.of.stocks which are up by +-25% in month
//       // TODO: Add column no.of.stocks which are up by +-13% in 34 days
//       await MarketBreadth.upsert({
//         date,
//         up4Percent: stats.upCount,
//         down4Percent: stats.downCount,
//         totalStocks: stats.total,
//         up20Pct5d: stats.up20Count || 0,
//         down20Pct5d: stats.down20Count || 0,
//       });
//     }

//     res.json({ message: "52-week breadth synced successfully." });
//   } catch (error) {
//     console.error("Sync error:", error);
//     res.status(500).json({ error: "Failed to sync 52-week breadth." });
//   }
// });

// router.post("/sync-daily-market-breadth", async (req, res) => {
//   const stocks = niftymidsmall400;

//   if (!Array.isArray(stocks) || stocks.length === 0) {
//     return res.status(400).json({ error: "Invalid or empty stocks input" });
//   }

//   const dateMap = new Map();

//   try {
//     await sequelize.sync();

//     // Get last synced date from MarketBreadth
//     const lastRecord = await MarketBreadth.findOne({
//       order: [["date", "DESC"]],
//     });

//     const lastSyncedDate = lastRecord ? moment(lastRecord.date) : null;
//     const todayDate = moment().format("YYYY-MM-DD");

//     // Start date is next day after last synced date or fallback to 10 days ago
//     let startDate;
//     if (lastSyncedDate && lastSyncedDate.isValid()) {
//       startDate = lastSyncedDate.add(1, "days").format("YYYY-MM-DD");
//     } else {
//       startDate = moment().subtract(10, "days").format("YYYY-MM-DD");
//     }

//     // If startDate is after today, nothing to sync
//     if (moment(startDate).isAfter(todayDate)) {
//       return res.json({ message: "Market breadth already up-to-date." });
//     }

//     const batchSize = 50;
//     const totalBatches = Math.ceil(stocks.length / batchSize);

//     for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
//       const batch = stocks.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

//       await Promise.all(batch.map(async (instrument) => {
//         try {
//           const instrumentKeyEncoded = encodeURIComponent(instrument.instrument_key);
//           const url = `https://api.upstox.com/v3/historical-candle/${instrumentKeyEncoded}/days/1/${todayDate}/${startDate}`;
//           const headers = { Accept: "application/json" };

//           const response = await axios.get(url, { headers });
//           const candles = response.data?.data?.candles || [];

//           if (candles.length === 0) {return;}

//           const pctChange5dMap = calculatePctChange5Days(candles.slice(0, 5));

//           // Process each candle
//           for (const candle of candles) {
//             const date = candle[0].split("T")[0];
//             const open = candle[1];
//             const close = candle[4];
//             const pctChange = ((close - open) / open) * 100;

//             if (!dateMap.has(date)) {
//               dateMap.set(date, {
//                 upCount: 0,
//                 downCount: 0,
//                 total: 0,
//                 up20Count: 0,
//                 down20Count: 0,
//               });
//             }

//             const dayStats = dateMap.get(date);
//             dayStats.total++;

//             if (pctChange >= 4) {dayStats.upCount++;}
//             else if (pctChange <= -4) {dayStats.downCount++;}

//             const pctChange5d = pctChange5dMap.get(date);
//             if (pctChange5d !== undefined) {
//               if (pctChange5d >= 20) {dayStats.up20Count++;}
//               else if (pctChange5d <= -20) {dayStats.down20Count++;}
//             }
//           }
//         } catch (e) {
//           console.error(`Failed to process instrument ${instrument.instrument_key}:`, e.message);
//         }
//       }));

//       // Optional delay to avoid API limits
//       await new Promise(resolve => setTimeout(resolve, 5000));
//     }

//     // Upsert aggregated stats
//     for (const [date, stats] of dateMap.entries()) {
//       await MarketBreadth.upsert({
//         date,
//         up4Percent: stats.upCount,
//         down4Percent: stats.downCount,
//         totalStocks: stats.total,
//         up20Pct5d: stats.up20Count || 0,
//         down20Pct5d: stats.down20Count || 0,
//       });
//     }

//     res.json({ message: "Daily market breadth synced successfully." });
//   } catch (error) {
//     console.error("Sync error:", error);
//     res.status(500).json({ error: "Failed to sync daily market breadth." });
//   }
// });

// router.get("/market-breadth", async (req, res) => {
//   try {
//     const breadthData = await MarketBreadth.findAll({
//       order: [["date", "DESC"]]
//     });

//     res.json({
//       status: "success",
//       data: breadthData
//     });
//   } catch (error) {
//     console.error("Failed to fetch market breadth:", error);
//     res.status(500).json({ error: "Failed to retrieve market breadth data" });
//   }
// });

export default router;
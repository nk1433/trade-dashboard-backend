import express from "express";
import moment from "moment";
import axios from "axios";

import Instrument52WeekStats from "../schema/RDB/instrument52WStats.js";
import {
    calculateIncrementalEMA, calculate52WeekHighLow,
    calculateEMA, calculateAverageVolume, calculateAverageValueVolume,
    calculateAverageClose,
} from "../utils/index.js";
import dbWrapper from '../utils/dbWrapper.js';
import niftymidsmall400 from '../index/niftymidsmall400.json' with { type: 'json' };
import niftylargeCap from '../index/niftylargecap.json' with { type: 'json' };
import { sync52WeekStats } from "../services/statsService.js";

const router = express.Router();

router.post("/sync-52week-stats", async (req, res) => {
    try {
        await sync52WeekStats();
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

            const data = {
                instrumentKey: instrument.instrument_key,
                tradingsymbol: instrument.tradingsymbol,
                lastSyncDate: moment().format("YYYY-MM-DD"),
                fiftyTwoWeekHigh: fifty_two_week_high,
                fiftyTwoWeekLow: fifty_two_week_low,
                lastPrice: closePrice,
                ema10,
                ema21,
                ema50,
                avgVolume21d: previousStats?.avgVolume21d,
                avgVolume1w: previousStats?.avgVolume1w,
                prevDayVolume: todayCandle[0][5],
                lastUpdated: new Date()
            };

            await dbWrapper.upsertInstrument52WeekStats(data);
        }
        catch (e) {
            console.error(`Error for ${instrument.instrument_key}:`, e.message);
        }
    }

    res.json({ message: "processed successfully." });
});

import verifyToken from "../middleware/authMiddleware.js";

router.get("/stats/all", verifyToken, async (req, res) => {
    try {
        const allStats = await dbWrapper.getAllInstrument52WeekStats();

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
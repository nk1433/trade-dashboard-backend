import express from "express";
import dbWrapper from "../utils/dbWrapper.js";
import moment from "moment";
import axios from "axios";
import verifyToken from "../middleware/authMiddleware.js";
import niftymidsmall400 from '../index/niftymidsmall400.json' with { type: 'json' };

const router = express.Router();

router.use(verifyToken);

const fetchWithRetry = async (url, headers, retries = 3, delay = 1000) => {
    try {
        return await axios.get(url, { headers });
    } catch (err) {
        if (err.response && err.response.status === 429 && retries > 0) {
            console.warn(`[5d Moves] Rate limited (429) for ${url}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, headers, retries - 1, delay * 2);
        }
        throw err;
    }
};

router.get("/compute-five-day-moves", async (req, res) => {
    try {
        const token = await dbWrapper.getTokenFromDB();
        const headers = {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        };
        
        const endDate = moment().format("YYYY-MM-DD");
        const startDate = moment().subtract(15, "days").format("YYYY-MM-DD");
        
        const batchSize = 3;
        const totalBatches = Math.ceil(niftymidsmall400.length / batchSize);
        const up8Pct5d = [];
        const down8Pct5d = [];
        const up20Pct5d = [];
        const down20Pct5d = [];
        
        for (let i = 0; i < totalBatches; i++) {
            const batch = niftymidsmall400.slice(i * batchSize, (i + 1) * batchSize);
            await Promise.all(batch.map(async (stock) => {
                try {
                    const instrumentKeyEncoded = encodeURIComponent(stock.instrument_key);
                    const url = `https://api.upstox.com/v3/historical-candle/${instrumentKeyEncoded}/days/1/${endDate}/${startDate}`;
                    const response = await fetchWithRetry(url, headers, 3, 500);
                    const candles = response.data?.data?.candles || [];
                    if (candles.length >= 6) {
                        const closeToday = candles[0][4];
                        const close5dAgo = candles[5][4];
                        const pctChange = ((closeToday - close5dAgo) / close5dAgo) * 100;
                        
                        const item = {
                            symbol: stock.instrument_key,
                            tradingSymbol: stock.tradingsymbol,
                            price: closeToday,
                            pctChange: parseFloat(pctChange.toFixed(2))
                        };
                        
                        if (pctChange >= 20) {
                            up20Pct5d.push(item);
                        } else if (pctChange <= -20) {
                            down20Pct5d.push(item);
                        }
                        
                        if (pctChange >= 8) {
                            up8Pct5d.push(item);
                        } else if (pctChange <= -8) {
                            down8Pct5d.push(item);
                        }
                    }
                } catch (err) {
                    console.error(`Error computing moves for ${stock.tradingsymbol}:`, err.message, err.response?.data || '');
                }
            }));
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`[5d Moves] Computation complete. up8: ${up8Pct5d.length}, down8: ${down8Pct5d.length}, up20: ${up20Pct5d.length}, down20: ${down20Pct5d.length}`);
        
        res.json({
            status: "success",
            data: {
                up8Pct5d,
                down8Pct5d,
                up20Pct5d,
                down20Pct5d
            }
        });
    } catch (error) {
        console.error("Error computing five day moves:", error);
        res.status(500).json({ error: "Failed to compute five day moves" });
    }
});

router.get("/", async (req, res) => {
    try {
        const { scanType, date } = req.query;

        // Default to today if date is not provided
        const queryDate = date || moment().format("YYYY-MM-DD");

        const scans = await dbWrapper.getScans(scanType, queryDate);

        if (scanType === 'newHigh') {
            scans.sort((a, b) => {
                const countA = a.extraData?.newHighCount || 0;
                const countB = b.extraData?.newHighCount || 0;
                return countB - countA;
            });
        }

        res.json({
            status: "success",
            data: scans,
            meta: {
                date: queryDate,
                scanType: scanType || "all",
                count: scans.length
            }
        });
    } catch (error) {
        console.error("Error fetching scans:", error);
        res.status(500).json({ error: "Failed to fetch scans" });
    }
});

export default router;

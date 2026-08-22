import express from "express";
import dbWrapper from "../utils/dbWrapper.js";
import moment from "moment";
import axios from "axios";
import verifyToken from "../middleware/authMiddleware.js";
import niftymidsmall400 from '../index/niftymidsmall400.json' with { type: 'json' };
import { get52WeekStatsMap } from "../utils/scans.js";

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
        const queryDate = req.query.date || moment().format("YYYY-MM-DD");
        
        const token = await dbWrapper.getTokenFromDB();
        const headers = {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        };
        
        const endDate = queryDate;
        const startDate = moment(queryDate).subtract(15, "days").format("YYYY-MM-DD");
        
        const batchSize = 3;
        const totalBatches = Math.ceil(niftymidsmall400.length / batchSize);
        const up8Pct5d = [];
        const down8Pct5d = [];
        const up20Pct5d = [];
        const down20Pct5d = [];
        const historicalHighs = {};
        
        for (let i = 0; i < totalBatches; i++) {
            const batch = niftymidsmall400.slice(i * batchSize, (i + 1) * batchSize);
            await Promise.all(batch.map(async (stock) => {
                try {
                    const instrumentKeyEncoded = encodeURIComponent(stock.instrument_key);
                    const url = `https://api.upstox.com/v3/historical-candle/${instrumentKeyEncoded}/days/1/${endDate}/${startDate}`;
                    const response = await fetchWithRetry(url, headers, 3, 500);
                    const candles = response.data?.data?.candles || [];
                    if (candles.length >= 6) {
                        const slice = candles.slice(0, 6);
                        const closeToday = slice[0][4];
                        const close5dAgo = slice[5][4];
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
                        
                        // Calculate max highs for the last 3 and 5 days
                        const max3d = Math.max(...candles.slice(0, 3).map(c => c[2]));
                        const max5d = Math.max(...candles.slice(0, 5).map(c => c[2]));
                        
                        historicalHighs[stock.instrument_key] = {
                            max3d: parseFloat(max3d.toFixed(2)),
                            max5d: parseFloat(max5d.toFixed(2))
                        };
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
                down20Pct5d,
                historicalHighs
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

router.get("/performance", async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 5;

        // Get unique dates sorted descending
        const uniqueDates = await dbWrapper.getUniqueScanDates();
        
        // Find the Nth most recent date (if possible)
        const targetDateIndex = Math.min(days - 1, uniqueDates.length - 1);
        if (targetDateIndex < 0) {
             return res.json({ status: "success", data: [], meta: { message: "No historical scans found" } });
        }
        
        const targetDate = uniqueDates[targetDateIndex];
        
        // Fetch scans for that specific date
        const scans = await dbWrapper.getScansByDate(targetDate);
        
        // Fetch current live prices from 52WeekStatsMap
        const statsMap = await get52WeekStatsMap();
        
        // Group by scanType and calculate performance
        const performanceMap = {};
        
        for (const scan of scans) {
            const type = scan.scanType;
            if (!performanceMap[type]) {
                performanceMap[type] = {
                    scanType: type,
                    totalSignals: 0,
                    winningSignals: 0,
                    totalReturn: 0,
                    maxReturn: -Infinity,
                    minReturn: Infinity,
                    signals: []
                };
            }
            
            const scanPrice = scan.extraData?.currentPrice;
            const currentStats = statsMap[scan.symbol];
            const currentPrice = currentStats?.lastPrice;
            
            if (scanPrice && currentPrice) {
                const pctReturn = ((currentPrice - scanPrice) / scanPrice) * 100;
                
                performanceMap[type].totalSignals++;
                performanceMap[type].totalReturn += pctReturn;
                
                if (pctReturn > 0) performanceMap[type].winningSignals++;
                if (pctReturn > performanceMap[type].maxReturn) performanceMap[type].maxReturn = pctReturn;
                if (pctReturn < performanceMap[type].minReturn) performanceMap[type].minReturn = pctReturn;
                
                performanceMap[type].signals.push({
                    symbol: scan.symbol,
                    tradingSymbol: scan.tradingSymbol,
                    date: scan.date,
                    scanPrice: scanPrice,
                    currentPrice: currentPrice,
                    pctReturn: parseFloat(pctReturn.toFixed(2))
                });
            }
        }
        
        // Finalize stats formatting
        const results = Object.values(performanceMap).map(stats => {
            const avgReturn = stats.totalSignals > 0 ? stats.totalReturn / stats.totalSignals : 0;
            const winRate = stats.totalSignals > 0 ? (stats.winningSignals / stats.totalSignals) * 100 : 0;
            
            return {
                scanType: stats.scanType,
                totalSignals: stats.totalSignals,
                winRate: parseFloat(winRate.toFixed(2)),
                avgReturn: parseFloat(avgReturn.toFixed(2)),
                maxReturn: stats.maxReturn !== -Infinity ? parseFloat(stats.maxReturn.toFixed(2)) : 0,
                minReturn: stats.minReturn !== Infinity ? parseFloat(stats.minReturn.toFixed(2)) : 0,
                signals: stats.signals.sort((a, b) => b.pctReturn - a.pctReturn)
            };
        });
        
        res.json({
            status: "success",
            data: results,
            meta: {
                targetDate,
                daysRequested: days,
                actualDaysBack: targetDateIndex + 1
            }
        });

    } catch (error) {
        console.error("Error computing scan performance:", error);
        res.status(500).json({ error: "Failed to compute scan performance" });
    }
});

export default router;

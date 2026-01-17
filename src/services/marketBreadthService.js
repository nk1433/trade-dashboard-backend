import axios from "axios";
import moment from "moment";
import universe from "../index/universe.json" with { type: 'json' };
import { calculatePctChange5Days } from "../utils/index.js";
import dbWrapper from '../utils/dbWrapper.js';

export const sync52WeekMarketBreadth = async (fullSync = false) => {
    const stocks = universe;

    if (!Array.isArray(stocks) || stocks.length === 0) {
        throw new Error("Invalid or empty stocks input");
    }

    console.log("Starting 52-week market breadth sync...");

    // Fetch 52-week stats to get 52WL for each instrument
    const all52WStats = await dbWrapper.getAllInstrument52WeekStats();
    const fiftyTwoWeekLowMap = new Map();
    if (all52WStats && Array.isArray(all52WStats)) {
        all52WStats.forEach(stat => {
            // Handle both Mongoose doc and Sequelize object
            const instrumentKey = stat.instrumentKey || stat.instrument_key; // Standardize key access
            const fiftyTwoWeekLow = stat.fiftyTwoWeekLow !== undefined ? parseFloat(stat.fiftyTwoWeekLow.toString()) : null;
            if (instrumentKey && fiftyTwoWeekLow !== null) {
                fiftyTwoWeekLowMap.set(instrumentKey, fiftyTwoWeekLow);
            }
        });
    }

    const dateMap = new Map();

    try {
        const latestRecords = await dbWrapper.getAllMarketBreadth();
        const latestSyncedDateStr = latestRecords.length > 0 ? latestRecords[0].date : null;

        const todayStr = moment().format("YYYY-MM-DD");
        let processingStartDate;

        if (latestSyncedDateStr && (fullSync !== true && fullSync !== 'true')) {
            const latestSyncedDate = moment(latestSyncedDateStr);
            // If the last synced date is today (e.g. partial sync earlier), re-sync today.
            // Otherwise, start from the next day.
            if (latestSyncedDate.isSame(moment(todayStr), 'day')) {
                processingStartDate = todayStr;
            } else {
                processingStartDate = latestSyncedDate.add(1, "days").format("YYYY-MM-DD");
            }

            if (moment(processingStartDate).isAfter(todayStr)) {
                console.log("Market breadth already up-to-date.");
                return { message: "Market breadth already up-to-date." };
            }
        } else {
            processingStartDate = moment().subtract(1, "years").format("YYYY-MM-DD");
        }

        // Add buffer for lookback calculations (15 days to ensure we get 5 trading days)
        const fetchStartDate = moment(processingStartDate).subtract(15, "days").format("YYYY-MM-DD");

        const endDate = todayStr;
        const batchSize = 3;
        const totalBatches = Math.ceil(stocks.length / batchSize);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batch = stocks.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

            await Promise.all(batch.map(async (instrument) => {
                try {
                    const instrumentKeyEncoded = encodeURIComponent(instrument.instrument_key);
                    const url = `https://api.upstox.com/v3/historical-candle/${instrumentKeyEncoded}/days/1/${endDate}/${fetchStartDate}`;
                    const headers = { Accept: "application/json" };

                    const response = await axios.get(url, { headers });
                    const candles = response.data?.data?.candles || [];

                    if (candles.length === 0) return;

                    // Assuming calculatePctChange5Days returns Map(date -> 5dPctChange)
                    const pctChange5dMap = calculatePctChange5Days(candles);

                    for (const candle of candles) {
                        const date = candle[0].split("T")[0];
                        if (date < processingStartDate) continue;
                        const open = candle[1];
                        const high = candle[2];
                        const low = candle[3];
                        const close = candle[4];
                        const pctChange = ((close - open) / open) * 100;


                        if (!dateMap.has(date)) {
                            dateMap.set(date, {
                                upCount: 0,
                                downCount: 0,
                                total: 0,
                                up20Count: 0,
                                down20Count: 0,
                                up8Count5d: 0,
                                down8Count5d: 0,
                                strongCloseUpCount: 0,
                                strongCloseDownCount: 0,
                                up80Pct52WL: 0,
                            });
                        }

                        const dayStats = dateMap.get(date);
                        dayStats.total++;

                        if (pctChange >= 4) {
                            dayStats.upCount++;

                            // Calculate closing strength for up moves:
                            // closingStrength = (close - open) / (high - open)
                            const closingStrengthUp = (high !== open) ? (close - open) / (high - open) : 0;

                            if (closingStrengthUp >= 0.8) {
                                dayStats.strongCloseUpCount++;
                            }
                        } else if (pctChange <= -4) {
                            dayStats.downCount++;

                            // For down moves, closing strength analogous:
                            // closingStrengthDown = (close - open) / (low - open)
                            // Because low < open in down moves, ratio should be ≤ 0.2 (i.e. closes near low)
                            const ratio = (low !== open) ? Math.abs(close - open) / Math.abs(low - open) : 0;

                            // check if ratio <= 0.2
                            if (ratio >= 0.8) {
                                dayStats.strongCloseDownCount++;
                            }
                        }

                        const pctChange5d = pctChange5dMap.get(date);
                        if (pctChange5d !== undefined) {
                            if (pctChange5d >= 20) {
                                dayStats.up20Count++;
                            } else if (pctChange5d <= -20) {
                                dayStats.down20Count++;
                            }
                            if (pctChange5d >= 8) {
                                dayStats.up8Count5d++;
                            } else if (pctChange5d <= -8) {
                                dayStats.down8Count5d++;
                            }
                        }

                        // Check Up 80% from 52WL
                        const fiftyTwoWeekLow = fiftyTwoWeekLowMap.get(instrument.instrument_key);
                        if (fiftyTwoWeekLow && fiftyTwoWeekLow > 0) {
                            if (close >= fiftyTwoWeekLow * 1.8) {
                                dayStats.up80Pct52WL++;
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Failed to process instrument ${instrument.instrument_key}:`, e.message);
                }
            }));

            await new Promise(resolve => setTimeout(resolve, 3500));
        }

        // Prepare data with new derived columns
        const breadthDataArray = [];

        // We need historical data to calculate rolling 5d/10d ratios for the new entries.
        // latestRecords comes from getAllMarketBreadth(), usually sorted by date DESC.
        const sortedHistory = [...latestRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

        // 1. Convert new calculations (dateMap) to an array
        const newEntries = [];
        for (const [date, stats] of dateMap.entries()) {
            newEntries.push({
                date,
                ...stats,
                // Basic Ratios
                up4PercentRatio: stats.total > 0 ? stats.upCount / stats.total : 0,
                down4PercentRatio: stats.total > 0 ? stats.downCount / stats.total : 0,
                strongCloseUpRatio: stats.upCount > 0 ? stats.strongCloseUpCount / stats.upCount : 0,
                strongCloseDownRatio: stats.downCount > 0 ? stats.strongCloseDownCount / stats.downCount : 0,
            });
        }

        // Sort new entries by date ascending
        newEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (newEntries.length === 0) {
            console.log("No new entries to process.");
            return { message: "No new data found to sync." };
        }

        // Helper to get slice of days ending at index i from the combined array
        const getRollingSum = (arr, currentIndex, param, days) => {
            let sum = 0;
            let count = 0;
            for (let k = 0; k < days; k++) {
                const idx = currentIndex - k;
                if (idx >= 0) {
                    // Handle both mongoose doc vs plain object structure if needed
                    const item = arr[idx];
                    // Check if item is a Mongoose document or plain object
                    const val = item[param] !== undefined ? item[param] : (item._doc && item._doc[param] !== undefined ? item._doc[param] : 0);
                    sum += Number(val || 0);
                    count++;
                }
            }
            return sum;
        };

        // We combine history + newEntries to have a full timeline for lookback
        // Note: sortedHistory might already contain today if we are re-running. 
        // Ideally we filter sortedHistory to exclude dates present in newEntries to avoid duplication in lookback.
        const newDates = new Set(newEntries.map(e => e.date));
        const cleanHistory = sortedHistory.filter(h => !newDates.has(h.date));

        const contextArray = [...cleanHistory, ...newEntries];

        // We only insert/update the new entries, but we use contextArray for calculation
        // The new entries start at index: cleanHistory.length
        for (let i = 0; i < newEntries.length; i++) {
            const entry = newEntries[i];
            const contextIndex = cleanHistory.length + i;

            // Rolling 5 Days
            // Definition: Ratio 5d = (Sum Up4% over last 5 days including today) / (Sum Down4% over last 5 days including today)
            const sumUp4_5d = getRollingSum(contextArray, contextIndex, 'up4Percent', 5);
            // Note: DB field is 'up4Percent', in map it is 'upCount'. 
            // Entry has 'upCount' from map spread, but access via 'up4Percent' standardized in getRollingSum?
            // Wait, 'entry' has 'upCount' and 'downCount' from stats. 
            // In DB 'up4Percent' stores the count. 
            // Standardize entry to have 'up4Percent' property for uniform access if we use that key.
            // Let's ensure 'entry' has the keys matching DB schema for the helper to work on both history (DB objects) and new entries.
            entry.up4Percent = entry.upCount;
            entry.down4Percent = entry.downCount;

            const sumUp4_5d_calc = getRollingSum(contextArray, contextIndex, 'up4Percent', 5);
            const sumDown4_5d_calc = getRollingSum(contextArray, contextIndex, 'down4Percent', 5);

            const sumUp4_10d_calc = getRollingSum(contextArray, contextIndex, 'up4Percent', 10);
            const sumDown4_10d_calc = getRollingSum(contextArray, contextIndex, 'down4Percent', 10);

            entry.ratio5d = sumDown4_5d_calc !== 0 ? sumUp4_5d_calc / sumDown4_5d_calc : 0;
            entry.ratio10d = sumDown4_10d_calc !== 0 ? sumUp4_10d_calc / sumDown4_10d_calc : 0;

            // Intent Scores
            entry.intentScoreUp = entry.strongCloseUpRatio * entry.strongCloseUpCount;
            entry.intentScoreDown = (1 - entry.strongCloseDownRatio) * entry.strongCloseDownCount;

            breadthDataArray.push({
                date: entry.date,
                up4Percent: entry.upCount,
                down4Percent: entry.downCount,
                totalStocks: entry.total,
                up20Pct5d: entry.up20Count || 0,
                down20Pct5d: entry.down20Count || 0,
                up8Pct5d: entry.up8Count5d || 0,
                down8Pct5d: entry.down8Count5d || 0,
                strongCloseUpCount: entry.strongCloseUpCount,
                strongCloseUpRatio: entry.strongCloseUpRatio,
                strongCloseDownCount: entry.strongCloseDownCount,
                strongCloseDownRatio: entry.strongCloseDownRatio,
                intentScoreUp: entry.intentScoreUp,
                intentScoreDown: entry.intentScoreDown,
                up4PercentRatio: entry.up4PercentRatio,
                down4PercentRatio: entry.down4PercentRatio,
                ratio5d: entry.ratio5d,
                ratio10d: entry.ratio10d,
                up80Pct52WL: entry.up80Pct52WL || 0,
            });
        }

        await dbWrapper.upsertMarketBreadth(breadthDataArray);
        console.log("52-week breadth sync completed.");
        return { message: "52-week breadth synced successfully." };

    } catch (error) {
        console.error("Sync error:", error);
        throw error;
    }
};

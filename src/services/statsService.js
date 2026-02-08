import moment from "moment";
import axios from "axios";
import {
    calculateEMA, calculateAverageVolume, calculateAverageValueVolume,
    calculateAverageClose, calculate52WeekHighLow
} from "../utils/index.js";
import dbWrapper from '../utils/dbWrapper.js';
import niftymidsmall400 from '../index/niftymidsmall400.json' with { type: 'json' };
import niftylargeCap from '../index/niftylargecap.json' with { type: 'json' };

export const sync52WeekStats = async () => {
    const stocks = [...niftymidsmall400, ...niftylargeCap];

    if (!Array.isArray(stocks) || stocks.length === 0) {
        throw new Error("Invalid or empty stocks input");
    }

    console.log("Starting 52-week stats sync...");

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
            const avgValueVolume21d = calculateAverageValueVolume(candles, 21);

            // Candles are Newest -> Oldest.
            // User requested to remove reverse(), so we treat the array as is.
            const ema10 = calculateEMA(candles.slice(0, 10), 10);
            const ema21 = calculateEMA(candles.slice(0, 21), 21);
            const ema50 = calculateEMA(candles.slice(0, 50), 50);

            const avgVolume21d = calculateAverageVolume(candles, 21);

            const candlesLength = candles.length;

            // Calculate minVolume3d (minimum volume in last 3 days)
            const minVolume3d = Math.min(...candles.slice(0, 3).map(c => c[5]));

            // Previous day close prices
            const closePrev1 = candlesLength > 1 ? candles[1][4] : null;
            const closePrev2 = candlesLength > 2 ? candles[2][4] : null;

            const avgClose7d = candlesLength >= 7 ? calculateAverageClose(candles.slice(0, 7)) : null;
            const avgClose65d = candlesLength >= 65 ? calculateAverageClose(candles.slice(0, 65)) : null;
            const trendIntensity = (avgClose7d !== null && avgClose65d !== null && avgClose65d !== 0)
                ? avgClose7d / avgClose65d
                : null;
            const avgClose126d = candlesLength >= 126 ? calculateAverageClose(candles.slice(0, 126)) : 0;
            const avgClose200d = candlesLength >= 200 ? calculateAverageClose(candles.slice(0, 200)) : 0;
            const lastPrice = candles[0][4];
            const prevClose = candlesLength > 1 ? candles[1][4] : null;

            const priceChange = (prevClose && prevClose !== 0)
                ? ((lastPrice - prevClose) / prevClose) * 100
                : null;

            const data = {
                instrumentKey: instrument.instrument_key,
                tradingsymbol: instrument.tradingsymbol,
                lastSyncDate: endDate,
                fiftyTwoWeekHigh: high,
                fiftyTwoWeekLow: low,
                lastPrice,
                priceChange,
                ema10,
                ema21,
                ema50,
                avgVolume21d,
                lastUpdated: new Date(),
                prevDayVolume: candles[0][5],
                avgValueVolume21d,
                minVolume3d,
                trendIntensity,
                closePrev1,
                closePrev2,
                avgClose126d,
                avgClose200d,
            };

            await dbWrapper.upsertInstrument52WeekStats(data);

        } catch (e) {
            console.error(`Failed to process instrument ${instrument.instrument_key}:`, e.message);
        }
    }
    console.log("52-week stats sync completed.");
};

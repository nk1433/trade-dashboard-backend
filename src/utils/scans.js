import dbWrapper from "./dbWrapper.js";

//TODO: move this config file
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 15;
const TRACKING_DURATION_MINUTES = 30;

const isWithinFirstNMins = (timestamp, durationMinutes) => {
    const tsDate = new Date(Number(timestamp));

    // Market open for that day is 9:15 AM IST, which is 3:45 AM UTC
    const marketOpen = new Date(Date.UTC(
        tsDate.getUTCFullYear(),
        tsDate.getUTCMonth(),
        tsDate.getUTCDate(),
        3,
        45,
        0,
        0
    ));

    const diffMinutes = (tsDate.getTime() - marketOpen.getTime()) / (1000 * 60);

    return diffMinutes >= 0 && diffMinutes <= durationMinutes;
};

const genProcessNewHighScan = () => {
    let currentDayStr = null;
    let scanStates = {
        newHigh: {
            prevHighs: {},
            newHighCounts: {},
        },
    };

    return async (symbol, ohlc, currentTs) => {
        const tsDate = new Date(Number(currentTs));
        const dayStr = tsDate.toISOString().slice(0, 10);
        if (currentDayStr !== dayStr) {
            currentDayStr = dayStr;
            scanStates = {
                newHigh: {
                    prevHighs: {},
                    newHighCounts: {},
                },
            };
        }

        const { prevHighs, newHighCounts } = scanStates.newHigh;
        const currentHigh = ohlc.high;

        if (!isWithinFirstNMins(currentTs, TRACKING_DURATION_MINUTES)) {
            //TODO: Terminate the socket connect and intiate via cron or on demand api way.
            return;
        }

        try {
            if (!(symbol in prevHighs)) {
                prevHighs[symbol] = currentHigh;
                newHighCounts[symbol] = 0;

                return;
            }

            if (currentHigh > prevHighs[symbol]) {
                const oldHigh = prevHighs[symbol];
                prevHighs[symbol] = currentHigh;
                newHighCounts[symbol] += 1;

                if (newHighCounts[symbol] >= 40) {
                    const stats = await get52WeekStatsMap();
                    const prevClose = stats?.[symbol]?.lastPrice;
                    const pctChange = prevClose ? ((currentHigh - prevClose) / prevClose) * 100 : 0;
                    await dbWrapper.upsertScans({
                        symbol,
                        scanType: "newHigh",
                        date: new Date().toISOString().slice(0, 10),
                        extraData: {
                            currentPrice: currentHigh,
                            pctChange,
                            currentTs,
                            additionalInfo: {
                                open: ohlc.open,
                                close: ohlc.close,
                                low: ohlc.low,
                                previousHigh: oldHigh,
                                newHigh: currentHigh,
                                newHighCount: newHighCounts[symbol],
                            }
                        },
                        tradingSymbol: stats?.[symbol]?.tradingSymbol,
                    });
                }
            }
        } catch (error) {
            console.error(`Error processing new high scan for ${symbol}:`, error);
        }
    }
};

const genProcessBollarBOScan = () => {
    let currentDayStr = null;
    let processedSymbols = new Set();

    return async (symbol, ohlc, currentTs) => {
        const tsDate = new Date(Number(currentTs));
        const dayStr = tsDate.toISOString().slice(0, 10);
        if (currentDayStr !== dayStr) {
            currentDayStr = dayStr;
            processedSymbols = new Set();
        }

        if (processedSymbols.has(symbol)) return;

        const open = ohlc.open;
        const close = ohlc.close;
        const volume = ohlc.vol;
        const withinFirst30Mins = isWithinFirstNMins(currentTs, TRACKING_DURATION_MINUTES)

        if (Math.abs(close - open) >= 50 && volume >= 100000 && withinFirst30Mins) {
            processedSymbols.add(symbol);
            const isBullish = close - open >= 50;
            const stats = await get52WeekStatsMap();
            const prevClose = stats?.[symbol]?.lastPrice;
            const pctChange = prevClose ? ((close - prevClose) / prevClose) * 100 : 0;
            await dbWrapper.upsertScans({
                symbol,
                scanType: isBullish ? "dollarBO" : "dollarBD",
                date: new Date().toISOString().slice(0, 10),
                extraData: {
                    currentPrice: close,
                    pctChange,
                    currentTs,
                    additionalInfo: {
                        open,
                        close,
                        volume,
                    }
                },
                tradingSymbol: stats?.[symbol]?.tradingSymbol,
            });
        }
    };
};

let statsCache = null;
let cacheDateStr = null;
let isFetching = false;

const get52WeekStatsMap = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (statsCache && cacheDateStr === todayStr) return statsCache;
    if (isFetching) return statsCache || null;
    isFetching = true;
    try {
        const stats = await dbWrapper.getAllInstrument52WeekStats();
        statsCache = {};
        cacheDateStr = todayStr;
        stats.forEach(doc => {
            const key = doc.instrumentKey;
            const lastPrice = doc.lastPrice;
            const tradingSymbol = doc.tradingsymbol;
            const prevDayVolume = doc.prevDayVolume;
            if (key && lastPrice) {
                statsCache[key] = {
                    lastPrice: Number(lastPrice.toString()),
                    tradingSymbol,
                    prevDayVolume: Number(prevDayVolume?.toString() || 0),
                    minVolume3d: Number(doc.minVolume3d?.toString() || 0),
                    trendIntensity: Number(doc.trendIntensity?.toString() || 0),
                    closePrev1: Number(doc.closePrev1?.toString() || 0),
                    closePrev2: Number(doc.closePrev2?.toString() || 0),
                    avgClose200d: Number(doc.avgClose200d?.toString() || 0)
                };
            }
        });
    } catch (err) {
        console.error("Failed to fetch 52w stats", err);
    } finally {
        isFetching = false;
    }
    return statsCache;
};

const genProcess4PercentBOScan = () => {
    let currentDayStr = null;
    let processedSymbols = new Set();

    return async (symbol, ohlc, currentTs) => {
        const tsDate = new Date(Number(currentTs));
        const dayStr = tsDate.toISOString().slice(0, 10);
        if (currentDayStr !== dayStr) {
            currentDayStr = dayStr;
            processedSymbols = new Set();
        }

        if (processedSymbols.has(symbol)) return;

        const stats = await get52WeekStatsMap();
        if (!stats) return;

        const statsData = stats[symbol];
        if (!statsData) return;

        const prevClose = statsData.lastPrice;
        const prevVolume = statsData.prevDayVolume;
        if (!prevClose) return;

        const currentPrice = ohlc.close;
        const currentVolume = ohlc.vol;
        const priceRatio = currentPrice / prevClose;

        const isBullishMB = priceRatio >= 1.04 && currentVolume > prevVolume && currentVolume >= 100000;
        const isBearishMB = priceRatio <= 0.96 && currentVolume > prevVolume && currentVolume >= 100000;

        if (isBullishMB || isBearishMB) {
            processedSymbols.add(symbol);
            const pctChange = ((currentPrice - prevClose) / prevClose) * 100;
            await dbWrapper.upsertScans({
                symbol,
                scanType: isBullishMB ? "4PercentBO" : "4PercentBD",
                date: new Date().toISOString().slice(0, 10),
                extraData: {
                    currentPrice,
                    pctChange,
                    currentTs,
                    additionalInfo: {
                        prevClose,
                        isBO: isBullishMB,
                    }
                },
                tradingSymbol: statsData.tradingSymbol,
            });
        }
    };
};

const genProcessSLTBScan = () => {
    let currentDayStr = null;
    let processedSymbols = new Set();

    return async (symbol, ohlc, currentTs) => {
        const tsDate = new Date(Number(currentTs));
        const dayStr = tsDate.toISOString().slice(0, 10);
        if (currentDayStr !== dayStr) {
            currentDayStr = dayStr;
            processedSymbols = new Set();
        }

        if (processedSymbols.has(symbol)) return;

        const stats = await get52WeekStatsMap();
        if (!stats) return;

        const statsData = stats[symbol];
        if (!statsData) return;

        const { minVolume3d, trendIntensity, closePrev1, closePrev2, avgClose200d } = statsData;
        const currentClose = ohlc.close;
        const currentOpen = ohlc.open;
        const currentHigh = ohlc.high;
        const currentLow = ohlc.low;

        // Bullish SLTB Conditions
        const isBullishCondition1 = minVolume3d > 100000 &&
            trendIntensity >= 1.05 &&
            currentClose > currentOpen &&
            currentClose > closePrev1 &&
            closePrev1 !== 0 && closePrev2 !== 0 &&
            (currentClose / closePrev1) > (closePrev1 / closePrev2) &&
            (closePrev1 / closePrev2) < 1.02 &&
            closePrev1 > closePrev2;

        const isBullishCondition2 = minVolume3d > 100000 &&
            closePrev1 > closePrev2 &&
            currentClose > currentOpen &&
            currentClose > closePrev1 &&
            closePrev1 !== 0 && closePrev2 !== 0 &&
            closePrev1 / closePrev2 < 1.02 &&
            (currentClose / closePrev1) > (closePrev1 / closePrev2) &&
            currentClose > avgClose200d &&
            trendIntensity < 1.05;

        const isBullishSLTB = isBullishCondition1 || isBullishCondition2;

        // Bearish SLTB Conditions
        const isBearishSLTB = closePrev2 !== 0 && closePrev1 !== 0 && currentHigh !== currentLow &&
            closePrev1 / closePrev2 >= 0.98 &&
            (currentClose / closePrev1) < (closePrev1 / closePrev2) &&
            currentClose < closePrev1 &&
            currentClose < currentOpen &&
            minVolume3d >= 300000 &&
            (currentClose - currentLow) / (currentHigh - currentLow) < 0.2;

        if (isBullishSLTB || isBearishSLTB) {
            processedSymbols.add(symbol);
            const prevClose = statsData.lastPrice;
            const pctChange = prevClose ? ((currentClose - prevClose) / prevClose) * 100 : 0;
            await dbWrapper.upsertScans({
                symbol,
                scanType: isBullishSLTB ? "sltbBO" : "sltbBD",
                date: new Date().toISOString().slice(0, 10),
                extraData: {
                    currentPrice: currentClose,
                    pctChange,
                    currentTs,
                    additionalInfo: {
                        currentClose,
                    }
                },
                tradingSymbol: statsData.tradingSymbol,
            });
        }
    };
};

const processNewHighScan = genProcessNewHighScan();
const process4PercentBOScan = genProcess4PercentBOScan();
const processBollarBOScan = genProcessBollarBOScan();
const processSLTBScan = genProcessSLTBScan();

export {
    processNewHighScan,
    process4PercentBOScan,
    processBollarBOScan,
    processSLTBScan,
};
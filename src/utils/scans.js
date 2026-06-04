import dbWrapper from "./dbWrapper.js";

//TODO: move this config file
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 15;
const TRACKING_DURATION_MINUTES = 30;

const isWithinFirst30Mins = (timestamp) => {
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

    return diffMinutes >= 0 && diffMinutes <= TRACKING_DURATION_MINUTES;
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

        if (!isWithinFirst30Mins(currentTs)) {
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
                prevHighs[symbol] = currentHigh;
                newHighCounts[symbol] += 1;

                await dbWrapper.upsertScans({
                    symbol,
                    scanType: "newHigh",
                    date: new Date().toISOString().slice(0, 10),
                    extraData: {
                        open: ohlc.open,
                        close: ohlc.close,
                        low: ohlc.low,
                        previousHigh: prevHighs[symbol],
                        newHigh: currentHigh,
                        newHighCount: newHighCounts[symbol],
                    },
                    tradingSymbol: (await get52WeekStatsMap())?.[symbol]?.tradingSymbol,
                });
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
        const withinFirst30Mins = isWithinFirst30Mins(currentTs)

        if (Math.abs(close - open) >= 50 && volume >= 100000 && withinFirst30Mins) {
            processedSymbols.add(symbol);
            const isBullish = close - open >= 50;
            await dbWrapper.upsertScans({
                symbol,
                scanType: isBullish ? "dollarBO" : "dollarBD",
                date: new Date().toISOString().slice(0, 10),
                extraData: {
                    open,
                    close,
                    volume,
                    currentTs,
                },
                tradingSymbol: (await get52WeekStatsMap())?.[symbol]?.tradingSymbol,
            });
        }
    };
};

let statsCache = null;
let isFetching = false;

const get52WeekStatsMap = async () => {
    if (statsCache) return statsCache;
    if (isFetching) return null;
    isFetching = true;
    try {
        const stats = await dbWrapper.getAllInstrument52WeekStats();
        statsCache = {};
        stats.forEach(doc => {
            const key = doc.instrumentKey;
            const lastPrice = doc.lastPrice;
            const tradingSymbol = doc.tradingsymbol;
            const prevDayVolume = doc.prevDayVolume;
            if (key && lastPrice) {
                statsCache[key] = {
                    lastPrice: Number(lastPrice.toString()),
                    tradingSymbol,
                    prevDayVolume: Number(prevDayVolume?.toString() || 0)
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
        const withinFirst30Mins = isWithinFirst30Mins(currentTs)

        if (isBullishMB || isBearishMB && withinFirst30Mins) {
            processedSymbols.add(symbol);
            const pctChange = ((currentPrice - prevClose) / prevClose) * 100;
            await dbWrapper.upsertScans({
                symbol,
                scanType: isBullishMB ? "4PercentBO" : "4PercentBD",
                date: new Date().toISOString().slice(0, 10),
                extraData: {
                    prevClose,
                    currentPrice,
                    pctChange,
                    currentTs,
                    isBO: isBullishMB,
                },
                tradingSymbol: statsData.tradingSymbol,
            });
        }
    };
};

//TODO: Introduce a SLTB BD scan.

const processNewHighScan = genProcessNewHighScan();
const process4PercentBOScan = genProcess4PercentBOScan();
const processBollarBOScan = genProcessBollarBOScan();

export {
    processNewHighScan,
    process4PercentBOScan,
    processBollarBOScan,
};
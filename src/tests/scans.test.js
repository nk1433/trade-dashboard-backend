import assert from 'node:assert';
import dbWrapper from '../utils/dbWrapper.js';
import { processNewHighScan, process4PercentBOScan, processBollarBOScan } from '../utils/scans.js';

// --- MOCKING DB WRAPPER ---
let upsertedScans = [];
let mockedStats = [];

dbWrapper.upsertScans = async (data) => {
    upsertedScans.push(data);
};

dbWrapper.getAllInstrument52WeekStats = async () => {
    return mockedStats;
};

// Setup dummy state data
const setupMocks = () => {
    upsertedScans = [];
    mockedStats = [
        {
            instrumentKey: "NSE_FO|45450",
            lastPrice: 200,
            tradingsymbol: "MOCK_SYMBOL",
            prevDayVolume: 50000
        },
        {
            instrumentKey: "SYMBOL_4_PERCENT",
            lastPrice: 200,
            tradingsymbol: "MOCK_SYMBOL",
            prevDayVolume: 50000
        },
        {
            instrumentKey: "SYMBOL_4_PERCENT_LOW",
            lastPrice: 200,
            tradingsymbol: "MOCK_SYMBOL",
            prevDayVolume: 50000
        },
        {
            instrumentKey: "SYMBOL_BULLISH",
            lastPrice: 200,
            tradingsymbol: "MOCK_SYMBOL",
            prevDayVolume: 50000
        },
        {
            instrumentKey: "SYMBOL_BEARISH",
            lastPrice: 200,
            tradingsymbol: "MOCK_SYMBOL",
            prevDayVolume: 50000
        }
    ];
};

const runTests = async () => {
    console.log("Running Scan Logic Tests...");
    
    // 1. Test isWithinFirst30Mins behavior indirectly via processNewHighScan
    console.log("--> Testing New High Scan (Time Restrictions)");
    setupMocks();
    
    const symbol = "NSE_FO|45450";
    const ohlc = {
        interval: "1d",
        open: 400,
        high: 450,
        low: 208.7,
        close: 213.75,
        vol: 779400
    };

    // Case 1: Time is past 9:45 AM IST (e.g., 1:01 PM IST)
    const lateTs = "1740727891739"; // 1:01 PM IST
    await processNewHighScan(symbol, ohlc, lateTs);
    // Because it's late, it should return early and NOT track or insert
    assert.strictEqual(upsertedScans.length, 0, "Should not track or insert new high after 9:45 AM IST");

    // Case 2: Time is exactly at 9:30 AM IST (Valid timeframe)
    // 9:30 AM IST is 4:00 AM UTC
    const validTs = new Date(Date.UTC(2025, 1, 28, 4, 0, 0, 0)).getTime().toString();
    
    // First run sets the initial high, shouldn't upsert yet
    await processNewHighScan(symbol, ohlc, validTs);
    assert.strictEqual(upsertedScans.length, 0, "First valid run should only track the initial high, not insert");
    
    // Second run with a HIGHER high should upsert
    const higherOhlc = { ...ohlc, high: 500 };
    await processNewHighScan(symbol, higherOhlc, validTs);
    assert.strictEqual(upsertedScans.length, 1, "Second valid run with higher high should upsert to DB");
    assert.strictEqual(upsertedScans[0].scanType, "newHigh");
    assert.strictEqual(upsertedScans[0].extraData.newHigh, 500);

    // 2. Test 4% Breakout / Breakdown
    console.log("--> Testing 4% Breakout/Breakdown Scan");
    upsertedScans = [];

    const symbol4Percent = "SYMBOL_4_PERCENT";

    // Previous price is 200, previous volume is 50000.
    // Current price 210 (+5%), current volume 150000 (valid, > prevVolume and > 100000)
    const breakoutOhlc = { ...ohlc, close: 210, vol: 150000 };
    await process4PercentBOScan(symbol4Percent, breakoutOhlc, validTs);
    assert.strictEqual(upsertedScans.length, 1, "Should trigger 4% Breakout");
    assert.strictEqual(upsertedScans[0].scanType, "4PercentBO");
    
    // Test rejection: Volume too low (< 100000)
    upsertedScans = [];
    const lowVolOhlc = { ...ohlc, close: 210, vol: 90000 };
    await process4PercentBOScan("SYMBOL_4_PERCENT_LOW", lowVolOhlc, validTs);
    assert.strictEqual(upsertedScans.length, 0, "Should NOT trigger if volume < 100000");

    // 3. Test Dollar Breakout / Breakdown
    console.log("--> Testing Dollar Breakout/Breakdown Scan");
    upsertedScans = [];

    // Bullish Dollar: Close (200) - Open (150) = 50. Vol 100,000
    const bullishSymbol = "SYMBOL_BULLISH";
    const bullishDollarOhlc = { ...ohlc, open: 150, close: 200, vol: 100000 };
    await processBollarBOScan(bullishSymbol, bullishDollarOhlc, validTs);
    assert.strictEqual(upsertedScans.length, 1, "Should trigger Dollar Breakout");
    assert.strictEqual(upsertedScans[0].scanType, "dollarBO");

    upsertedScans = [];
    // Bearish Dollar: Open (200) - Close (150) = 50. Vol 100,000
    const bearishSymbol = "SYMBOL_BEARISH";
    const bearishDollarOhlc = { ...ohlc, open: 200, close: 150, vol: 100000 };
    await processBollarBOScan(bearishSymbol, bearishDollarOhlc, validTs);
    assert.strictEqual(upsertedScans.length, 1, "Should trigger Dollar Breakdown");
    assert.strictEqual(upsertedScans[0].scanType, "dollarBD");

    console.log("✅ All tests passed successfully!");
    process.exit(0);
};

runTests().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});

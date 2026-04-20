import { processNewHighScan, process4PercentBOScan, processBollarBOScan } from './src/utils/scans.js';

const mockFeed = {
  "type": "live_feed",
  "feeds": {
    "NSE_FO|45450": {
      "fullFeed": {
        "marketFF": {
          "marketOHLC": {
            "ohlc": [
              {
                "interval": "1d",
                "open": 400,
                "high": 400,
                "low": 208.7,
                "close": 213.75,
                "vol": "779400",
                "ts": "1740681000000"
              },
              {
                "interval": "I1",
                "open": 210,
                "high": 212.8,
                "low": 208.7,
                "close": 212.15,
                "vol": "8475",
                "ts": "1740727800000"
              }
            ]
          }
        }
      }
    }
  },
  "currentTs": "1740727891739"
};

const runTest = async () => {
    console.log("Starting Scan Tests...");
    const currentTs = mockFeed.currentTs;
    const symbol = "NSE_FO|45450";
    const ohlcDay = mockFeed.feeds[symbol].fullFeed.marketFF.marketOHLC.ohlc.find(x => x.interval === "1d");
    
    console.log(`Current Feed TS: ${new Date(Number(currentTs)).toString()}`);
    console.log("--- Testing New High Scan ---");
    // It should not insert or even process because 1:01 PM IST is outside first 30 mins
    try {
        await processNewHighScan(symbol, ohlcDay, currentTs);
        console.log("✅ processNewHighScan executed. Expected behavior: Should NOT upsert as time is past 9:45 AM IST.");
    } catch(err) {
        console.error("❌ processNewHighScan error:", err);
    }

    console.log("--- Testing 4% BO Scan ---");
    // It will attempt to process 4% BO scan
    try {
        await process4PercentBOScan(symbol, ohlcDay, currentTs);
        console.log("✅ process4PercentBOScan executed without crashing.");
    } catch(err) {
        console.error("❌ process4PercentBOScan error:", err);
    }

    console.log("--- Testing Dollar BO Scan ---");
    try {
        await processBollarBOScan(symbol, ohlcDay, currentTs);
        console.log("✅ processBollarBOScan executed without crashing.");
    } catch(err) {
        console.error("❌ processBollarBOScan error:", err);
    }
    
    // Now let's test a timestamp that IS within the first 30 mins (e.g. 9:30 AM IST)
    // 9:30 AM IST = 4:00 AM UTC.
    const morningTs = new Date(Date.UTC(2025, 1, 28, 4, 0, 0, 0)).getTime().toString();
    console.log(`\nTesting with morning TS: ${new Date(Number(morningTs)).toString()}`);
    console.log("--- Testing New High Scan (Morning) ---");
    try {
        await processNewHighScan(symbol, ohlcDay, morningTs);
        console.log("✅ processNewHighScan (Morning) executed. First time tracking this symbol (prevHigh set).");
        // Trigger a new high!
        const newOhlcDay = { ...ohlcDay, high: 450 };
        await processNewHighScan(symbol, newOhlcDay, morningTs);
        console.log("✅ processNewHighScan (Morning) executed. Second time with higher high, should trigger DB upsert.");
    } catch(err) {
        console.error("❌ processNewHighScan error:", err);
    }
    
    process.exit(0);
};

runTest();

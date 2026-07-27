import dotenv from 'dotenv';
import UpstoxClient from "upstox-js-sdk";
import niftymidsmall400float from '../index/niftymidsmall400.json' with { type: "json" };
import niftylargeCap from '../index/niftylargecap.json' with { type: "json" };
import { processNewHighScan, process4PercentBOScan, processBollarBOScan, processSLTBScan, processBullishReversalScan } from "../utils/scans.js";
import { intiateAccessTokenReq } from './utils.js';
import dbWrapper from '../utils/dbWrapper.js';

dotenv.config();

const scripts = niftymidsmall400float;
const instruments = scripts.map((script) => script.instrument_key);
const niftylargeCaps = niftylargeCap.map((script) => script.instrument_key);
const stockUniverse = [...instruments, ...niftylargeCaps];

export const connectWsUpstoxs = async (retryCount = 0) => {
  const token = process.env.UPSTOXS_ANALYTICS_TOKEN;
  let defaultClient = UpstoxClient.ApiClient.instance;
  const OAUTH2 = defaultClient.authentications["OAUTH2"];

  if (token) {
    OAUTH2.accessToken = token;
  } else {
    OAUTH2.accessToken = process.env.LOWER_ENV === 'true'
      ? process.env.UPSTOXS_ANALYTICS_TOKEN
      : await dbWrapper.getTokenFromDB();
  }

  console.log('🔑 Token retrieved for WebSocket connection:', OAUTH2.accessToken.slice(-10));

  const streamer = new UpstoxClient.MarketDataStreamerV3(stockUniverse, "full");

  streamer.autoReconnect(false);
  streamer.connect();

  streamer.on("open", () => {
    console.log("✅ WebSocket connected successfully.");
    retryCount = 0; // Reset retry count on successful connection
  });

  let isReconnecting = false;
  const handleReconnect = () => {
    if (isReconnecting) return;
    isReconnecting = true;

    if (process.env.LOWER_ENV !== 'true') {
      const delay = 5 * 60 * 1000; // 5 minutes in milliseconds
      console.log(`⏳ Reconnecting in 5 minutes (Retry ${retryCount + 1})...`);
      setTimeout(() => {
        connectWsUpstoxs(retryCount + 1);
      }, delay);
    }
  };

  let lastPreMarketLogTime = 0;

  streamer.on("message", async (data) => {
    try {
      const parsed = JSON.parse(data.toString("utf-8"));
      if (parsed.type !== "live_feed" || !parsed.feeds) return;

      const now = Date.now();
      const istDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const isPreMarket = istDate.getHours() === 9 && istDate.getMinutes() >= 0 && istDate.getMinutes() <= 15;

      if (isPreMarket && now - lastPreMarketLogTime > 10000) { // Log once every 10 seconds
        lastPreMarketLogTime = now;
        const sampleSymbol = Object.keys(parsed.feeds)[0];
        if (sampleSymbol) {
          console.log(`\n[Pre-Market Sample] ${sampleSymbol}:`, JSON.stringify(parsed.feeds[sampleSymbol], null, 2));
        }
      }

      for (const symbol in parsed.feeds) {
        const feed = parsed.feeds[symbol];
        if (!feed?.fullFeed?.marketFF?.marketOHLC) continue;

        const ohlcDay = feed.fullFeed.marketFF.marketOHLC.ohlc.find(x => x.interval === "1d");
        if (!ohlcDay) continue;

        processNewHighScan(symbol, ohlcDay, parsed.currentTs);
        process4PercentBOScan(symbol, ohlcDay, parsed.currentTs);
        processBollarBOScan(symbol, ohlcDay, parsed.currentTs);
        processSLTBScan(symbol, ohlcDay, parsed.currentTs);
        processBullishReversalScan(symbol, ohlcDay, parsed.currentTs);
      }
    } catch (err) {
      console.error("Error processing stream data:", err);
    }
  });

  streamer.on('error', (err) => {
    console.error('Upstox MarketDataStreamerV3 error:', err.message);
    if (err.message === "Unexpected server response: 401") {
      console.log('⚠️ Token expired (401). Please re-login to Upstox.');
      handleReconnect();
    }
  });

  streamer.on("close", (data) => {
    console.log("Connection closed.", data);
    handleReconnect();
  });
};


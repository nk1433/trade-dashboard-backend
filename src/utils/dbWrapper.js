// dbWrapper.js

import Instrument52WeekStatsSQL from '../schema/RDB/instrument52WStats.js'; // Sequelize model
import Instrument52WeekStatsMongo from '../schema/Mongo/instrument52WStats.js'; // Mongoose model (example)
import { sequelize } from '../database/index.js';

const USE_MONGO = false; // or pass as param

async function upsertInstrument52WeekStats(data) {
  if (USE_MONGO) {
    // Transform data for MongoDB schema if needed
    const query = { instrumentKey: data.instrumentKey };
    const update = {
      $set: {
        tradingsymbol: data.tradingsymbol,
        lastSyncDate: data.lastSyncDate,
        fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: data.fiftyTwoWeekLow,
        lastPrice: data.lastPrice,
        ema10: data.ema10,
        ema21: data.ema21,
        ema50: data.ema50,
        avgVolume21d: data.avgVolume21d,
        lastUpdated: data.lastUpdated || new Date(),
        prevDayVolume: data.prevDayVolume,
        avgValueVolume21d: data.avgValueVolume21d,
      },
    };
    const options = { upsert: true, new: true };
    return await Instrument52WeekStatsMongo.findOneAndUpdate(query, update, options);
  } else {
    // Sequelize upsert
        await sequelize.sync();

    return await Instrument52WeekStatsSQL.upsert(data);
  }
}

async function getAllInstrument52WeekStats() {
  if (USE_MONGO) {
    console.log('getting')
    // Find all, ordered ascending by instrumentKey
    return await Instrument52WeekStatsMongo.find().sort({ instrumentKey: 1 }).exec();
  } else {
    // Sequelize findAll with order
    console.log('getting from seq')
    return await Instrument52WeekStatsSQL.findAll({
      order: [['instrument_key', 'ASC']],
    });
  }
}

// Similarly for other operations...

export default {
  upsertInstrument52WeekStats,
  getAllInstrument52WeekStats
};

// dbWrapper.js

import Instrument52WeekStatsSQL from '../schema/RDB/instrument52WStats.js'; // Sequelize model
import Instrument52WeekStatsMongo from '../schema/Mongo/instrument52WStats.js'; // Mongoose model (example)
import MarketBreadthSQL from '../schema/RDB/marketBreath.js';
import MarketBreadthMongo from '../schema/Mongo/marketBreadth.js';
import ScansSql from '../schema/RDB/scans.js';
import ScansMongo from '../schema/Mongo/scans.js';
import UpstoxsTokenMongo from '../schema/Mongo/upstoxsToken.js';
import UpstoxTokenSQL from '../schema/RDB/upstoxsToken.js';
import UpstoxConfigSQL from '../schema/RDB/upstoxConfig.js';
import UpstoxConfigMongo from '../schema/Mongo/upstoxConfig.js';
import UserSQL from '../schema/RDB/user.js';
import UserMongo from '../schema/Mongo/user.js';
import ChartLayoutSQL from '../schema/RDB/chartLayout.js';
import ChartLayoutMongo from '../schema/Mongo/chartLayout.js';
import UserSettingsSQL from '../schema/RDB/userSettings.js';
import UserSettingsMongo from '../schema/Mongo/userSettings.js';
import PaperTradeSQL from '../schema/RDB/paperTrade.js';
import PaperTradeMongo from '../schema/Mongo/paperTrade.js';
import PaperPortfolioSQL from '../schema/RDB/paperPortfolio.js';
import PaperPortfolioMongo from '../schema/Mongo/paperPortfolio.js';
import AlertSQL from '../schema/RDB/alert.js';
import AlertMongo from '../schema/Mongo/alert.js';
import SaInsightSQL from '../schema/RDB/saInsight.js';
import SaInsightMongo from '../schema/Mongo/saInsight.js';
import UniverseMongo from '../schema/Mongo/universe.js';
import { sequelize } from '../database/index.js';
import dotenv from 'dotenv';
dotenv.config();

const USE_MONGO = process.env.USE_MONGO === 'true';

async function upsertInstrument52WeekStats(data) {
  try {
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
          avgVolume1w: data.avgVolume1w,
          lastUpdated: data.lastUpdated || new Date(),
          prevDayVolume: data.prevDayVolume,
          avgValueVolume21d: data.avgValueVolume21d,
          minVolume3d: data.minVolume3d,
          trendIntensity: data.trendIntensity,
          closePrev1: data.closePrev1,
          closePrev2: data.closePrev2,
          avgClose126d: data.avgClose126d,
          priceChange: data.priceChange,
          avgClose200d: data.avgClose200d,
          minLow5d: data.minLow5d,
          minVolume5d: data.minVolume5d,
        },
      };
      const options = { upsert: true, new: true };
      return await Instrument52WeekStatsMongo.findOneAndUpdate(query, update, options);
    } else {
      // Sequelize upsert
      return await Instrument52WeekStatsSQL.upsert(data);
    }
  } catch (error) {
    console.error('Error in upsertInstrument52WeekStats:', error);
  }
}

async function getAllInstrument52WeekStats() {
  try {
    if (USE_MONGO) {
      // Find all, ordered ascending by instrumentKey
      return await Instrument52WeekStatsMongo.find().sort({ instrumentKey: 1 }).exec();
    } else {
      // Sequelize findAll with order
      return await Instrument52WeekStatsSQL.findAll({
        order: [['instrument_key', 'ASC']],
      });
    }
  } catch (error) {
    console.error('Error in getAllInstrument52WeekStats:', error);
  }
}

async function upsertMarketBreadth(data) {
  try {
    if (USE_MONGO) {
      // MongoDB upsert logic
      if (Array.isArray(data)) {
        // Bulk upsert with Promise.all (iterate documents)
        return await Promise.all(data.map(async (doc) => {
          const query = { date: doc.date };
          const update = { $set: doc };
          const options = { upsert: true, new: true };
          return await MarketBreadthMongo.findOneAndUpdate(query, update, options);
        }));
      } else {
        const query = { date: data.date };
        const update = { $set: data };
        const options = { upsert: true, new: true };
        return await MarketBreadthMongo.findOneAndUpdate(query, update, options);
      }
    } else {
      // Sequelize upsert logic
      if (Array.isArray(data)) {
        // Sequelize does not have batch upsert, so batch with Promise.all
        return await Promise.all(data.map(doc => MarketBreadthSQL.upsert(doc)));
      } else {
        return await MarketBreadthSQL.upsert(data);
      }
    }
  } catch (error) {
    console.error('Error in upsertMarketBreadth:', error);
  }
}

async function getAllMarketBreadth() {
  try {
    if (USE_MONGO) {
      return await MarketBreadthMongo.find().sort({ date: -1 }).exec();
    } else {
      return await MarketBreadthSQL.findAll({
        order: [["date", "DESC"]],
      });
    }
  } catch (error) {
    console.error('Error in getAllMarketBreadth:', error);
  }
}

async function upsertScans(data) {
  try {
    if (USE_MONGO) {
      if (Array.isArray(data)) {
        return await Promise.all(
          data.map(async (doc) => {
            const query = {
              symbol: doc.symbol,
              date: doc.date,
              scanType: doc.scanType,
              tradingSymbol: doc.tradingSymbol,
            };
            const update = { $set: doc };
            const options = { upsert: true, new: true };
            return await ScansMongo.findOneAndUpdate(query, update, options);
          })
        );
      } else {
        const query = {
          symbol: data.symbol,
          date: data.date,
          scanType: data.scanType,
        };
        const update = { $set: data };
        const options = { upsert: true, new: true };
        return await ScansMongo.findOneAndUpdate(query, update, options);
      }
    } else {
      if (Array.isArray(data)) {
        return await Promise.all(data.map((doc) => ScansSql.upsert(doc)));
      } else {
        return await ScansSql.upsert(data);
      }
    }
  } catch (error) {
    console.error('Error in upsertScans:', error);
  }
}

async function getUniqueScanDates() {
  try {
    if (USE_MONGO) {
      const dates = await ScansMongo.distinct("date");
      return dates.sort((a, b) => new Date(b) - new Date(a));
    } else {
      const dates = await ScansSql.findAll({
        attributes: ['date'],
        group: ['date'],
        order: [['date', 'DESC']]
      });
      return dates.map(d => d.date);
    }
  } catch (error) {
    console.error('Error in getUniqueScanDates:', error);
    return [];
  }
}

async function getScansByDate(date) {
  try {
    if (USE_MONGO) {
      return await ScansMongo.find({ date }).exec();
    } else {
      return await ScansSql.findAll({ where: { date } });
    }
  } catch (error) {
    console.error('Error in getScansByDate:', error);
    return [];
  }
}

const getTokenFromDB = async () => {
  try {
    if (USE_MONGO) {
      const tokenDocuments = await UpstoxsTokenMongo.findOne().sort({ issued_at: -1 }).exec();

      return tokenDocuments?.access_token
    } else {
      const tokenData = await UpstoxTokenSQL.findOne({
        order: [["issuedAt", "DESC"]],
      });
      return tokenData?.accessToken;
    }
  } catch (error) {
    console.error('Error in getTokenFromDB:', error);
  }
};

const getUserToken = async (clientId) => {
  try {
    if (USE_MONGO) {
      return await UpstoxsTokenMongo.findOne({ client_id: clientId }).sort({ issued_at: -1 }).exec();
    } else {
      return await UpstoxTokenSQL.findOne({
        where: { clientId },
        order: [["issuedAt", "DESC"]],
      });
    }
  } catch (error) {
    console.error('Error in getUserToken:', error);
    return null;
  }
};

const upsertTokenToDB = async (data) => {
  try {
    if (USE_MONGO) {
      const mongoData = {
        client_id: data.clientId,
        userId: data.userId,
        upstoxUserId: data.upstoxUserId,
        access_token: data.accessToken,
        issued_at: data.issuedAt,
        expires_at: data.expiresAt,
      };
      // Upsert: find any document and update it, or create new if none exists.
      // Using empty query {} to treat it as a singleton or update the first found.
      const query = { userId: data.userId };
      const update = { $set: mongoData };
      const options = { upsert: true, new: true };
      return await UpstoxsTokenMongo.findOneAndUpdate(query, update, options);
    } else {
      const userIdStr = String(data.userId);
      const existingToken = await UpstoxTokenSQL.findOne({
        where: { userId: userIdStr },
        order: [["issuedAt", "DESC"]],
      });

      if (existingToken) {
        return await existingToken.update({ ...data, userId: userIdStr });
      }
      return await UpstoxTokenSQL.create({ ...data, userId: userIdStr });
    }
  } catch (error) {
    console.error('Error in upsertTokenToDB:', error);
  }
};

const getScans = async (scanType, date) => {
  try {
    const query = { date };
    if (scanType && scanType !== 'all') {
      query.scanType = scanType;
    }

    if (USE_MONGO) {
      return await ScansMongo.find(query).exec();
    } else {
      return await ScansSql.findAll({
        where: query,
        order: [['createdAt', 'DESC']],
      });
    }
  } catch (error) {
    console.error('Error in getScans:', error);
    return [];
  }
};

const upsertUpstoxConfig = async (data) => {
  try {
    if (USE_MONGO) {
      const query = { userId: data.userId };
      const update = { $set: data };
      const options = { upsert: true, new: true };
      return await UpstoxConfigMongo.findOneAndUpdate(query, update, options);
    } else {
      const existingConfig = await UpstoxConfigSQL.findOne({
        where: { userId: data.userId }
      });

      if (existingConfig) {
        return await existingConfig.update(data);
      }
      return await UpstoxConfigSQL.create(data);
    }
  } catch (error) {
    console.error('Error in upsertUpstoxConfig:', error);
    throw error;
  }
};

const getUpstoxConfigs = async (userId) => {
  try {
    if (USE_MONGO) {
      return await UpstoxConfigMongo.find({ userId }).sort({ createdAt: -1 }).exec();
    } else {
      return await UpstoxConfigSQL.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });
    }
  } catch (error) {
    console.error('Error in getUpstoxConfigs:', error);
    return [];
  }
};


const getUpstoxConfigById = async (id) => {
  try {
    if (USE_MONGO) {
      return await UpstoxConfigMongo.findById(id).exec();
    } else {
      return await UpstoxConfigSQL.findByPk(id);
    }
  } catch (error) {
    console.error('Error in getUpstoxConfigById:', error);
    return null;
  }
};

const getUpstoxConfigByName = async (name) => {
  try {
    if (USE_MONGO) {
      return await UpstoxConfigMongo.findOne({ name }).exec();
    } else {
      return await UpstoxConfigSQL.findOne({ where: { name } });
    }
  } catch (error) {
    console.error('Error in getUpstoxConfigByName:', error);
    return null;
  }
};

const createUser = async (data) => {
  try {
    if (USE_MONGO) {
      const user = new UserMongo(data);
      return await user.save();
    } else {
      return await UserSQL.create(data);
    }
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
};

const getUserByEmail = async (email) => {
  try {
    if (USE_MONGO) {
      return await UserMongo.findOne({ email }).exec();
    } else {
      return await UserSQL.findOne({ where: { email } });
    }
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
};

const getUserById = async (id) => {
  try {
    if (USE_MONGO) {
      return await UserMongo.findById(id).exec();
    } else {
      return await UserSQL.findByPk(id);
    }
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
};

const saveChartLayout = async (data) => {
  try {
    if (USE_MONGO) {
      const query = { name: data.name, user_id: data.user_id, client_id: data.client_id };
      const update = { $set: data };
      const options = { upsert: true, new: true };
      return await ChartLayoutMongo.findOneAndUpdate(query, update, options);
    } else {
      const existing = await ChartLayoutSQL.findOne({
        where: { name: data.name, user_id: data.user_id, client_id: data.client_id }
      });
      if (existing) {
        return await existing.update(data);
      }
      return await ChartLayoutSQL.create(data);
    }
  } catch (error) {
    console.error('Error in saveChartLayout:', error);
    throw error;
  }
};

const getChartLayouts = async (userId, clientId) => {
  try {
    if (USE_MONGO) {
      return await ChartLayoutMongo.find({ user_id: userId, client_id: clientId })
        .sort({ timestamp: -1 })
        .select('id name timestamp resolution symbol')
        .exec();
    } else {
      return await ChartLayoutSQL.findAll({
        where: { user_id: userId, client_id: clientId },
        attributes: ['id', 'name', 'timestamp', 'resolution', 'symbol'],
        order: [['timestamp', 'DESC']]
      });
    }
  } catch (error) {
    console.error('Error in getChartLayouts:', error);
    return [];
  }
};

const getChartLayoutById = async (id) => {
  try {
    if (USE_MONGO) {
      return await ChartLayoutMongo.findById(id).exec();
    } else {
      return await ChartLayoutSQL.findByPk(id);
    }
  } catch (error) {
    console.error('Error in getChartLayoutById:', error);
    return null;
  }
};

const deleteChartLayout = async (id) => {
  try {
    if (USE_MONGO) {
      return await ChartLayoutMongo.findByIdAndDelete(id).exec();
    } else {
      const chart = await ChartLayoutSQL.findByPk(id);
      if (chart) {
        return await chart.destroy();
      }
      return null;
    }
  } catch (error) {
    console.error('Error in deleteChartLayout:', error);
  }
};

const getUserSettings = async (userId) => {
  try {
    if (USE_MONGO) {
      return await UserSettingsMongo.findOne({ userId }).exec();
    } else {
      return await UserSettingsSQL.findOne({ where: { userId } });
    }
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return null;
  }
};

const upsertUserSettings = async (userId, settings) => {
  try {
    if (USE_MONGO) {
      const query = { userId };
      const update = { $set: { userId, settings } };
      const options = { upsert: true, new: true };
      return await UserSettingsMongo.findOneAndUpdate(query, update, options);
    } else {
      const existing = await UserSettingsSQL.findOne({ where: { userId } });
      if (existing) {
        return await existing.update({ settings });
      }
      return await UserSettingsSQL.create({ userId, settings });
    }
  } catch (error) {
    console.error('Error in upsertUserSettings:', error);
    throw error;
  }
};

const savePaperTrade = async (data) => {
  try {
    if (USE_MONGO) {
      const trade = new PaperTradeMongo(data);
      return await trade.save();
    } else {
      return await PaperTradeSQL.create(data);
    }
  } catch (error) {
    console.error('Error in savePaperTrade:', error);
    throw error;
  }
};

const getPaperTrades = async (userId) => {
  try {
    if (USE_MONGO) {
      return await PaperTradeMongo.find({ userId }).sort({ timestamp: -1 }).exec();
    } else {
      return await PaperTradeSQL.findAll({
        where: { userId },
        order: [['timestamp', 'DESC']],
      });
    }
  } catch (error) {
    console.error('Error in getPaperTrades:', error);
    return [];
  }
};

const getPaperPortfolio = async (userId) => {
  try {
    if (USE_MONGO) {
      return await PaperPortfolioMongo.findOne({ userId }).exec();
    } else {
      return await PaperPortfolioSQL.findOne({ where: { userId } });
    }
  } catch (error) {
    console.error('Error in getPaperPortfolio:', error);
    return null;
  }
};

const upsertPaperPortfolio = async (userId, data) => {
  try {
    if (USE_MONGO) {
      const query = { userId };
      const update = { $set: data };
      const options = { upsert: true, new: true };
      return await PaperPortfolioMongo.findOneAndUpdate(query, update, options);
    } else {
      const existing = await PaperPortfolioSQL.findOne({ where: { userId } });
      if (existing) {
        return await existing.update(data);
      }
      return await PaperPortfolioSQL.create({ ...data, userId });
    }
  } catch (error) {
    console.error('Error in upsertPaperPortfolio:', error);
    throw error;
  }
};

const saveAlert = async (data) => {
  try {
    if (USE_MONGO) {
      const alert = new AlertMongo(data);
      return await alert.save();
    } else {
      return await AlertSQL.create(data);
    }
  } catch (error) {
    console.error('Error in saveAlert:', error);
    throw error;
  }
};

const getSaInsightByDate = async (date) => {
  try {
    if (USE_MONGO) {
      return await SaInsightMongo.findOne({ date }).exec();
    } else {
      return await SaInsightSQL.findOne({ where: { date } });
    }
  } catch (error) {
    console.error('Error in getSaInsightByDate:', error);
    return null;
  }
};

const getAllSaInsights = async () => {
  try {
    if (USE_MONGO) {
      return await SaInsightMongo.find().sort({ date: -1 }).exec();
    } else {
      return await SaInsightSQL.findAll({ order: [['date', 'DESC']] });
    }
  } catch (error) {
    console.error('Error in getAllSaInsights:', error);
    return [];
  }
};

const upsertSaInsight = async (data) => {
  try {
    if (USE_MONGO) {
      const query = { date: data.date };
      const update = { $set: data };
      const options = { upsert: true, new: true };
      return await SaInsightMongo.findOneAndUpdate(query, update, options);
    } else {
      const existing = await SaInsightSQL.findOne({ where: { date: data.date } });
      if (existing) {
        return await existing.update(data);
      }
      return await SaInsightSQL.create(data);
    }
  } catch (error) {
    console.error('Error in upsertSaInsight:', error);
    throw error;
  }
};

const deleteSaInsight = async (date) => {
  try {
    if (USE_MONGO) {
      return await SaInsightMongo.findOneAndDelete({ date }).exec();
    } else {
      const insight = await SaInsightSQL.findOne({ where: { date } });
      if (insight) {
        return await insight.destroy();
      }
      return null;
    }
  } catch (error) {
    console.error('Error in deleteSaInsight:', error);
    throw error;
  }
};

const getUniverse = async () => {
  try {
    if (USE_MONGO) {
      return await UniverseMongo.find().exec();
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error in getUniverse:', error);
    return [];
  }
};

const upsertUniverse = async (data) => {
  try {
    if (USE_MONGO) {
      if (Array.isArray(data)) {
        // Use bulkWrite for performance instead of Promise.all
        const bulkOps = data.map(doc => ({
          updateOne: {
            filter: { tradingsymbol: doc.tradingsymbol },
            update: { $set: doc },
            upsert: true
          }
        }));
        return await UniverseMongo.bulkWrite(bulkOps);
      } else {
        const query = { tradingsymbol: data.tradingsymbol };
        const update = { $set: data };
        const options = { upsert: true, new: true };
        return await UniverseMongo.findOneAndUpdate(query, update, options);
      }
    }
  } catch (error) {
    console.error('Error in upsertUniverse:', error);
  }
};

const updateInstrumentDetails = async (tradingSymbol, updates) => {
  try {
    if (USE_MONGO) {
      return await UniverseMongo.findOneAndUpdate(
        { tradingsymbol: tradingSymbol },
        { $set: updates },
        { new: true }
      );
    }
  } catch (error) {
    console.error('Error in updateInstrumentDetails:', error);
  }
};

const getInstrumentBySymbol = async (tradingSymbol) => {
  try {
    if (USE_MONGO) {
      return await UniverseMongo.findOne({ tradingsymbol: tradingSymbol }).exec();
    }
    return null;
  } catch (error) {
    console.error('Error in getInstrumentBySymbol:', error);
    return null;
  }
};

export default {
  upsertInstrument52WeekStats,
  getAllInstrument52WeekStats,
  upsertMarketBreadth,
  getAllMarketBreadth,
  upsertScans,
  getTokenFromDB,
  upsertTokenToDB,
  getScans,
  upsertUpstoxConfig,
  getUpstoxConfigs,
  getUpstoxConfigById,
  getUpstoxConfigByName,
  createUser,
  getUserByEmail,
  getUserById,
  getUserToken,
  saveChartLayout,
  getChartLayouts,
  getChartLayoutById,
  deleteChartLayout,
  getUserSettings,
  upsertUserSettings,
  savePaperTrade,
  getPaperTrades,
  getPaperPortfolio,
  upsertPaperPortfolio,
  saveAlert,
  getSaInsightByDate,
  getAllSaInsights,
  upsertSaInsight,
  deleteSaInsight,
  getUniverse,
  upsertUniverse,
  updateInstrumentDetails,
  getInstrumentBySymbol,
  getUniqueScanDates,
  getScansByDate,
};

import { sequelize } from '../../database/index.js';
import { DataTypes } from 'sequelize';

const Instrument52WeekStats = sequelize.define('Instrument52WeekStats', {
  instrumentKey: { type: DataTypes.STRING, primaryKey: true },
  tradingsymbol: { type: DataTypes.STRING, allowNull: false },
  lastSyncDate: { type: DataTypes.DATEONLY, allowNull: false },
  fiftyTwoWeekHigh: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
  fiftyTwoWeekLow: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
  lastPrice: { type: DataTypes.DECIMAL(15, 4) },
  ema10: { type: DataTypes.DECIMAL(15, 4) },
  ema21: { type: DataTypes.DECIMAL(15, 4) },
  ema50: { type: DataTypes.DECIMAL(15, 4) },
  lastUpdated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  avgVolume21d: { type: DataTypes.INTEGER },
  avgVolume1w: { type: DataTypes.INTEGER },
  prevDayVolume: { type: DataTypes.INTEGER },
  avgValueVolume21d: { type: DataTypes.BIGINT },
  avgClose126d: { type: DataTypes.DECIMAL(15, 4) },
  minVolume3d: { type: DataTypes.INTEGER },       // minv3.1 volume
  trendIntensity: { type: DataTypes.DECIMAL(15, 4) },  // avgc7 / avgc65 ratio
  closePrev1: { type: DataTypes.DECIMAL(15, 4) },  // previous day close, c1
  closePrev2: { type: DataTypes.DECIMAL(15, 4) },
  priceChange: { type: DataTypes.DECIMAL(10, 4) },
}, {
  tableName: 'instrument_52week_stats',
  timestamps: false,
  underscored: true,
});

export default Instrument52WeekStats;
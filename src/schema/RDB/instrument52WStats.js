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
  prevDayVolume: { type: DataTypes.INTEGER },
  avgValueVolume21d: { type: DataTypes.BIGINT },
}, {
  tableName: 'instrument_52week_stats',
  timestamps: false,
  underscored: true,
});

export default Instrument52WeekStats;
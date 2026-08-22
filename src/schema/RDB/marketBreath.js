import { DataTypes } from 'sequelize';
import { sequelize } from '../../database/index.js';

const MarketBreadth = sequelize.define('MarketBreadth', {
  date: {
    type: DataTypes.DATEONLY,
    primaryKey: true,
    allowNull: false
  },
  up4Percent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  down4Percent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalStocks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  up20Pct5d: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  down20Pct5d: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  up8Pct5d: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  down8Pct5d: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  strongCloseUpCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  strongCloseUpRatio: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  strongCloseDownCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  strongCloseDownRatio: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  intentScoreUp: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  intentScoreDown: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  up4PercentRatio: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  down4PercentRatio: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  ratio5d: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  ratio10d: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  up80Pct52WL: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  up50RsCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  up250Rs5dCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  up25PctQuarter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  down25PctQuarter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  up25PctMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  down25PctMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  up50PctMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  down50PctMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  up13Pct34d: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  down13Pct34d: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  strongStartCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  bullishReversalCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  dollarBOCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'market_breadth',
  timestamps: false,
  underscored: true  // Enables snake_case column naming convention
});

export default MarketBreadth;

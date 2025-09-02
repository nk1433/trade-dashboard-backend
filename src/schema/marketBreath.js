import { DataTypes } from 'sequelize';
import { sequelize } from '../database/index.js';

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
  }
}, {
  tableName: 'market_breadth',
  timestamps: false,
  underscored: true  // Enables snake_case column naming convention
});

export default MarketBreadth;

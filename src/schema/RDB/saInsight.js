import { DataTypes } from 'sequelize';
import { sequelize } from '../../database/index.js';

const SaInsight = sequelize.define('SaInsight', {
  date: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  bias: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  exploitPlan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  alternativePlan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  whatHappening: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  whyHappening: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  whatNext: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tradingObjectives: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  whatCanIDo: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  winningCharacteristics: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  setupWorked: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  setupDidntWork: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sa_insights',
  timestamps: true,
  underscored: true
});

export default SaInsight;

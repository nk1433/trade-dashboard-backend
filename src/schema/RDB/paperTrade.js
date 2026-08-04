import { DataTypes } from 'sequelize';
import { sequelize } from '../../database/index.js';

const PaperTrade = sequelize.define('PaperTrade', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING, // 'BUY' or 'SELL'
        allowNull: false,
    },
    slPrice: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    riskAmount: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    riskPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    slStrategy: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    slPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'EXECUTED',
    },
}, {
    tableName: 'paper_trades',
    timestamps: true,
});

export default PaperTrade;

import { DataTypes } from 'sequelize';
import { sequelize } from '../../database/index.js';

const Alert = sequelize.define('Alert', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    indicator: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    signal: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ticker: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    open: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    close: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    dollarMove: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    volume: {
        type: DataTypes.BIGINT, // Volume can be large
        allowNull: true,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'alerts',
    timestamps: true,
});

export default Alert;

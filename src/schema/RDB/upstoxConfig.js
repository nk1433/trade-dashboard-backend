import { DataTypes } from "sequelize";
import { sequelize } from '../../database/index.js';

const UpstoxConfig = sequelize.define("UpstoxConfig", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    clientId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    clientSecret: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    redirectUri: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: "upstox_configs",
    timestamps: true,
});

export default UpstoxConfig;

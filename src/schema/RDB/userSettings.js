import { DataTypes } from "sequelize";
import { sequelize } from '../../database/index.js';

const UserSettings = sequelize.define("UserSettings", {
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    settings: {
        type: DataTypes.JSONB, // Use JSONB for Postgres to store the settings object
        defaultValue: {},
    },
}, {
    tableName: "user_settings",
    timestamps: true,
});

export default UserSettings;

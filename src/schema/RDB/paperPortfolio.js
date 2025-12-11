import { DataTypes } from "sequelize";
import { sequelize } from '../../database/index.js';

const PaperPortfolio = sequelize.define("PaperPortfolio", {
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    capital: {
        type: DataTypes.FLOAT,
        defaultValue: 1000000,
    },
    holdings: {
        type: DataTypes.JSONB, // Store holdings array as JSONB
        defaultValue: [],
    },
}, {
    tableName: "paper_portfolios",
    timestamps: true,
});

export default PaperPortfolio;

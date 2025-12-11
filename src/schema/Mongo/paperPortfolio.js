import mongoose from 'mongoose';

const paperPortfolioSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    capital: {
        type: Number,
        default: 1000000 // Default 10 Lakhs
    },
    holdings: [{
        symbol: String,
        quantity: Number,
        avgPrice: Number,
        invested: Number,
        ltp: Number,
        currentValue: Number,
        pnl: Number,
        pnlPercentage: Number,
        sl: Number
    }]
});

export default mongoose.models.PaperPortfolio || mongoose.model('PaperPortfolio', paperPortfolioSchema);

import mongoose from 'mongoose';

const paperTradeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    symbol: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    type: { type: String, required: true }, // 'BUY' or 'SELL'
    slPrice: { type: Number, default: 0 },
    riskAmount: { type: Number, default: 0 },
    riskPercentage: { type: Number, default: 0 },
    slStrategy: { type: String, default: '' },
    slPercentage: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'EXECUTED' },
}, { timestamps: true });

const PaperTrade = mongoose.model('PaperTrade', paperTradeSchema);

export default PaperTrade;

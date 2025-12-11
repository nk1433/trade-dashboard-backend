import mongoose from 'mongoose';

const paperTradeSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    symbol: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['BUY', 'SELL'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'EXECUTED'
    }
});

export default mongoose.models.PaperTrade || mongoose.model('PaperTrade', paperTradeSchema);

import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
    indicator: { type: String, required: true },
    signal: { type: String, required: true },
    ticker: { type: String, required: true },
    price: { type: Number, required: true },
    open: { type: Number },
    close: { type: Number },
    dollarMove: { type: Number }, // derived or passed
    volume: { type: Number },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;

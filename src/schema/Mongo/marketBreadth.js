import mongoose from 'mongoose';

const MarketBreadthSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,  // primary key equivalent
  },
  up4Percent: {
    type: Number,
    required: true,
    default: 0,
  },
  down4Percent: {
    type: Number,
    required: true,
    default: 0,
  },
  totalStocks: {
    type: Number,
    required: true,
    default: 0,
  },
  up20Pct5d: {
    type: Number,
    required: true,
    default: 0,
  },
  down20Pct5d: {
    type: Number,
    required: true,
    default: 0,
  },
}, {
  collection: 'market_breadth',
  timestamps: false,
});

const MarketBreadth = mongoose.model('MarketBreadth', MarketBreadthSchema);

export default MarketBreadth;

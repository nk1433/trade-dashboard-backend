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
  up8Pct5d: {
    type: Number,
    required: true,
    default: 0,
  },
  down8Pct5d: {
    type: Number,
    required: true,
    default: 0,
  },
  strongCloseUpCount: {
    type: Number,
    required: true,
    default: 0,
  },
  strongCloseUpRatio: {
    type: Number,
    required: true,
    default: 0,
  },
  strongCloseDownCount: {
    type: Number,
    required: true,
    default: 0,
  },
  strongCloseDownRatio: {
    type: Number,
    required: true,
    default: 0,
  },
  intentScoreUp: {
    type: Number,
    required: true,
    default: 0,
  },
  intentScoreDown: {
    type: Number,
    required: true,
    default: 0,
  },
  up4PercentRatio: {
    type: Number,
    required: false,
    default: 0,
  },
  down4PercentRatio: {
    type: Number,
    required: false,
    default: 0,
  },
  ratio5d: {
    type: Number,
    required: false,
    default: 0,
  },
  ratio10d: {
    type: Number,
    required: false,
    default: 0,
  },
  up80Pct52WL: {
    type: Number,
    required: false,
    default: 0,
  },
  up50RsCount: {
    type: Number,
    required: false,
    default: 0,
  },
  up250Rs5dCount: {
    type: Number,
    required: false,
    default: 0,
  },
  up25PctQuarter: {
    type: Number,
    required: false,
    default: 0,
  },
  down25PctQuarter: {
    type: Number,
    required: false,
    default: 0,
  },
  up25PctMonth: {
    type: Number,
    required: false,
    default: 0,
  },
  down25PctMonth: {
    type: Number,
    required: false,
    default: 0,
  },
  up50PctMonth: {
    type: Number,
    required: false,
    default: 0,
  },
  down50PctMonth: {
    type: Number,
    required: false,
    default: 0,
  },
  up13Pct34d: {
    type: Number,
    required: false,
    default: 0,
  },
  down13Pct34d: {
    type: Number,
    required: false,
    default: 0,
  },
  strongStartCount: {
    type: Number,
    required: false,
    default: 0,
  },
  bullishReversalCount: {
    type: Number,
    required: false,
    default: 0,
  }
}, {
  collection: 'market_breadth',
  timestamps: false,
});

const MarketBreadth = mongoose.model('MarketBreadth', MarketBreadthSchema);

export default MarketBreadth;

import mongoose from 'mongoose';

const Instrument52WeekStatsSchema = new mongoose.Schema({
  instrumentKey: {
    type: String,
    required: true,
    unique: true,
  },
  tradingsymbol: {
    type: String,
    required: true,
  },
  lastSyncDate: {
    type: Date,
    required: true,
  },
  fiftyTwoWeekHigh: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
  },
  fiftyTwoWeekLow: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
  },
  lastPrice: {
    type: mongoose.Schema.Types.Decimal128,
    default: null,
  },
  ema10: {
    type: mongoose.Schema.Types.Decimal128,
    default: null,
  },
  ema21: {
    type: mongoose.Schema.Types.Decimal128,
    default: null,
  },
  ema50: {
    type: mongoose.Schema.Types.Decimal128,
    default: null,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  avgVolume21d: {
    type: Number,
    default: null,
  },
  prevDayVolume: { 
    type: Number,
    default: null,
  },
}, {
  collection: 'instrument_52week_stats',
  timestamps: false,
});

Instrument52WeekStatsSchema.set('toJSON', {
  transform: (doc, ret) => {
    ['ema10', 'ema21', 'ema50', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'lastPrice'].forEach(field => {
      if (ret[field] && ret[field]._bsontype === 'Decimal128') {
        ret[field] = ret[field].toString();
      }
    });
    return ret;
  }
});

Instrument52WeekStatsSchema.set('toObject', {
  transform: (doc, ret) => {
    ['ema10', 'ema21', 'ema50', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'lastPrice'].forEach(field => {
      if (ret[field] && ret[field]._bsontype === 'Decimal128') {
        ret[field] = ret[field].toString();
      }
    });
    return ret;
  }
})

const Instrument52WeekStats = mongoose.model('Instrument52WeekStats', Instrument52WeekStatsSchema);

export default Instrument52WeekStats;

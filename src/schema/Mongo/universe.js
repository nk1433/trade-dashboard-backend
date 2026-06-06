import mongoose from 'mongoose';

const UniverseSchema = new mongoose.Schema({
  instrument_key: {
    type: String,
    required: true,
    unique: true,
  },
  exchange_token: {
    type: String,
  },
  tradingsymbol: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  tick_size: {
    type: Number,
  },
  lot_size: {
    type: Number,
  },
  instrument_type: {
    type: String,
  },
  exchange: {
    type: String,
  },
  last_price: {
    type: Number,
  },
  industry: {
    type: String,
  },
  sector: {
    type: String,
  }
}, {
  collection: 'universe',
  timestamps: true,
});

const Universe = mongoose.model('Universe', UniverseSchema);

export default Universe;

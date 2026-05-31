import mongoose from 'mongoose';

const saInsightSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  bias: { type: String, default: '' },
  exploitPlan: { type: String, default: '' },
  alternativePlan: { type: String, default: '' },
  whatHappening: { type: String, default: '' },
  whyHappening: { type: String, default: '' },
  whatNext: { type: String, default: '' },
  tradingObjectives: { type: String, default: '' },
  whatCanIDo: { type: String, default: '' },
  winningCharacteristics: { type: String, default: '' },
  setupWorked: { type: String, default: '' },
  setupDidntWork: { type: String, default: '' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.models.SaInsight || mongoose.model('SaInsight', saInsightSchema);

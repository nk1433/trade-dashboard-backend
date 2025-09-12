export function calculateEMA(candles, period) {
  if (candles.length < period) return null;
  const closes = candles.map(candle => candle[4]);
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return parseFloat(ema.toFixed(4));
};

export function calculateIncrementalEMA(previousEMA, closePrice, period) {
  if (previousEMA === null || previousEMA === undefined) {
    // If no previous EMA, initialize it with closePrice
    return closePrice;
  }
  const k = 2 / (period + 1);
  const ema = (closePrice * k) + (previousEMA * (1 - k));
  return parseFloat(ema.toFixed(4));
}

export function calculate52WeekHighLow(candles) {
  let high = -Infinity;
  let low = Infinity;
  for (const candle of candles) {
    if (candle[2] > high) high = candle[2];
    if (candle[3] < low) low = candle[3];
  }
  return { high, low };
}

export function calculateAverageVolume(candles, period = 21) {
  if (candles.length < period) return null;
  const volumes = candles.slice(-period).map(c => c[5]);
  const avg = volumes.reduce((sum, v) => sum + v, 0) / period;
  return Math.round(avg);
}

export function calculatePctChange5Days(candles) {
  // Assumes candles are sorted ascending by date
  candles.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const pctChangeMap = new Map();

  for (let i = 5; i < candles.length; i++) {
    const currentDate = candles[i][0].split('T')[0];
    const closeToday = candles[i][4];
    const close5DaysAgo = candles[i - 5][4];
    const pctChange = ((closeToday - close5DaysAgo) / close5DaysAgo) * 100;
    pctChangeMap.set(currentDate, pctChange);
  }
  return pctChangeMap; // Map(date => pctChange over 5 days)
}

export function calculateAverageValueVolume(candles, days = 21) {
  if (!candles || candles.length < days) return null;
  // For each of the last `days` candles: close price * volume
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const candle = candles[i];
    const close = parseFloat(candle[4]); // Assuming 0=timestamp, 4=close, 5=volume
    const volume = parseInt(candle[5]);
    sum += close * volume;
  }
  return Math.round(sum / days);
}
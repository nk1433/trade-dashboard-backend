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
  // Use slice(0, period) because candles are usually sorted Newest -> Oldest (index 0 is today)
  const volumes = candles.slice(0, period).map(c => c[5]);
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

export function calculatePriceDiff5Days(candles) {
  // Assumes candles are sorted ascending by date
  candles.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const priceDiffMap = new Map();

  for (let i = 5; i < candles.length; i++) {
    const currentDate = candles[i][0].split('T')[0];
    const closeToday = candles[i][4];
    const close5DaysAgo = candles[i - 5][4];
    const diff = closeToday - close5DaysAgo;
    priceDiffMap.set(currentDate, diff);
  }
  return priceDiffMap;
}

export function calculatePctChangeNDays(candles, days) {
  // Assumes candles are already sorted or sorting is cheap enough (sorting is done in place usually, but caller might have done it)
  // To be safe we sort again or rely on caller? 
  // Let's sort to be safe as other funcs do.
  candles.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const pctChangeMap = new Map();

  for (let i = days; i < candles.length; i++) {
    const currentDate = candles[i][0].split('T')[0];
    const closeToday = candles[i][4];
    const closeNDaysAgo = candles[i - days][4];
    // Avoid division by zero
    if (closeNDaysAgo !== 0) {
      const pctChange = ((closeToday - closeNDaysAgo) / closeNDaysAgo) * 100;
      pctChangeMap.set(currentDate, pctChange);
    }
  }
  return pctChangeMap;
}

export function calculateAverageValueVolume(candles, days = 21) {
  if (!candles || candles.length < days) return null;
  // For each of the last `days` candles: close price * volume
  // Assumes candles are Newest -> Oldest (index 0 is today)
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const candle = candles[i];
    const close = parseFloat(candle[4]); // Assuming 0=timestamp, 4=close, 5=volume
    const volume = parseInt(candle[5]);
    sum += close * volume;
  }
  return Math.round(sum / days);
}

export function calculateAverageClose(arr) {
  const sumClose = arr.reduce((sum, c) => {
    const closePrice = c[4];

    return sum + closePrice;
  }, 0);

  return sumClose / arr.length;
}

export function calculateMovingAverageNDays(candles, days) {
  candles.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const maMap = new Map();

  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    const currentDate = candles[i][0].split('T')[0];
    const closeToday = candles[i][4];
    sum += closeToday;

    if (i >= days) {
      const closeNDaysAgo = candles[i - days][4];
      sum -= closeNDaysAgo;
      maMap.set(currentDate, sum / days);
    } else if (i === days - 1) {
      maMap.set(currentDate, sum / days);
    }
  }
  return maMap;
}

export function calculateMinLow5DaysMap(candles) {
  // Assumes candles are sorted ascending by date (oldest to newest)
  candles.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const minLowMap = new Map();

  for (let i = 4; i < candles.length; i++) {
    const currentDate = candles[i][0].split('T')[0];
    let minLow = candles[i][3]; // low of current day
    for (let j = 1; j < 5; j++) {
      if (candles[i - j][3] < minLow) minLow = candles[i - j][3];
    }
    minLowMap.set(currentDate, minLow);
  }
  return minLowMap;
}

export function calculateMinVolume3DaysMap(candles) {
  // Assumes candles are sorted ascending by date (oldest to newest)
  candles.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const minVolMap = new Map();

  // We need 3 days prior to the current day, so we need at least 3 previous days
  for (let i = 3; i < candles.length; i++) {
    const currentDate = candles[i][0].split('T')[0];
    let minVol = candles[i - 1][5]; // start with 1 day ago
    for (let j = 2; j <= 3; j++) {
      if (candles[i - j][5] < minVol) minVol = candles[i - j][5];
    }
    minVolMap.set(currentDate, minVol);
  }
  return minVolMap;
}
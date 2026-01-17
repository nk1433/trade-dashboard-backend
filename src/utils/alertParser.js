/**
 * Parses a raw alert string into a structured Alert object.
 * Follows functional paradigm: pure function, no side effects.
 * 
 * Supported Format:
 * Name | Ticker | Price: <val> | Vol: <val> | Time: <val>
 * 
 * @param {string} rawText The raw string from the webhook
 * @returns {Object} Structured alert data
 */
export const parseAlert = (rawText) => {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error("Invalid input: rawText must be a non-empty string");
    }

    const parts = rawText.split(' | ').map(p => p.trim());

    if (parts.length < 3) {
        throw new Error("Invalid format: Insufficient parts in alert string");
    }

    // Helper functions for extraction
    const extractValue = (part, prefix) => {
        if (!part.startsWith(prefix)) return null;
        return part.replace(prefix, '').trim();
    }

    const parseNumber = (str) => {
        const num = parseFloat(str);
        return isNaN(num) ? null : num;
    }

    // Functional extraction
    // Part 0: Name (Indicator + Signal potentially, or just Name)
    const namePart = parts[0];

    // Part 1: Ticker
    const ticker = parts[1];

    // Other Parts: Dynamic lookup based on prefix
    // We create a map of available parts for easier lookup if order varies, 
    // but the request implies specific order. Let's try to be flexible but predictable.

    const findPart = (prefix) => parts.find(p => p.startsWith(prefix));

    const priceStr = findPart("Price: ");
    const volStr = findPart("Vol: ") || findPart("Volume: "); // Fallback for flexibility
    const timeStr = findPart("Time: ");

    // Legacy support check (Day Range)
    const rangeStr = findPart("Day Range: ");

    // Construct Data
    const price = priceStr ? parseNumber(extractValue(priceStr, "Price: ")) : 0;
    const volume = volStr ? parseNumber(extractValue(volStr, "Vol: ") || extractValue(volStr, "Volume: ")) : 0;
    const timestamp = timeStr ? extractValue(timeStr, "Time: ") : new Date().toISOString();

    // Derive fields
    // indicator: namePart
    // signal: default 'ALERT' or extract if needed (e.g. SLTB Alert -> Signal could be inferred)
    // For "SLTB Alert", Indicator=SLTB, Signal=Alert? Or Indicator=SLTB Alert, Signal=Trigger?
    // User said "part 1 will be the name". Let's map entire part 0 to indicator for now.

    const indicator = namePart;
    const signal = 'ALERT'; // Default signal type

    // Handling Open/Close if Range is present (Legacy/Variation)
    let open = null;
    let close = price; // Current price is effectively close of the bar or moment
    let dollarMove = null;

    if (rangeStr) {
        const ranges = extractValue(rangeStr, "Day Range: ").split(' to ');
        if (ranges.length === 2) {
            open = parseNumber(ranges[0]);
            // Close might be the user provided close or the upper range? 
            // Usually range is Low to High or Open to Close. 
            // In the previous code: "40 to 100" -> Open=40, Close=100.
            const rangeClose = parseNumber(ranges[1]);
            // logic check: currentPrice vs rangeClose? 
            // let's stick to the previous interpretation if range exists.
            open = parseNumber(ranges[0]);
            const distinctClose = parseNumber(ranges[1]); // Renamed to avoid confusion
            if (distinctClose !== null) close = distinctClose;
        }
    }

    if (open !== null && close !== null) {
        dollarMove = (close - open).toFixed(2);
    }

    return {
        indicator,
        signal,
        ticker,
        price,
        open,
        close,
        dollarMove,
        volume,
        timestamp
    };
};

import dbWrapper from '../utils/dbWrapper.js';
import axios from 'axios';

// ── Sandbox helper ────────────────────────────────────────────────────────────
const SANDBOX_BASE = 'https://api-sandbox.upstox.com';

const sandboxHeaders = () => {
    const token = process.env.UPSTOX_SANDBOX_ACCESS_TOKEN;
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
};

/**
 * Places an order in the Upstox sandbox environment.
 * Awaits response and logs details for debugging/verification.
 */
const mirrorToSandbox = async (orderPayload) => {
    const sandboxToken = process.env.UPSTOX_SANDBOX_ACCESS_TOKEN;
    if (!sandboxToken) {
        console.error("[PaperTrade Sandbox] Placement aborted: UPSTOX_SANDBOX_ACCESS_TOKEN is missing in process.env");
        throw new Error("UPSTOX_SANDBOX_ACCESS_TOKEN is not configured on the server. Please check your backend .env file.");
    }
    if (!orderPayload.instrument_token) {
        console.error("[PaperTrade Sandbox] Placement aborted: Missing instrument_token in payload");
        throw new Error("Unable to place sandbox order: Missing instrument_token.");
    }

    const body = {
        quantity: Number(orderPayload.quantity),
        product: orderPayload.product || 'D',
        validity: orderPayload.validity || 'DAY',
        price: Number(orderPayload.price) ?? 0,
        tag: orderPayload.tag || 'paper-trade',
        instrument_token: orderPayload.instrument_token,
        order_type: orderPayload.order_type || 'MARKET',
        transaction_type: orderPayload.transaction_type,
        disclosed_quantity: Number(orderPayload.disclosed_quantity) ?? 0,
        trigger_price: Number(orderPayload.trigger_price) ?? 0,
        is_amo: orderPayload.is_amo ?? false,
        slice: orderPayload.slice ?? false,
    };

    // If order type is MARKET, price must be 0
    if (body.order_type === 'MARKET') {
        body.price = 0;
    }

    // Upstox requires trigger_price for stop loss (SL, SL-M) orders. For limit/market, trigger_price should be 0.
    if (body.order_type !== 'SL' && body.order_type !== 'SL-M') {
        body.trigger_price = 0;
    }

    const url = `${SANDBOX_BASE}/v3/order/place`;

    console.log(`[PaperTrade Sandbox] Sending POST request to: ${url}`);
    console.log(`[PaperTrade Sandbox] Payload:`, JSON.stringify(body, null, 2));
    console.log(`[PaperTrade Sandbox] Auth Token Prefix: ${sandboxToken.substring(0, 15)}...`);

    try {
        const resp = await axios.post(url, body, { headers: sandboxHeaders() });
        console.log(`[PaperTrade Sandbox] Order Placed Successfully!`);
        console.log(`[PaperTrade Sandbox] Response Data:`, JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (err) {
        console.error(`[PaperTrade Sandbox] Request failed!`);
        if (err.response) {
            console.error(`[PaperTrade Sandbox] HTTP Status: ${err.response.status}`);
            console.error(`[PaperTrade Sandbox] Error Data:`, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(`[PaperTrade Sandbox] Error Message: ${err.message}`);
        }
        throw err;
    }
};

export const placeOrder = async (req, res) => {
    try {
        const {
            userId, symbol, quantity, price, type, sl, slPrice,
            riskAmount, riskPercentage, slStrategy, slPercentage,
            // Upstox sandbox fields (optional)
            instrument_token, product, validity, order_type, disclosed_quantity,
            trigger_price, is_amo, slice, tag,
        } = req.body;

        if (!userId || !symbol || !quantity || !price || !type) {
            return res.status(400).json({ status: 'error', error: 'Missing required fields' });
        }

        // 1. Resolve Instrument Key / Token
        let resolvedInstrumentToken = instrument_token;
        if (!resolvedInstrumentToken) {
            const inst = await dbWrapper.getInstrumentBySymbol(symbol);
            if (inst && inst.instrument_key) {
                resolvedInstrumentToken = inst.instrument_key;
            }
        }

        if (!resolvedInstrumentToken) {
            return res.status(400).json({
                status: 'error',
                error: `Unable to resolve instrument token for symbol ${symbol}. Please ensure it exists in the universe database.`
            });
        }

        // 2. Perform Sandbox Placement synchronously (blocking)
        let sandboxResult = null;
        try {
            sandboxResult = await mirrorToSandbox({
                instrument_token: resolvedInstrumentToken,
                quantity,
                product,
                validity,
                price,
                tag,
                order_type,
                transaction_type: type, // BUY / SELL
                disclosed_quantity,
                trigger_price: trigger_price || slPrice || sl || 0,
                is_amo,
                slice,
            });
        } catch (sandboxError) {
            console.error('[PaperTrade Sandbox] Place order failed:', sandboxError.response?.data || sandboxError.message);
            const status = sandboxError.response?.status || 400;
            const apiError = sandboxError.response?.data || { error: sandboxError.message };

            // Check for standard structure: { errors: [{ message, errorCode }] }
            const errorMsg = apiError.errors?.[0]?.message || apiError.message || JSON.stringify(apiError);
            return res.status(status).json({
                status: 'error',
                error: `Sandbox Order Failed: ${errorMsg}`
            });
        }

        // 3. Find or create portfolio
        let portfolio = await dbWrapper.getPaperPortfolio(userId);
        if (!portfolio) {
            portfolio = { userId, capital: 1000000, holdings: [] };
        } else {
            if (portfolio.toJSON) portfolio = portfolio.toJSON();
            else if (portfolio.toObject) portfolio = portfolio.toObject();
        }

        const totalCost = quantity * price;

        if (type === 'BUY') {
            if (portfolio.capital < totalCost) {
                return res.status(400).json({ status: 'error', error: 'Insufficient funds' });
            }

            // Deduct capital
            portfolio.capital -= totalCost;

            // Update holdings
            if (!portfolio.holdings) portfolio.holdings = [];

            const existingHoldingIndex = portfolio.holdings.findIndex(h => h.symbol === symbol);

            if (existingHoldingIndex !== -1) {
                const existingHolding = portfolio.holdings[existingHoldingIndex];
                const totalQuantity = existingHolding.quantity + quantity;
                const totalInvested = (existingHolding.quantity * existingHolding.avgPrice) + totalCost;

                // Update the holding in the array
                portfolio.holdings[existingHoldingIndex] = {
                    ...existingHolding,
                    quantity: totalQuantity,
                    avgPrice: totalInvested / totalQuantity,
                    invested: totalInvested,
                    ltp: price,
                    sl: sl || existingHolding.sl // Update SL if provided, else keep existing
                };
            } else {
                portfolio.holdings.push({
                    symbol,
                    quantity,
                    avgPrice: price,
                    invested: totalCost,
                    ltp: price,
                    currentValue: totalCost,
                    pnl: 0,
                    pnlPercentage: 0,
                    sl: sl || 0 // Save SL
                });
            }
        } else if (type === 'SELL') {
            if (!portfolio.holdings) portfolio.holdings = [];
            const existingHoldingIndex = portfolio.holdings.findIndex(h => h.symbol === symbol);

            if (existingHoldingIndex === -1) {
                return res.status(400).json({ status: 'error', error: 'Holding not found for this symbol' });
            }

            const existingHolding = portfolio.holdings[existingHoldingIndex];

            if (existingHolding.quantity < quantity) {
                return res.status(400).json({ status: 'error', error: `Insufficient quantity. You have ${existingHolding.quantity}, trying to sell ${quantity}` });
            }

            // Calculate details
            const saleValue = quantity * price;
            const avgBuyPrice = existingHolding.avgPrice;
            const realizedPnL = (price - avgBuyPrice) * quantity;

            // Update Capital (Principle + Profit/Loss)
            portfolio.capital += saleValue;

            // Update Holding
            const remainingQuantity = existingHolding.quantity - quantity;

            if (remainingQuantity === 0) {
                // Remove holding if sold out
                portfolio.holdings.splice(existingHoldingIndex, 1);
            } else {
                // Update existing holding
                portfolio.holdings[existingHoldingIndex] = {
                    ...existingHolding,
                    quantity: remainingQuantity,
                    invested: remainingQuantity * avgBuyPrice,
                    ltp: price,
                    currentValue: remainingQuantity * price,
                };
            }
        }

        // Save Portfolio via wrapper
        await dbWrapper.upsertPaperPortfolio(userId, {
            capital: portfolio.capital,
            holdings: portfolio.holdings
        });

        // Save Trade Record via wrapper
        const tradeData = {
            userId,
            symbol,
            quantity,
            price,
            type,
            slPrice: slPrice || 0,
            riskAmount: riskAmount || 0,
            riskPercentage: riskPercentage || 0,
            slStrategy: slStrategy || '',
            slPercentage: slPercentage || 0,
            instrument_token: resolvedInstrumentToken || null,
            sandboxOrderIds: sandboxResult?.data?.order_ids || null,
            status: 'EXECUTED',
            timestamp: new Date()
        };
        const trade = await dbWrapper.savePaperTrade(tradeData);

        res.status(200).json({ status: 'success', data: { trade, portfolio } });

    } catch (error) {
        console.error('Error placing paper order:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
};

export const getPortfolio = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ status: 'error', error: 'Missing userId' });
        }

        let portfolio = await dbWrapper.getPaperPortfolio(userId);
        if (!portfolio) {
            // Return default if not found
            portfolio = { capital: 1000000, holdings: [] };
        } else {
            if (portfolio.toJSON) portfolio = portfolio.toJSON();
            else if (portfolio.toObject) portfolio = portfolio.toObject();
        }

        try {
            // Update LTP from Stats
            const stats = await dbWrapper.getAllInstrument52WeekStats();
            const priceMap = new Map();
            if (stats && Array.isArray(stats)) {
                stats.forEach(s => {
                    const data = s.dataValues || s;
                    if (data.tradingsymbol && data.lastPrice) {
                        priceMap.set(data.tradingsymbol, parseFloat(data.lastPrice));
                    }
                });
            }

            if (portfolio.holdings && Array.isArray(portfolio.holdings)) {
                portfolio.holdings = portfolio.holdings.map(h => {
                    const currentLtp = priceMap.get(h.symbol) || h.ltp;
                    if (currentLtp) {
                        const ltp = parseFloat(currentLtp);
                        const quantity = h.quantity;
                        const avgPrice = h.avgPrice;
                        // Recalculate values
                        const currentValue = quantity * ltp;
                        // Invested could be calculated or taken from DB. 
                        // To be consistent with placeOrder: invested = quantity * avgPrice
                        // But let's respect existing field if avgPrice integrity is maintained.
                        // Actually, placeOrder updates 'invested' field.
                        const invested = h.invested || (quantity * avgPrice);
                        const pnl = currentValue - invested;
                        const pnlPercentage = invested > 0 ? (pnl / invested) * 100 : 0;

                        return {
                            ...h,
                            ltp,
                            currentValue,
                            pnl,
                            pnlPercentage
                        };
                    }
                    return h;
                });
            }
        } catch (innerError) {
            console.error('Error updating portfolio LTPs:', innerError);
            // Non-fatal, return portfolio as is
        }

        res.status(200).json({ status: 'success', data: portfolio });
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
};

export const getTrades = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ status: 'error', error: 'Missing userId' });
        }

        const trades = await dbWrapper.getPaperTrades(userId);
        res.status(200).json({ status: 'success', data: trades });
    } catch (error) {
        console.error('Error fetching trades:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
};

export const updateHolding = async (req, res) => {
    try {
        const { userId, symbol, sl } = req.body;

        if (!userId || !symbol) {
            return res.status(400).json({ status: 'error', error: 'Missing required fields' });
        }

        let portfolio = await dbWrapper.getPaperPortfolio(userId);
        if (!portfolio || !portfolio.holdings) {
            return res.status(404).json({ status: 'error', error: 'Portfolio not found' });
        }

        if (portfolio.toJSON) portfolio = portfolio.toJSON();
        else if (portfolio.toObject) portfolio = portfolio.toObject();

        const holdingIndex = portfolio.holdings.findIndex(h => h.symbol === symbol);
        if (holdingIndex === -1) {
            return res.status(404).json({ status: 'error', error: 'Holding not found' });
        }

        // Update fields if provided
        if (sl !== undefined) {
            portfolio.holdings[holdingIndex].sl = sl;
        }

        // ── Modify Sandbox Stop-Loss Order if configured ─────────────────────
        const sandboxToken = process.env.UPSTOX_SANDBOX_ACCESS_TOKEN;
        if (sandboxToken && sl !== undefined) {
            try {
                // 1. Get sandbox order book
                const orderBookResp = await axios.get(
                    `${SANDBOX_BASE}/v2/order/retrieve-all`,
                    { headers: sandboxHeaders() }
                );

                const orders = orderBookResp.data?.data || [];
                // 2. Find active stop loss order for this symbol
                const activeSLOrder = orders.find(o => 
                    o.trading_symbol === symbol &&
                    o.transaction_type === 'SELL' &&
                    (o.order_type === 'SL' || o.order_type === 'SL-M') &&
                    !(o.status?.toLowerCase() === 'complete' || 
                      o.status?.toLowerCase() === 'filled' || 
                      o.status?.toLowerCase() === 'rejected' || 
                      o.status?.toLowerCase() === 'cancelled')
                );

                if (activeSLOrder) {
                    console.log(`[PaperTrade Sandbox] Found active stop loss order ${activeSLOrder.order_id} for ${symbol}. Modifying to breakeven price: ${sl}`);
                    
                    const modifyBody = {
                        order_id: activeSLOrder.order_id,
                        quantity: activeSLOrder.quantity,
                        order_type: 'SL', // Set to SL (Stop Loss Limit)
                        validity: 'DAY',
                        price: Number(sl),         // Limit price = Breakeven price
                        trigger_price: Number(sl), // Trigger price = Breakeven price
                        disclosed_quantity: 0
                    };

                    const modifyResp = await axios.put(
                        `${SANDBOX_BASE}/v3/order/modify`,
                        modifyBody,
                        { headers: sandboxHeaders() }
                    );
                    console.log(`[PaperTrade Sandbox] SL order modified successfully:`, modifyResp.data);
                } else {
                    console.log(`[PaperTrade Sandbox] No active stop-loss order found for ${symbol} to modify.`);
                }
            } catch (sandboxError) {
                console.error(`[PaperTrade Sandbox] Failed to modify SL order on sandbox:`, sandboxError.response?.data || sandboxError.message);
            }
        }

        // Save Portfolio via wrapper
        await dbWrapper.upsertPaperPortfolio(userId, {
            capital: portfolio.capital,
            holdings: portfolio.holdings
        });

        res.status(200).json({ status: 'success', data: portfolio });

    } catch (error) {
        console.error('Error updating holding:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
};

// ── Modify Order (sandbox only) ───────────────────────────────────────────────
export const modifyOrder = async (req, res) => {
    try {
        const sandboxToken = process.env.UPSTOX_SANDBOX_ACCESS_TOKEN;
        if (!sandboxToken) {
            return res.status(500).json({ status: 'error', error: 'UPSTOX_SANDBOX_ACCESS_TOKEN not configured' });
        }

        const { order_id, quantity, order_type, validity, price, trigger_price, disclosed_quantity } = req.body;

        if (!order_id) {
            return res.status(400).json({ status: 'error', error: 'Missing order_id' });
        }

        const body = {
            order_id,
            quantity,
            order_type,
            validity: validity || 'DAY',
            price: price ?? 0,
            trigger_price: trigger_price ?? 0,
            disclosed_quantity: disclosed_quantity ?? 0,
        };

        const resp = await axios.put(
            `${SANDBOX_BASE}/v3/order/modify`,
            body,
            { headers: sandboxHeaders() }
        );

        console.log('[PaperTrade Sandbox] Order modified:', order_id, resp.data);
        res.status(resp.status).json({ ...resp.data, _sandbox: true });
    } catch (error) {
        console.error('[PaperTrade Sandbox] Modify order failed:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data || { error: 'Internal server error' };
        res.status(status).json(message);
    }
};

export default {
    placeOrder,
    getPortfolio,
    getTrades,
    updateHolding,
    modifyOrder,
};

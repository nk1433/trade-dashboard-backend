import dbWrapper from '../utils/dbWrapper.js';

export const placeOrder = async (req, res) => {
    try {
        const { userId, symbol, quantity, price, type, sl } = req.body;

        if (!userId || !symbol || !quantity || !price || !type) {
            return res.status(400).json({ status: 'error', error: 'Missing required fields' });
        }

        // Find or create portfolio
        let portfolio = await dbWrapper.getPaperPortfolio(userId);
        if (!portfolio) {
            portfolio = { userId, capital: 1000000, holdings: [] };
        } else {
            // Ensure portfolio is a plain object if needed, or handle Sequelize/Mongoose instance
            // For simplicity, we'll treat it as an object. 
            // If it's a Mongoose doc, .toObject() might be needed, but dbWrapper usually returns docs.
            // If it's Sequelize, .toJSON() might be needed.
            // However, we can just access properties directly usually.
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
            // Ensure holdings is an array (Sequelize JSONB might return null if empty)
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
            // Implement SELL logic later if needed
            return res.status(501).json({ status: 'error', error: 'SELL not implemented yet' });
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

export default {
    placeOrder,
    getPortfolio,
    getTrades
};

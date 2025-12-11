import PaperTrade from '../models/paperTrade.js';
import PaperPortfolio from '../models/paperPortfolio.js';

export const placeOrder = async (req, res) => {
    try {
        const { userId, symbol, quantity, price, type, sl } = req.body;

        if (!userId || !symbol || !quantity || !price || !type) {
            return res.status(400).json({ status: 'error', error: 'Missing required fields' });
        }

        // Find or create portfolio
        let portfolio = await PaperPortfolio.findOne({ userId });
        if (!portfolio) {
            portfolio = new PaperPortfolio({ userId, capital: 1000000, holdings: [] });
        }

        const totalCost = quantity * price;

        if (type === 'BUY') {
            if (portfolio.capital < totalCost) {
                return res.status(400).json({ status: 'error', error: 'Insufficient funds' });
            }

            // Deduct capital
            portfolio.capital -= totalCost;

            // Update holdings
            const existingHolding = portfolio.holdings.find(h => h.symbol === symbol);
            if (existingHolding) {
                const totalQuantity = existingHolding.quantity + quantity;
                const totalInvested = (existingHolding.quantity * existingHolding.avgPrice) + totalCost;
                existingHolding.quantity = totalQuantity;
                existingHolding.avgPrice = totalInvested / totalQuantity;
                existingHolding.invested = totalInvested;
                // LTP and other dynamic fields will be updated by frontend or separate market data sync
                existingHolding.ltp = price;
                if (sl) existingHolding.sl = sl; // Update SL if provided
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

        await portfolio.save();

        // Save Trade Record
        const trade = new PaperTrade({
            userId,
            symbol,
            quantity,
            price,
            type,
            status: 'EXECUTED'
        });
        await trade.save();

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

        let portfolio = await PaperPortfolio.findOne({ userId });
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

        const trades = await PaperTrade.find({ userId }).sort({ timestamp: -1 });
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

import dbWrapper from '../utils/dbWrapper.js';

export const placeOrder = async (req, res) => {
    try {
        const { userId, symbol, quantity, price, type, sl, slPrice, riskAmount, riskPercentage, slStrategy, slPercentage } = req.body;

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
                // Avg Price remains the same for remaining shares
                portfolio.holdings[existingHoldingIndex] = {
                    ...existingHolding,
                    quantity: remainingQuantity,
                    invested: remainingQuantity * avgBuyPrice,
                    ltp: price,
                    currentValue: remainingQuantity * price, // approximate current value
                };
            }

            // Add PnL to the response or tracking if needed
            // currently just updating capital is enough for the "account" view
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

export default {
    placeOrder,
    getPortfolio,
    getTrades,
    updateHolding
};

import express from 'express';
import axios from 'axios';
import verifyToken from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.post('/place-order', async (req, res) => {
    try {
        const accessToken = req.headers['upstox-token']; // Expect "Bearer <token>"
        if (!accessToken) {
            return res.status(401).json({ error: 'Missing Upstox-Token header' });
        }

        const orderPayload = req.body;

        if (!orderPayload || !orderPayload.instrument_token || !orderPayload.quantity) {
            return res.status(400).json({ error: 'Invalid order payload' });
        }

        const response = await axios.post(
            'https://api-hft.upstox.com/v3/order/place',
            orderPayload,
            {
                headers: {
                    Authorization: accessToken,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }
        );
        console.log(response)

        const gttTriggerPrice = orderPayload.trigger_price; // exit price / stop loss price
        const quantityBought = orderPayload.quantity;
        const instrumentToken = orderPayload.instrument_token;
        const product = 'D';
        const transactionType = 'SELL'; // Typically GTT stop loss is opposite side of the buy

        const gttPayload = {
            type: "SINGLE",
            quantity: quantityBought,
            product: product,
            rules: [
                {
                    strategy: "ENTRY",
                    trigger_type: "BELOW",      // since stop loss triggers when price falls below exit price
                    trigger_price: gttTriggerPrice,
                }
            ],
            instrument_token: instrumentToken,
            transaction_type: transactionType,
        };

        // Place GTT order using Upstox GTT API
        const gttResponse = await axios.post(
            'https://api.upstox.com/v3/order/gtt/place',
            gttPayload,
            {
                headers: {
                    Authorization: accessToken,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                }
            }
        );

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error placing order:', error.response ? error.response.data : error.message);
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data : { error: 'Internal server error' };
        res.status(status).json(message);
    }
});

export default router;

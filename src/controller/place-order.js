import express from 'express';
import axios from 'axios';
import verifyToken from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Shared helpers ─────────────────────────────────────────────────────────────

const LIVE_BASE = 'https://api-hft.upstox.com';
const SANDBOX_BASE = 'https://api-sandbox.upstox.com';

const upstoxHeaders = (token) => ({
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
});

const handleUpstoxError = (error, res, context) => {
    console.error(`[${context}] Error:`, error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data || { error: 'Internal server error' };
    res.status(status).json(message);
};

// ── LIVE: Place Order v3 + optional GTT stop-loss ─────────────────────────────

router.post('/place-order', verifyToken, async (req, res) => {
    try {
        const accessToken = req.headers['upstox-token'];
        if (!accessToken) {
            return res.status(401).json({ error: 'Missing Upstox-Token header' });
        }

        const orderPayload = req.body;

        if (!orderPayload?.instrument_token || !orderPayload?.quantity) {
            return res.status(400).json({ error: 'Invalid order payload — instrument_token and quantity are required' });
        }

        // Place the main order (v3 HFT endpoint)
        const response = await axios.post(
            `${LIVE_BASE}/v3/order/place`,
            orderPayload,
            { headers: upstoxHeaders(accessToken) }
        );

        console.log('[Live PlaceOrder] Response:', response.data);

        // Optionally place a GTT stop-loss if trigger_price is provided
        if (orderPayload.trigger_price && orderPayload.trigger_price > 0) {
            const gttPayload = {
                type: 'SINGLE',
                quantity: orderPayload.quantity,
                product: orderPayload.product || 'D',
                rules: [{
                    strategy: 'ENTRY',
                    trigger_type: 'BELOW',
                    trigger_price: orderPayload.trigger_price,
                }],
                instrument_token: orderPayload.instrument_token,
                transaction_type: 'SELL',
            };

            try {
                await axios.post(
                    'https://api.upstox.com/v3/order/gtt/place',
                    gttPayload,
                    { headers: upstoxHeaders(accessToken) }
                );
                console.log('[Live GTT] Stop-loss GTT placed for', orderPayload.instrument_token);
            } catch (gttError) {
                // GTT failure is non-fatal — main order succeeded
                console.error('[Live GTT] Failed to place GTT stop-loss:', gttError.response?.data || gttError.message);
            }
        }

        res.status(response.status).json(response.data);
    } catch (error) {
        handleUpstoxError(error, res, 'Live PlaceOrder');
    }
});

// ── LIVE: Modify Order v3 ─────────────────────────────────────────────────────

router.put('/modify-order', verifyToken, async (req, res) => {
    try {
        const accessToken = req.headers['upstox-token'];
        if (!accessToken) {
            return res.status(401).json({ error: 'Missing Upstox-Token header' });
        }

        const { order_id, ...modifyPayload } = req.body;

        if (!order_id) {
            return res.status(400).json({ error: 'Missing order_id in request body' });
        }

        // v3 Modify Order — PUT to HFT endpoint with order_id in body
        const response = await axios.put(
            `${LIVE_BASE}/v3/order/modify`,
            { order_id, ...modifyPayload },
            { headers: upstoxHeaders(accessToken) }
        );

        console.log('[Live ModifyOrder] Response:', response.data);
        res.status(response.status).json(response.data);
    } catch (error) {
        handleUpstoxError(error, res, 'Live ModifyOrder');
    }
});

// ── SANDBOX: Place Order v3 ───────────────────────────────────────────────────
// Uses server-side UPSTOX_SANDBOX_ACCESS_TOKEN — no user token required.
// Hits sandbox.upstox.com which executes paper trades without real money.

router.post('/sandbox/place-order', verifyToken, async (req, res) => {
    try {
        const sandboxToken = process.env.UPSTOX_SANDBOX_ACCESS_TOKEN;
        if (!sandboxToken) {
            return res.status(500).json({ error: 'UPSTOX_SANDBOX_ACCESS_TOKEN not configured on server' });
        }

        const orderPayload = req.body;

        if (!orderPayload?.instrument_token || !orderPayload?.quantity) {
            return res.status(400).json({ error: 'Invalid order payload — instrument_token and quantity are required' });
        }

        // Build the v3 place-order body; ensure required fields have defaults
        const body = {
            quantity: orderPayload.quantity,
            product: orderPayload.product || 'D',
            validity: orderPayload.validity || 'DAY',
            price: orderPayload.price ?? 0,
            tag: orderPayload.tag || 'paper-trade',
            instrument_token: orderPayload.instrument_token,
            order_type: orderPayload.order_type || 'LIMIT',
            transaction_type: orderPayload.transaction_type,
            disclosed_quantity: orderPayload.disclosed_quantity ?? 0,
            trigger_price: orderPayload.trigger_price ?? 0,
            is_amo: orderPayload.is_amo ?? false,
            slice: orderPayload.slice ?? false,
        };

        if (!body.transaction_type) {
            return res.status(400).json({ error: 'Missing transaction_type (BUY / SELL)' });
        }

        const response = await axios.post(
            `${SANDBOX_BASE}/v3/order/place`,
            body,
            { headers: upstoxHeaders(sandboxToken) }
        );

        console.log('[Sandbox PlaceOrder] Symbol:', orderPayload.instrument_token, '| Response:', response.data);
        res.status(response.status).json({
            ...response.data,
            _sandbox: true,   // flag so frontend knows this was a paper trade
        });
    } catch (error) {
        handleUpstoxError(error, res, 'Sandbox PlaceOrder');
    }
});

// ── SANDBOX: Modify Order v3 ──────────────────────────────────────────────────
// Modifies an order previously placed via the sandbox.

router.put('/sandbox/modify-order', verifyToken, async (req, res) => {
    try {
        const sandboxToken = process.env.UPSTOX_SANDBOX_ACCESS_TOKEN;
        if (!sandboxToken) {
            return res.status(500).json({ error: 'UPSTOX_SANDBOX_ACCESS_TOKEN not configured on server' });
        }

        const { order_id, ...modifyPayload } = req.body;

        if (!order_id) {
            return res.status(400).json({ error: 'Missing order_id in request body' });
        }

        // Build the v3 modify-order body
        const body = {
            order_id,
            quantity: modifyPayload.quantity,
            order_type: modifyPayload.order_type,
            validity: modifyPayload.validity || 'DAY',
            price: modifyPayload.price ?? 0,
            trigger_price: modifyPayload.trigger_price ?? 0,
            disclosed_quantity: modifyPayload.disclosed_quantity ?? 0,
        };

        const response = await axios.put(
            `${SANDBOX_BASE}/v3/order/modify`,
            body,
            { headers: upstoxHeaders(sandboxToken) }
        );

        console.log('[Sandbox ModifyOrder] order_id:', order_id, '| Response:', response.data);
        res.status(response.status).json({
            ...response.data,
            _sandbox: true,
        });
    } catch (error) {
        handleUpstoxError(error, res, 'Sandbox ModifyOrder');
    }
});

// ── SANDBOX: Get Order Book ───────────────────────────────────────────────────
// Useful to verify that sandbox orders landed correctly.

router.get('/sandbox/order-book', verifyToken, async (req, res) => {
    try {
        const sandboxToken = process.env.UPSTOX_SANDBOX_ACCESS_TOKEN;
        if (!sandboxToken) {
            return res.status(500).json({ error: 'UPSTOX_SANDBOX_ACCESS_TOKEN not configured on server' });
        }

        const response = await axios.get(
            `${SANDBOX_BASE}/v2/order/retrieve-all`,
            { headers: upstoxHeaders(sandboxToken) }
        );

        res.status(response.status).json(response.data);
    } catch (error) {
        handleUpstoxError(error, res, 'Sandbox OrderBook');
    }
});

// ── SANDBOX: Cancel Order v3 ──────────────────────────────────────────────────
// Cancels a sandbox order using order_id.

router.delete('/sandbox/cancel-order', verifyToken, async (req, res) => {
    try {
        const sandboxToken = process.env.UPSTOX_SANDBOX_ACCESS_TOKEN;
        if (!sandboxToken) {
            return res.status(500).json({ error: 'UPSTOX_SANDBOX_ACCESS_TOKEN not configured on server' });
        }

        const { order_id } = req.query;

        if (!order_id) {
            return res.status(400).json({ error: 'Missing order_id query parameter' });
        }

        const response = await axios.delete(
            `${SANDBOX_BASE}/v3/order/cancel?order_id=${order_id}`,
            { headers: upstoxHeaders(sandboxToken) }
        );

        console.log('[Sandbox CancelOrder] order_id:', order_id, '| Response:', response.data);
        res.status(response.status).json(response.data);
    } catch (error) {
        handleUpstoxError(error, res, 'Sandbox CancelOrder');
    }
});

// ── LIVE: Cancel Order v3 ─────────────────────────────────────────────────────
// Cancels a live order using order_id.

router.delete('/cancel-order', verifyToken, async (req, res) => {
    try {
        const accessToken = req.headers['upstox-token'];
        if (!accessToken) {
            return res.status(401).json({ error: 'Missing Upstox-Token header' });
        }

        const { order_id } = req.query;

        if (!order_id) {
            return res.status(400).json({ error: 'Missing order_id query parameter' });
        }

        const response = await axios.delete(
            `${LIVE_BASE}/v3/order/cancel?order_id=${order_id}`,
            { headers: upstoxHeaders(accessToken) }
        );

        console.log('[Live CancelOrder] order_id:', order_id, '| Response:', response.data);
        res.status(response.status).json(response.data);
    } catch (error) {
        handleUpstoxError(error, res, 'Live CancelOrder');
    }
});

export default router;

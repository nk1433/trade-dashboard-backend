import express from 'express';
import dbWrapper from '../utils/dbWrapper.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /settings - Fetch settings for the authenticated user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId; // Handle different token payloads
        let userSettings = await dbWrapper.getUserSettings(userId);

        if (!userSettings) {
            // Return default empty settings if not found
            return res.json({ status: 'success', data: {} });
        }

        res.json({ status: 'success', data: userSettings.settings });
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

// POST /settings - Upsert settings for the authenticated user
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const newSettings = req.body;

        const userSettings = await dbWrapper.upsertUserSettings(userId, newSettings);

        res.json({ status: 'success', data: userSettings.settings });
    } catch (error) {
        console.error('Error saving user settings:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

export default router;

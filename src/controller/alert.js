import { parseAlert } from '../utils/alertParser.js';
import dbWrapper from '../utils/dbWrapper.js';

/**
 * Handles the webhook request for alerts.
 * Uses dependency injection implicitly via imports, but logic is separated.
 * 
 * @param {Object} req Express request
 * @param {Object} res Express response
 */
export const processWebhook = async (req, res) => {
    try {
        const rawText = req.body;

        // Validation handled cleanly
        if (!rawText) {
            return res.status(400).send('Empty payload');
        }

        // Functional Pipeline: Raw -> Parsed -> Saved
        // parseAlert is a pure function
        // saveAlert is an effectful function (DB interaction)

        // 1. Parse
        let parsedAlert;
        try {
            // Handle JSON body if it happens to be passed as object
            const textInput = typeof rawText === 'object' ? JSON.stringify(rawText) : rawText;
            parsedAlert = parseAlert(textInput);
        } catch (parseError) {
            console.warn("Alert parsing failed:", parseError.message);
            return res.status(422).send(`Parsing Error: ${parseError.message}`);
        }

        // 2. Log (Side effect)
        console.log('Processing Alert:', parsedAlert);

        // 3. Save (Side effect)
        await dbWrapper.saveAlert(parsedAlert);

        // 4. Respond
        res.status(200).send('Alert Processed');

    } catch (error) {
        console.error('Unexpected error in alert webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};

export default {
    processWebhook
};

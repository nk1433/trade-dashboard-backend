import cron from 'node-cron';
import { sync52WeekStats } from '../services/statsService.js';
import { sync52WeekMarketBreadth } from '../services/marketBreadthService.js';
import { intiateAccessTokenReq } from '../ws/utils.js';

const setupCronJobs = () => {
    // Schedule task to run at 8:00 AM on weekdays (Monday to Friday)
    cron.schedule('0 8 * * 1-5', async () => {
        console.log('⏰ Running 52-week stats sync cron job...');
        try {
            await sync52WeekStats();
            console.log('✅ 52-week stats sync cron job completed.');
        } catch (error) {
            console.error('❌ Error in 52-week stats sync cron job:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // Assuming IST based on user location/context, or default to system time
    });

    // Schedule task to run at 9:00 AM on weekdays (Monday to Friday)
    cron.schedule('0 9 * * 1-5', async () => {
        console.log('⏰ Running 52-week market breadth sync cron job...');
        try {
            await sync52WeekMarketBreadth();
            console.log('✅ 52-week market breadth sync cron job completed.');
        } catch (error) {
            console.error('❌ Error in 52-week market breadth sync cron job:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // Schedule task to run at 9:00 AM and 9:15 AM on weekdays (Monday to Friday)
    cron.schedule('0,10,15 9 * * 1-5', async () => {
        console.log('⏰ Running Upstox token initiation cron job...');
        try {
            await intiateAccessTokenReq();
            console.log('✅ Upstox token initiation cron job completed.');
        } catch (error) {
            console.error('❌ Error in Upstox token initiation cron job:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('✅ Cron jobs scheduled: 52-week stats sync at 8:00 AM, Market Breadth at 9:00 AM, Token Initiation at 9:00 & 9:15 AM Mon-Fri.');
};

export default setupCronJobs;

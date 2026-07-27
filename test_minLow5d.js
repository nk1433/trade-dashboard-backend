import mongoose from 'mongoose';
import Instrument52WeekStats from './src/schema/Mongo/instrument52WStats.js';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trade-dashboard');
    
    const stats = await Instrument52WeekStats.find({}).limit(10).exec();
    console.log(`Found ${stats.length} stats in DB`);
    for (const stat of stats) {
        console.log(`Symbol: ${stat.tradingsymbol}, minLow5d: ${stat.minLow5d}, minVolume5d: ${stat.minVolume5d}`);
    }
    process.exit(0);
};

test();

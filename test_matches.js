import mongoose from 'mongoose';
import Instrument52WeekStats from './src/schema/Mongo/instrument52WStats.js';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trade-dashboard');
    
    const stats = await Instrument52WeekStats.find({}).limit(5).exec();
    console.log(`Found ${stats.length} stats in DB`);
    for (const stat of stats) {
        console.log(`Symbol: ${stat.tradingsymbol}, minLow5d: ${stat.minLow5d}, minVolume3d: ${stat.minVolume3d}`);
    }
    process.exit(0);
};

test();

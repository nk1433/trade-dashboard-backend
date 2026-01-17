import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import marketBreadthRouter from "./controller/market-breadth.js";
import statsRouter from "./controller/stats.js";
import placeOrder from "./controller/place-order.js";
import health from "./controller/health.js";
import mongoConnectionInstance from "./database/mongo.js";
import { connectWsUpstoxs } from "./ws/index.js";
import setupWebSocket from './ws/server.js'
import upstoxs from "./controller/upstoxs.js";
import scanController from "./controller/scan.js";
import scanCriteriaController from "./controller/scanCriteria.js";
import { upstoxAuth } from "./controller/auth.js";
import userController from "./controller/userController.js";
import userSettingsController from "./controller/userSettings.js";
import paperTradeController from "./controller/paperTrade.js";
import tvController from "./controller/tv.js";
import alertController from "./controller/alert.js";
import dbWrapper from "./utils/dbWrapper.js";
import multer from "multer";
import dotenv from 'dotenv';
dotenv.config();

const app = express();

await mongoConnectionInstance.connect();
connectWsUpstoxs();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'text/plain' })); // Handle plain text bodies
app.use(health);
app.use(marketBreadthRouter);
app.use(statsRouter);
app.use(placeOrder);
app.use(upstoxs);
app.use("/api/scans", scanController);
app.use("/scans", scanCriteriaController);
app.use("/api/users", userController);
app.use("/settings", userSettingsController);
app.post("/api/paper-trade/place-order", paperTradeController.placeOrder);
app.get("/api/paper-trade/portfolio", paperTradeController.getPortfolio);
app.get("/api/paper-trade/trades", paperTradeController.getTrades);
app.put("/api/paper-trade/holdings", paperTradeController.updateHolding);
app.get("/api/tv/1.1/charts", tvController.getCharts);
app.post("/api/tv/1.1/charts", multer().none(), tvController.saveChart);
app.delete("/api/tv/1.1/charts", tvController.deleteChart);
app.post('/webhook', alertController.processWebhook);

app.post('/auth/callback', upstoxAuth);

const swaggerDocument = YAML.load("./src/swagger.yaml");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default app;

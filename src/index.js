import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import marketBreadthRouter from "./controller/market-breadth.js";
import statsRouter from "./controller/stats.js";
import mongoConnectionInstance from "./database/mongo.js";

const app = express();

await mongoConnectionInstance.connect();

app.use(cors());
app.use(express.json());
app.use(marketBreadthRouter);
app.use(statsRouter);

const swaggerDocument = YAML.load("./src/swagger.yaml");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = 3015;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

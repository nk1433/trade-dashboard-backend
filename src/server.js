import http from "http";
import app from "./app.js";
import setupWebSocket from "./ws/server.js";
import setupCronJobs from "./cron/index.js";
import { intiateAccessTokenReq } from "./ws/utils.js";

const PORT = 3015;

const server = http.createServer(app);

setupWebSocket(server);
setupCronJobs();

import { sequelize } from "./database/index.js";

// ... existing code ...

const startServer = async () => {
  try {
    if (process.env.USE_MONGO !== 'true') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced');
    }

    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ User routes should be available at /api/users`);
      if (process.env.LOWER_ENV === "false") intiateAccessTokenReq();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

const gracefulShutdown = (signal) => {
  console.log(`⚠️ Received ${signal}. Closing server...`);
  server.close(() => {
    console.log("🛑 Server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

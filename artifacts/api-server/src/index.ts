import app from "./app";
import { logger } from "./lib/logger";
import { seedDemoData } from "./lib/gridlens";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  try {
    await seedDemoData();
    app.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  } catch (err) {
    logger.error({ err }, "Failed to initialize GridLens data");
    process.exit(1);
  }
}

void start();

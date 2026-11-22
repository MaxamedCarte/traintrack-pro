/**
 * Runs the app against a throwaway in-memory MongoDB, with no install needed.
 *   npm run dev:memory
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri("traintrack");
  console.log(`In-memory MongoDB running at ${uri}`);
  const env = {
    ...process.env,
    MONGODB_URI: uri,
    AUTH_SECRET: process.env.AUTH_SECRET ?? randomBytes(32).toString("hex"),
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "admin@example.com",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "change-me-now",
  };
  if (process.env.SEED !== "0") {
    const seed = spawn("npx", ["tsx", "scripts/seed.ts"], { env, stdio: "inherit" });
    await new Promise((r) => seed.on("exit", r));
  }
  console.log(`Sign in with ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`);
  const cmd = process.argv[2] === "start" ? ["next", "start"] : ["next", "dev"];
  const app = spawn("npx", cmd, { env, stdio: "inherit" });
  const stop = async () => {
    app.kill();
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  app.on("exit", stop);
}

main();

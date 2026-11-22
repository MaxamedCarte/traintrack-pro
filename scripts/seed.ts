/**
 * Loads fictional demo data into the database at MONGODB_URI.
 *   MONGODB_URI=... npm run seed
 */
import mongoose from "mongoose";
import { seedDemoData } from "../src/lib/seed-data";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI first");
  await mongoose.connect(uri);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const result = await seedDemoData();
  console.log("Seeded:", result);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Dev helper: spin up a real MongoDB via mongodb-memory-server and print the URI.
 * Usage:  npx tsx src/scripts/devdb.ts   (then copy the URI into server/.env)
 *
 * Keeps running until you press Ctrl+C — the data lives only in memory and is
 * wiped on exit, which is perfect for quick local development without installing
 * MongoDB system-wide.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

async function main(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  // eslint-disable-next-line no-console
  console.log('\n✅ In-memory MongoDB is running.');
  console.log('   MONGODB_URI =', uri, '\n');
  console.log('   Paste the above into server/.env, then run: npm run dev\n');
  console.log('   Press Ctrl+C to stop (data will be lost).\n');

  const shutdown = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start in-memory MongoDB:', err);
  process.exit(1);
});

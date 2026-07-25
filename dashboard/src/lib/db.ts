import mongoose from "mongoose";

function getMailPlatformDbUri(): string {
  const uri = process.env.MAIL_PLATFORM_DB;
  if (!uri) {
    throw new Error("MAIL_PLATFORM_DB environment variable is not set");
  }
  return uri;
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Reuse the connection across hot reloads / serverless invocations, same
// singleton shape as rentlog-property-service's config/connectDb.js.
const globalForMongoose = globalThis as unknown as { mongooseCache?: MongooseCache };

const cache: MongooseCache = globalForMongoose.mongooseCache ?? { conn: null, promise: null };
globalForMongoose.mongooseCache = cache;

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(getMailPlatformDbUri(), {
      maxPoolSize: 10,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

import express from "express";
import Redis from "ioredis";
import mongoose from "mongoose";

const app = express();
app.use(express.json());

// Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");






/*
|--------------------------------------------------------------------------
| MONGODB CONNECTION
|--------------------------------------------------------------------------
|
| Not used in current routes.
| Added only to demonstrate Redis + Mongo setup.
|
*/

const connectDb = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URL || "mongodb://localhost:27017/mongo_redis",
    );

    console.log("MongoDB connected");
  } catch (err) {
    console.log("MongoDB connection failed:", err);
    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| APPLICATION STARTUP
|--------------------------------------------------------------------------
*/

const start = async () => {
  await connectDb();

  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
};

start();


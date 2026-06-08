import express from "express";
import Redis from "ioredis";
import mongoose, { mongo } from "mongoose";

const app = express();
app.use(express.json());
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const BANNER_KEY = "app:banner";

app.post("/banner", async (req, res) => {
  await redis.set(BANNER_KEY, req.body.message || "welcome to our redis sitee");
  res.json({
    success: true,
  });
});

app.get("/banner", async (req, res) => {
  const message = await redis.get(BANNER_KEY);
  res.json({
    message,
  });
});

app.delete("/banner", async (req, res) => {
  await redis.del(BANNER_KEY);
  res.json({
    success: true,
  });
});

app.get("/banner/exists", async (req, res) => {
  const exists = await redis.exists(BANNER_KEY);
  res.json({
    exists: Boolean(exists),
  });
});

const connectDb = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URL || "mongodb://localhost:27017/mongo_redis",
    );
    console.log("MongoDB connected");
  } catch (err) {
    console.log("mongoose conneciton failed:", err);
    process.exit(1);
  }
};

const start = async () => {
  await connectDb();
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
};

start();

async function getBannerFromDatabase() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        tex: "Mega Flash Sale! 50% OFF",
        endTime: Date.now() + 360000,
      });
    },2000);
  });
}

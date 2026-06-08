import express from "express";
import Redis from "ioredis";
import mongoose, { mongo } from "mongoose";

const app = express();
app.use(express.json());
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");


app.get("/redis",async(req,res)=>{
    const reply = await redis.ping();
    res.json({
        redis:reply
    })
})
app.get("/mongo", (req, res) => {
  const state = mongoose.connection.readyState;
  res.json({
    data: mongoose.connection.name,
    mongo: state,
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

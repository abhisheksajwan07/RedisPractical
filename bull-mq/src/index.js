import express from "express";
import {
  addWelcomeEmailJob,
  addPasswordResetJob,
  reminderEmailJob,
} from "./queue.js";

const app = express();
app.use(express.json());

app.post("/signup", async (req, res) => {
  const { email, name } = req.body;
  const userId = `user_${Date.now()}`;
  // hash password store in db
  /// create token , store  in redis
  // call email services

  const welcomeJobId = await addWelcomeEmailJob({ userId, email, name });
  const reminderJobId = await reminderEmailJob({ userId, name, email });

  res.status(202).json({
    message: "Signup successful ! emails queued",
    jobs: {
      welcomeEmail: welcomeJobId,
      reminderEmail: reminderJobId,
    },
  });
});

app.post("/reset-password", async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email required" });
  }
  const resetToken = `tok_${Math.random().toString(36).slice(2)}`;

  const jobId = await addPasswordResetJob({
    userId: `user_${Date.now()}`,
    name,
    email,
    resetToken,
  });
  res.status(202).json({
    message: "Password reset email queued (high priority).",
    jobId,
  });
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

/*
|--------------------------------------------------------------------------
| MONGODB CONNECTION
|--------------------------------------------------------------------------
|
| Not used in current routes.
| Added only to demonstrate Redis + Mongo setup.
|
*/

// const connectDb = async () => {
//   try {
//     await mongoose.connect(
//       process.env.MONGO_URL || "mongodb://localhost:27017/mongo_redis",
//     );

//     console.log("MongoDB connected");
//   } catch (err) {
//     console.log("MongoDB connection failed:", err);
//     process.exit(1);
//   }
// };

/*
|--------------------------------------------------------------------------
| APPLICATION STARTUP
|--------------------------------------------------------------------------
*/

const start = async () => {
  // await connectDb();

  app.listen(3000, () => {
  
    console.log(`[Server] Endpoints:`);
    console.log(`  POST /signup`);
    console.log(`  POST /forgot-password`);
    console.log(`  GET  /health\n`);
  });
};

start();

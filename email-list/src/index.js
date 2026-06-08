import express from "express";
import Redis from "ioredis";
import mongoose from "mongoose";

const app = express();
app.use(express.json());

// Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const QUEUE_KEY = "queue:emails";

/*
QUEUE IMPLEMENTATION

Producer:
LPUSH queue:emails

Consumer:
RPOP queue:emails

Example:

LPUSH job1
LPUSH job2
LPUSH job3

Queue:

Left                    Right
 ↓                         ↓
[job3, job2, job1]

RPOP returns:
job1 -> oldest job

FIFO maintained.
*/

app.post("/emails", async (req, res) => {
  const job = {
    to: req.body.to,
    subject: req.body.subject || "no subject",
    body: req.body.body || "no content",
    createdAt: new Date().toISOString(),
  };
  await redis.lpush(QUEUE_KEY, JSON.stringify(job));
  res.json({ queue: true, job });
});

app.post("/emails/process", async (req, res) => {
  const rawJob = await redis.rpop(QUEUE_KEY);
  if (!rawJob) {
    return res.json({
      message: "No job in the queue",
    });
  }
  const job = JSON.parse(rawJob);
  res.json({
    message: "Email sent",
    job,
  });
});
// RPOP
// ↓
// keep polling

// BRPOP
// ↓
// sleep until a job arrives

app.post("/email/process", async (req, res) => {
  const result = await redis.brpop(QUEUE_KEY, 0);
  if (!result) {
    return res.json({
      message: "No job in the queue",
    });
  }
  //   But BRPOP returns both the queue name and the value.
  //   [
  //   "queue",
  //   '{"to":"abc@gmail.com"}'
  // ]
  const rawJob = result[1];
  const job = JSON.parse(rawJob);
  console.log("Processing email:");

  // simulate email sends

  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });

  // this resolve is a function refernce , you arent caliing it immediately aftr 2sec
  // it wil run resolve()
  console.log("email sent successfully");
});


// drawbacks  important limitations of a basic Redis List queue.

// job loss
// rety system
// parallel worker
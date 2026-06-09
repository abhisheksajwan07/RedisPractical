import { Worker, QueueEvents } from "bullmq";
import { redisConnection, QUEUE_NAME } from "./config.js";

async function sendEmail({ to, subject, template, data }) {
  await new Promise((res) => setTimeout(res, 1000 + Math.random() * 1000));

  if (Math.random() < 0.15) {
    throw new Error(`SMTP timeout: Could not deliver email to ${to}`);
  }
  return {
    deliveredAt: new Date().toISOString(),
    messageId: `msg_:${Date.now()}`,
  };
}

async function processEmailJob(job) {
  console.log(`\n [Worker] processing job:${job.id} | NAME:${job.name}`);
  const { email, name, template, resetToken } = job.data;
  switch (job.name) {
    case "welcome-email": {
      await job.updateProgress(30);
      const result = await sendEmail({
        to: email,
        subject: `Welcome aboard ${name}`,
        template: "welcome",
        data: { name },
      });
      await job.updateProgress(100);
      return result;
    }
    case "reminder-email": {
      await job.updateProgress(50);
      const result = await sendEmail({
        to: email,
        subject: `Hey ${name} don't forget to complete your profile`,
        template: "reminder",
        data: {
          name,
        },
      });
    }
    case "password-reset": {
      await job.updateProgress(20);
      const result = await sendEmail({
        to: email,
        subject: "Password Reset Request",
        template: "password-reset",
        data: { name, resetToken },
      });
      await job.updateProgress(100);
      return result;
    }
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}

const worker = new Worker(QUEUE_NAME, processEmailJob, {
  connection: redisConnection,
  concurrency: 3,
});

worker.on("completed", (job, returnValue) => {
  console.log(`[Worker] Job completed -> ID: ${job.id}| Name: ${job.name}`);
  console.log(`         Result:`, returnValue);
});

worker.on("failed", (job, error) => {
  if (job.attemptsMade > job.opts.attempts) {
    console.log(`[Worker] 🚨 Job permanently failed — all retries exhausted!`);
  }
});

worker.on("progress", (job, progress) => {
  console.log(`[Worker] 📊 Job ${job.id} progress: ${progress}%`);
});
worker.on("error", (error) => {
  console.error(`[Worker] 💥 Worker error:`, error.message);
});

// QueueEvents — queue level events
const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: redisConnection,
});

queueEvents.on("waiting", ({ jobId }) => {
  console.log(`[Queue] 🕐 Job ${jobId} is waiting in queue`);
});

queueEvents.on("active", ({ jobId }) => {
  console.log(`[Queue] ▶️  Job ${jobId} is now active (being processed)`);
});
process.on("SIGINT", async () => {
  console.log("\n[Worker] Shutting down gracefully...");
  await worker.close();
  await queueEvents.close();
  process.exit(0);
});

console.log(`[Worker] 👷 Started — listening on queue: "${QUEUE_NAME}"`);
console.log(`[Worker] Concurrency: 3 | Waiting for jobs...\n`);
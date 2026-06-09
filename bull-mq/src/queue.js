import { Queue } from "bullmq";
import { redisConnection, QUEUE_NAME } from "./config.js";

const emailQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // my queue's every job will get these default options
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

export async function addWelcomeEmailJob(userData) {
  const job = await emailQueue.add("welcome-email", {
    userId: userData.userId,
    email: userData.email,
    name: userData.name,
    template: "welcome",
  });
  console.log(`[Queue] Welcome email job added → Job ID: ${job.id}`);
  return job.id;
}

export async function reminderEmailJob(userData) {
  const job = await emailQueue.add(
    "reminder-email",
    {
      userId: userData.userId,
      name: userData.name,
      email: userData.email,
      template: "reminder",
    },
    {
      delay: 10 * 60 * 1000,
    },
  );
  console.log(
    `[Queue] Reminder email job added -> Job Id:${job.id} (delayed 10min)`,
  );
  return job.id;
}

export async function addPasswordResetJob(userData) {
  const job = await emailQueue.add(
    "password-reset",
    {
      userId: userData.userId,
      name: userData.name,
      email: userData.email,
      resetToken: userData.resetToken,
      template: "reset-password",
    },
    {
      priority: 1,
      attempts: 5,
    },
  );
  console.log(
    `[Queue] Password reset job added (HIGH PRIORITY) → Job ID: ${job.id}`,
  );
  return job.id;
}

export { emailQueue };

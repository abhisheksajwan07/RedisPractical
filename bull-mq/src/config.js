export const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: 6379,
};

export const QUEUE_NAME = "email_notifications";


const express = require("express");
const Redis = require("ioredis");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const app = express();
const redis = new Redis();
const db = new PrismaClient();

app.use(express.json());

app.disable("x-powered-by");
app.set("trust proxy", 1);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

const otpKey = (phone) => `auth:otp:${phone}`;
const attemptsKey = (phone) => `auth:otp:attempts:${phone}`;
const cooldownKey = (phone) => `auth:otp:cooldown:${phone}`;
const dailyLimitKey = (phone) => `auth:otp:daily:${phone}`;

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const normalizePhone = (phone) => {
  return String(phone).trim();
};

// Basic validation.
// Prefer libphonenumber-js in real production.
const isValidPhone = (phone) => /^\d{10,15}$/.test(phone);

/* --------------------------------------------------
   RATE LIMITERS
-------------------------------------------------- */

const createLimiter = (
  max,
  prefix,
  windowMs = 15 * 60 * 1000,
) =>
  rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix,
    }),
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });

const otpLimiter = createLimiter(
  5,
  "rl:otp:",
);

const verifyLimiter = createLimiter(
  10,
  "rl:verify:",
);

const globalApiLimiter = createLimiter(
  100,
  "rl:api:",
  60 * 1000,
);

app.use(globalApiLimiter);

/* --------------------------------------------------
   SEND OTP
-------------------------------------------------- */

app.post("/otp", otpLimiter, async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    phone = normalizePhone(phone);

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message: "Invalid phone number",
      });
    }

    // Daily limit
    const dailyCount = await redis.incr(
      dailyLimitKey(phone),
    );

    if (dailyCount === 1) {
      await redis.expire(
        dailyLimitKey(phone),
        86400,
      );
    }

    if (dailyCount > 20) {
      return res.status(429).json({
        message:
          "Daily OTP limit exceeded. Try tomorrow.",
      });
    }

    // Cooldown lock
    const lock = await redis.set(
      cooldownKey(phone),
      "1",
      "EX",
      30,
      "NX",
    );

    if (!lock) {
      return res.status(429).json({
        message:
          "Please wait 30 seconds before requesting another OTP.",
      });
    }

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    const otpHash = hashOtp(otp);

    await redis.set(
      otpKey(phone),
      otpHash,
      "EX",
      300, // 5 min
    );

    // SMS provider integration
    // await sendSms(phone, otp);

    console.log(
      `[OTP SENT] Phone: ${phone}`,
    );

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("OTP error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

/* --------------------------------------------------
   VERIFY OTP
-------------------------------------------------- */

app.post(
  "/verify",
  verifyLimiter,
  async (req, res) => {
    try {
      let { phone, otp } = req.body;

      if (
        !phone ||
        !otp ||
        typeof otp !== "string"
      ) {
        return res.status(400).json({
          message:
            "Phone and OTP are required",
        });
      }

      phone = normalizePhone(phone);

      if (!isValidPhone(phone)) {
        return res.status(400).json({
          message: "Invalid phone number",
        });
      }

      const attempts = await redis.incr(
        attemptsKey(phone),
      );

      if (attempts === 1) {
        await redis.expire(
          attemptsKey(phone),
          300,
        );
      }

      if (attempts > 5) {
        await redis.del(otpKey(phone));
        await redis.del(
          attemptsKey(phone),
        );

        return res.status(429).json({
          message:
            "Too many attempts. Request a new OTP.",
        });
      }

      const storedHash = await redis.get(
        otpKey(phone),
      );

      // Generic error to avoid OTP enumeration
      if (!storedHash) {
        return res.status(400).json({
          message:
            "Invalid verification code",
        });
      }

      const incomingHash = hashOtp(otp);

      const isMatch = crypto.timingSafeEqual(
        Buffer.from(storedHash),
        Buffer.from(incomingHash),
      );

      if (!isMatch) {
        return res.status(400).json({
          message:
            "Invalid verification code",
        });
      }

      await redis.del(otpKey(phone));
      await redis.del(
        attemptsKey(phone),
      );

      const user = await db.user.upsert({
        where: { phone },
        update: {
          verified: true,
        },
        create: {
          phone,
          verified: true,
        },
      });

      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
          issuer: "your-app",
          audience: "mobile-app",
        },
      );

      return res.json({
        message:
          "OTP verified successfully",
        token,
        user: {
          id: user.id,
          phone: user.phone,
        },
      });
    } catch (error) {
      console.error(
        "Verification error:",
        error,
      );

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);

app.listen(3000, () => {
  console.log(
    "Server running on port 3000",
  );
});
import express from "express";
import Redis from "ioredis";
import mongoose from "mongoose";

const app = express();
app.use(express.json());

// Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/*
|--------------------------------------------------------------------------
| JSON STORAGE (SET / GET)
|--------------------------------------------------------------------------
|
| Entire object is stored as ONE string.
| Redis does not understand the object.
|
| user:1:json
| -> '{"name":"Abhishek","age":22}'
|
*/

// Save complete object as JSON string
app.post("/user/:id/json", async (req, res) => {
  await redis.set(`user:${req.params.id}:json`, JSON.stringify(req.body));

  res.json({
    savedAs: "json",
  });
});

// Read complete object
app.get("/user/:id/json", async (req, res) => {
  const raw = await redis.get(`user:${req.params.id}:json`);

  res.json({
    user: raw ? JSON.parse(raw) : null,
  });
});

/*
|--------------------------------------------------------------------------
| HASH STORAGE (HSET / HGETALL)
|--------------------------------------------------------------------------
|
| Object fields are stored separately.
|
| user:1:hash
| ├── name = Abhishek
| ├── age  = 22
| └── role = admin
|
| Advantage:
| - Read individual fields
| - Update individual fields
| - No need to rewrite whole object
|
*/

// Save object as Redis Hash
app.post("/user/:id/hash", async (req, res) => {
  await redis.hset(`user:${req.params.id}:hash`, req.body);

  res.json({
    savedAs: "hash",
  });
});

// Read all fields from hash
app.get("/user/:id/hash", async (req, res) => {
  const user = await redis.hgetall(`user:${req.params.id}:hash`);

  res.json({
    user,
  });
});

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

/*
============================================================================

SUMMARY

1. SET / GET
-------------
Stores entire object as one JSON string.

Save:
await redis.set(key, JSON.stringify(user))

Read:
JSON.parse(await redis.get(key))

Good when:
- You always need the complete object.
- User profile cache.
- Product cache.
- API response cache.


2. HSET / HGETALL
-----------------
Stores fields separately.

Save:
await redis.hset("user:1", {
  name: "Abhishek",
  age: 22
})

Read:
await redis.hgetall("user:1")

Update single field:
await redis.hset("user:1", "age", 23)

Good when:
- Individual fields change often.
- Need partial reads.
- Need partial updates.


3. Important
------------
Redis stores everything as strings.

Example:

await redis.hset("user:1", {
  age: 22
})

Later:

const user = await redis.hgetall("user:1")

user.age === "22" // string

============================================================================
*/

/*
============================================================================

4. WHY HSET EXISTS?

SET stores the entire object as ONE string.

Example:

await redis.set(
  "user:1",
  JSON.stringify({
    name: "Abhishek",
    age: 22
  })
);

Redis stores:

user:1
-> '{"name":"Abhishek","age":22}'

Redis does NOT understand the JSON structure.
It only sees a string.

Therefore, updating one field requires:

1. Read whole string
2. JSON.parse()
3. Modify field
4. JSON.stringify()
5. Save entire string again

Example:

const user = JSON.parse(
  await redis.get("user:1")
);

user.age = 23;

await redis.set(
  "user:1",
  JSON.stringify(user)
);


HSET stores fields separately.

Example:

await redis.hset("user:1", {
  name: "Abhishek",
  age: 22
});

Redis stores:

user:1
├── name = Abhishek
└── age  = 22

Now update only one field:

await redis.hset(
  "user:1",
  "age",
  23
);

No need to:
- fetch entire object
- parse JSON
- rewrite entire object

This is the biggest advantage of Redis Hashes.

============================================================================
*/

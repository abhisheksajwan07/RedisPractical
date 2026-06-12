/**
 * 1. String-Product stock counter
   laptop ki stock set karo-50 units
   Stock get karo
   Ek sale hui-stock 1 se kam karo (hint: decr command)
 */

await client.set("laptop-stock", 50);
await client.dec("product-stock");

/**
 * 2.List-Order queue
        3 orders add karo queue mein-"order:1", "order:2", "order:3"
        Sabse purana order process karo aur nikalo (hint: konsa Pop use karein?)
        Remaining orders print karo
 */

// "order:1", "order:2", "order:3"
/**
 *  FIFO -> first in first out = queue
 *  lpush means left side pe push karo
 *   lPush → [order:3, order:2, order:1]
          ↑ newest              ↑ oldest
          lPop nikale           rPop nikale
    rpush -> rigth pe push karo
     rPush → [order:1, order:2, order:3]
          ↑ oldest              ↑ newest
          lPop nikale           rPop nikale
 */

await client.lPush("order", ["order:1", "order:2", "order:3"]);
// 1-> [o1] , [o2,o1],  [o3,o2,o1] -> oldest would be o1->rpop

await client.rpop("order"); // o1 : oldest out

const remaining = await client.lrange("order", 0, -1);
console.log(remaining); // ["order:3", "order:2"]

/** unsorted set - no duplicate S
 * 3.Set-Product tags

    product:laptop ke tags add karo-"electronics", "portable", "expensive"
    Check karo "portable" tag hai ya nahi
    "expensive" tag remove karo
    Updated tags print karo
 */

await client.sAdd("product:laptop", ["electronics", "portable", "expensive"]);

const isPortable = await client.sIsMember("product:laptop", "portable");
console.log(isPortable); // true

await client.sRem("product:laptop", "expensive");

const updatedTags = await client.sMembers("product:laptop");
console.log(updatedTags); // ["electronics", "portable"]

/**  FOR sorted SET - use z
 * 4. Sorted Set-Leaderboard

    3 players add karo scores ke saath:

    "alice" → 500
    "bob" → 750
    "charlie" → 620


    Saare players print karo score ke saath
    "bob" ki rank kya hai?
    "alice" ne 100 points aur kamaaye-score update karo (hint: zIncrBy)
 */

await client.zAdd("Leaderboard", [
  { score: 500, value: "alice" },
  { score: 750, value: "bob" },
  { score: 620, value: "charlie" },
]);
const score = await client.zRangeWithScores("Leaderboard", 0, -1);
console.log(score);
// [{value: "alice", score: 500}, {value: "charlie", score: 620}, {value: "bob", score: 750}]

const bobrank = await client.zRank("Leaderboard", "bob"); // -> it will give rank of bob
console.log(bobrank); // 2 (0-indexed, score ascending)
await client.zIncrBy("Leaderboard", 100, "bob"); //  ↑ increment pehle, member baad mein

/**
 *  5. Hash-User profile

     user:101 ka profile set karo-name, email, city
     Sirf email fetch karo
     city update karo "Mumbai" se "Bangalore"
     Poora profile print karo
 */

await client.hSet("user:101", {
  name: "john",
  email: "kak@gmail.com",
  city: "mumbai",
});

await client.hGet("user:101", "email");
const updated = await client.hSet("user:101", "city", "Banglore");
console.log(updated);

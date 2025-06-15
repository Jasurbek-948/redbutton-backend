const crypto = require("crypto");

// 64 baytli tasodifiy kalit generatsiya qilish
const jwtSecret = crypto.randomBytes(64).toString("hex");

console.log("Yaratilgan JWT Secret Key:");
console.log(jwtSecret);
console.log("\nBu kalitni .env fayliga qo'shing:");
console.log(`JWT_SECRET=${jwtSecret}`);
console.log("\nEslatma: Kalitni xavfsiz saqlang va hech kimga ulashmang!");
require('dotenv').config();
const cron = require("node-cron");
const path = require("path");
const { exec } = require("child_process");

cron.schedule("0 0 * * 0", () => {
  console.log("🧹 Running weekly image cleanup...");
  exec(`node ${path.join(__dirname, "utils/cleanUnusedImages.js")}`);
});

cron.schedule("5 0 * * 0", () => {
  console.log("📧 Sending weekly traffic report...");
  exec(`node ${path.join(__dirname, "utils/email/sendWeeklyTraffic.js")}`);
});

console.log("Cron service running...");
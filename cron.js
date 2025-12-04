require('dotenv').config();
const cron = require("node-cron");
const path = require("path");
const { spawn } = require("child_process");

function runScript(scriptPath) {
  const child = spawn("node", [scriptPath], { stdio: "inherit" });
  child.on("close", (code) => {
    console.log(`Script finished with code ${code}`);
  });
}

// cron.schedule("0 0 * * 0", () => {
//   console.log("🧹 Running weekly image cleanup...");
//   runScript(path.join(__dirname, "utils/cleanUnusedImages.js"));
// });

cron.schedule("5 0 * * 0", () => {
  console.log("📧 Sending weekly traffic report...");
  runScript(path.join(__dirname, "utils/email/sendWeeklyTraffic.js"));
});

console.log("Cron service running...");
require('dotenv').config();
const { Cron } = require("croner");
const path = require("path");
const { spawn } = require("child_process");

function runScript(scriptPath) {
  const child = spawn("node", [scriptPath], { stdio: "inherit" });
  child.on("close", (code) => {
    console.log(`Script finished with code ${code}`);
  });
}

// Daily traffic aggregation - runs every day at 00:05 Vietnam time
// Aggregates yesterday's raw Traffic data into DailyTraffic
const dailyAggregationJob = new Cron("5 0 * * *", {
  timezone: "Asia/Ho_Chi_Minh",
  catch: true,
  protect: true
}, () => {
  console.log("📊 Aggregating yesterday's traffic...");
  runScript(path.join(__dirname, "utils/aggregateDailyTraffic.js"));
});

// Weekly traffic report - runs every Sunday at 05:12 Vietnam time
// Sends weekly stats email to hosts
const weeklyTrafficJob = new Cron("12 5 * * 0", {
  timezone: "Asia/Ho_Chi_Minh",
  catch: true,
  protect: true
}, () => {
  console.log("📧 Sending weekly traffic report...");
  runScript(path.join(__dirname, "utils/email/sendWeeklyTraffic.js"));
});

console.log("Cron service running...");
console.log(`📊 Next aggregation: ${dailyAggregationJob.nextRun()}`);
console.log(`📧 Next weekly report: ${weeklyTrafficJob.nextRun()}`);
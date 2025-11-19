module.exports = {
  apps: [
    {
      name: "findcation",
      script: "./app.js",
      env: {
        PORT: 3333,
        NODE_ENV: "development",
      },
    },
    {
      name: "findcation-cron",
      script: "./cron.js",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};

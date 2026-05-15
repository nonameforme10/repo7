"use strict";

module.exports = {
  apps: [
    {
      name: "caretrack",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "4173",
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};

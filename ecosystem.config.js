module.exports = {
  apps: [
    {
      name: "ibc-app",
      script: "server.js",
      cwd: "./.next/standalone",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "./logs/ibc-app-error.log",
      out_file: "./logs/ibc-app-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      log_type: "json",
      max_restarts: 10,
      restart_delay: 4000,
      watch: false,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
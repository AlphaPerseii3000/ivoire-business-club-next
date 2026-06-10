const fs = require('fs');
const path = require('path');

// Read and parse .env file dynamically in production
let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (key) {
          envConfig[key] = key === 'PORT' ? parseInt(value, 10) : value;
        }
      }
    });
  }
} catch (err) {
  console.error("Failed to load .env file in ecosystem.config.js:", err);
}

module.exports = {
  apps: [
    {
      name: "ibc-app",
      script: "./.next/standalone/server.js",
      cwd: "./",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        ...envConfig
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

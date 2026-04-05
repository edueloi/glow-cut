module.exports = {
  apps: [
    {
      name: "agendelle",
      script: "server.ts",
      interpreter: "tsx",
      cwd: "/root/agendelle",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: "/var/log/pm2/agendelle-error.log",
      out_file: "/var/log/pm2/agendelle-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};

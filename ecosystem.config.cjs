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
    {
      // Processo ISOLADO — gerencia lembretes de WhatsApp.
      // NÃO reiniciar este processo junto com o app principal.
      // Comandos separados:
      //   pm2 start ecosystem.config.cjs --only agendelle-wpp
      //   pm2 restart agendelle-wpp
      //   pm2 logs agendelle-wpp --lines 50
      name: "agendelle-wpp",
      script: "wpp-connect/scheduler.ts",
      interpreter: "tsx",
      cwd: "/root/agendelle",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      restart_delay: 5000,
      error_file: "/var/log/pm2/agendelle-wpp-error.log",
      out_file: "/var/log/pm2/agendelle-wpp-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};

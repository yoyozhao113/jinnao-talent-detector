module.exports = {
  apps: [{
    name: 'star-mom-api',
    script: 'server.mjs',
    cwd: '/var/www/star-mom-astrology',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    env_file: '.env',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '300M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
  }],
};

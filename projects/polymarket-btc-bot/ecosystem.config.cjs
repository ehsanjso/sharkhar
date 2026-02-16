module.exports = {
  apps: [
    {
      name: 'polymarket-multi',
      cwd: './dashboard',
      script: 'npx',
      args: 'tsx server-multi.ts',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/multi-error.log',
      out_file: './logs/multi-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

module.exports = {
  apps: [{
    name: 'ornina-chat',
    script: 'server.js',
    cwd: '/root/LibreChat',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 7001,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      THESYS_API_KEY: process.env.THESYS_API_KEY,
      THESYS_MOCK_MODE: 'false'
    },
    watch: false,
    max_memory_restart: '1G',
    error_file: '/root/.pm2/logs/ornina-chat-error.log',
    out_file: '/root/.pm2/logs/ornina-chat-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

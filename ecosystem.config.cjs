module.exports = {
  apps: [{
    name: 'creatorvault',
    script: '/root/creatorvault/start.sh',
    cwd: '/root/creatorvault',
    interpreter: 'bash',
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 10,
    autorestart: true,
  }]
};


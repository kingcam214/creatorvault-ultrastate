module.exports = {
  apps: [
    {
      name: 'creatorvault',
      cwd: '/root/creatorvault',
      script: 'dist/index.js',
      interpreter: 'node',
      node_args: '-r dotenv/config',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: '/root/creatorvault/.env'
      }
    }
  ]
};

with open('vite.config.ts', 'r') as f:
    content = f.read()

old = """    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },"""

new = """    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          trpc: ['@trpc/client', '@trpc/react-query', '@tanstack/react-query'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          stripe: ['@stripe/stripe-js'],
          socket: ['socket.io-client'],
          charts: ['recharts'],
          datefns: ['date-fns'],
        },
      },
    },
  },"""

if 'manualChunks' not in content:
    content = content.replace(old, new, 1)
    with open('vite.config.ts', 'w') as f:
        f.write(content)
    print('Patched vite.config.ts with chunk splitting')
else:
    print('Already patched')

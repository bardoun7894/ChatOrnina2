/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  i18n,
  // Allow cross-origin HMR from domain
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
  // Allow HMR from development origins
  experimental: {
    allowedOrigins: ['localhost:3000', 'www.chat.ornina.ae', 'localhost:7000', 'localhost:7001'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '0.0.0.0',
      },
      {
        protocol: 'http',
        hostname: '72.61.178.137',
      },
      {
        protocol: 'https',
        hostname: 'www.chat.ornina.ae',
      },
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXTAUTH_URL: 'https://www.chat.ornina.ae',
    NEXTAUTH_URL_INTERNAL: 'http://127.0.0.1:7001',
  },
  webpack: (config, { isServer, webpack }) => {
    // Handle MongoDB client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        constants: false,
        zlib: false,
        tty: false,
        util: false,
        buffer: false,
        process: false,
        vm: false,
        async_hooks: false,
        http2: false,
        dgram: false,
        dns: false,
        net: false,
        tls: false,
        child_process: false,
        cluster: false,
        repl: false,
        readline: false,
        v8: false,
        worker_threads: false,
        perf_hooks: false,
        trace_events: false,
        node_repl: false,
        inspector: false,
        // MongoDB specific modules
        kerberos: false,
        'mongodb-client-encryption': false,
        '@aws-sdk/credential-providers': false,
        snappy: false,
        aws4: false,
        'bson-ext': false,
        'mongodb-ext': false,
        'kerberos-ext': false,
        'snappy-ext': false,
        'zstd-ext': false,
      };
      
      // Add alias for empty modules
      config.resolve.alias = {
        ...config.resolve.alias,
        'net': path.resolve(__dirname, 'empty-modules/net.js'),
        'tls': path.resolve(__dirname, 'empty-modules/tls.js'),
        'dns': path.resolve(__dirname, 'empty-modules/dns.js'),
        'child_process': path.resolve(__dirname, 'empty-modules/child_process.js'),
        'fs': path.resolve(__dirname, 'empty-modules/fs.js'),
        'path': path.resolve(__dirname, 'empty-modules/path.js'),
        'os': path.resolve(__dirname, 'empty-modules/os.js'),
        'crypto': path.resolve(__dirname, 'empty-modules/crypto.js'),
        'stream': path.resolve(__dirname, 'empty-modules/stream.js'),
        'constants': path.resolve(__dirname, 'empty-modules/constants.js'),
        'zlib': path.resolve(__dirname, 'empty-modules/zlib.js'),
        'tty': path.resolve(__dirname, 'empty-modules/tty.js'),
        'util': path.resolve(__dirname, 'empty-modules/util.js'),
        'buffer': path.resolve(__dirname, 'empty-modules/buffer.js'),
        'process': path.resolve(__dirname, 'empty-modules/process.js'),
        'vm': path.resolve(__dirname, 'empty-modules/vm.js'),
        'async_hooks': path.resolve(__dirname, 'empty-modules/async_hooks.js'),
        'http2': path.resolve(__dirname, 'empty-modules/http2.js'),
        'dgram': path.resolve(__dirname, 'empty-modules/dgram.js'),
        'cluster': path.resolve(__dirname, 'empty-modules/cluster.js'),
        'repl': path.resolve(__dirname, 'empty-modules/repl.js'),
        'readline': path.resolve(__dirname, 'empty-modules/readline.js'),
        'v8': path.resolve(__dirname, 'empty-modules/v8.js'),
        'worker_threads': path.resolve(__dirname, 'empty-modules/worker_threads.js'),
        'perf_hooks': path.resolve(__dirname, 'empty-modules/perf_hooks.js'),
        'trace_events': path.resolve(__dirname, 'empty-modules/trace_events.js'),
        'node_repl': path.resolve(__dirname, 'empty-modules/node_repl.js'),
        'inspector': path.resolve(__dirname, 'empty-modules/inspector.js'),
        'kerberos': path.resolve(__dirname, 'empty-modules/kerberos.js'),
        'mongodb-client-encryption': path.resolve(__dirname, 'empty-modules/mongodb-client-encryption.js'),
        '@aws-sdk/credential-providers': path.resolve(__dirname, 'empty-modules/@aws-sdk/credential-providers.js'),
        'snappy': path.resolve(__dirname, 'empty-modules/snappy.js'),
        'aws4': path.resolve(__dirname, 'empty-modules/aws4.js'),
        'bson-ext': path.resolve(__dirname, 'empty-modules/bson-ext.js'),
        'mongodb-ext': path.resolve(__dirname, 'empty-modules/mongodb-ext.js'),
        'kerberos-ext': path.resolve(__dirname, 'empty-modules/kerberos-ext.js'),
        'snappy-ext': path.resolve(__dirname, 'empty-modules/snappy-ext.js'),
        'zstd-ext': path.resolve(__dirname, 'empty-modules/zstd-ext.js'),
      };
    }
    
    return config;
  },
  // Ignore specific modules that cause issues
  serverExternalPackages: ['mongodb'],
  turbopack: {},
};

module.exports = nextConfig;



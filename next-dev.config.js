// Development optimizations for faster reloads
// This file can be imported in next.config.js for development environment

const devConfig = {
  // Optimize webpack for development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Reduce build time with these optimizations
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };
      
      // Optimize module resolution
      config.resolve.symlinks = false;
      
      // Improve rebuild performance
      if (!isServer) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              framework: {
                chunks: 'all',
                name: 'framework',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
                priority: 40,
                enforce: true,
              },
              lib: {
                test: /[\\/]node_modules[\\/]/,
                name(module) {
                  const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                  return `npm.${packageName.replace('@', '')}`;
                },
                priority: 30,
                minChunks: 1,
                reuseExistingChunk: true,
              },
            },
          },
        };
      }
    }
    
    return config;
  },
};

module.exports = devConfig;

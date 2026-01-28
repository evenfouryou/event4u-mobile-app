const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add parent node_modules to watch folders and resolution paths
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure proper source extension resolution
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];

// Use main field (commonjs) instead of module field (esm) for better compatibility
config.resolver.resolverMainFields = ['react-native', 'main', 'browser'];

// Disable package exports to use traditional resolution
config.resolver.unstable_enablePackageExports = false;

config.server = {
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;

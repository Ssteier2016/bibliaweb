const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    path: require.resolve('path'),
    stream: require.resolve('stream'),
    assert: require.resolve('assert'),
    zlib: require.resolve('browserify-zlib'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process'),
  };
  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      process: 'process',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];
  return config;
};

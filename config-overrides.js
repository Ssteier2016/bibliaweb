module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    path: require.resolve('path'),
    stream: require.resolve('stream'),
    assert: require.resolve('assert'),
    zlib: require.resolve('browserify-zlib'),
    buffer: require.resolve('buffer'),
  };
  return config;
};

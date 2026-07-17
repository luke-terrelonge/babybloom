<<<<<<< HEAD
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
=======
﻿module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
>>>>>>> 5c824ba4c24a293e6a54f6b1592106d71249496c
  };
};

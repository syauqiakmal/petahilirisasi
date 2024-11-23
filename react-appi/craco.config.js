import { ESLINT_MODES } from '@craco/craco';

module.exports = {
  webpack: {
    configure: {
      module: {
        rules: [
          {
            test: /\.(m?js|jsx)$/,
            resolve: {
              fullySpecified: false,
            },
          },
        ],
      },
    },
  },
  eslint: {
    mode: ESLINT_MODES.file,
  },
};


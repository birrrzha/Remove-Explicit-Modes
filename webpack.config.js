const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => ({
mode: argv.mode === 'production' ? 'production' : 'development',

// This is necessary because Figma's 'eval' works differently than normal eval
devtool: argv.mode === 'production' ? false : 'inline-source-map',
  plugins: [
    new webpack.DefinePlugin({
      __html__: JSON.stringify(fs.readFileSync(path.join(__dirname, 'ui.html'), 'utf8')),
    }),
  ],
  entry: {
    code: './src/code.ts' // This is the entry point for our plugin code.
  },
  module: {
    rules: [
      // Converts TypeScript code to JavaScript
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  // Webpack tries these extensions for you if you omit the extension like "import './file'"
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
});
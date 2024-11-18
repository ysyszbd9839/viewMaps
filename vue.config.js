"use strict";
const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const cesiumSource = "node_modules/cesium/Source";
const cesiumWorkers = "../Build/Cesium/Workers";

function resolve(dir) {
  return path.join(__dirname, dir);
}

const name = "vue-cesium-demo"; // page title

// All configuration item explanations can be find in https://cli.vuejs.org/config/
module.exports = {
  /**
   * You will need to set publicPath if you plan to deploy your site under a sub path,
   * for example GitHub Pages. If you plan to deploy your site to https://foo.github.io/bar/,
   * then publicPath should be set to "/bar/".
   * In most cases please use '/' !!!
   * Detail: https://cli.vuejs.org/config/#publicpath
   */
  configureWebpack: {
    // provide the app's title in webpack's name field, so that
    // it can be accessed in index.html to inject the correct title.
    name: name,
    resolve: {
      alias: {
        "@": resolve("src"),
        // cesium 1
        cesium: path.resolve(__dirname, cesiumSource)
      }
    },
    amd: {
      // cesium 2
      toUrlUndefined: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: "@open-wc/webpack-import-meta-loader"
          }
        }
      ],
      // cesium 3 不加这个配置会报require引入警告
      unknownContextCritical: false
    },
    plugins: [
      // cesium 4
      new webpack.DefinePlugin({
        // Define relative base path in cesium for loading assets
        CESIUM_BASE_URL: JSON.stringify("")
      }), // 对build生效，拷贝到dist目录下。如：dist/Assets
      new CopyWebpackPlugin([
        {
          from: path.join(cesiumSource, cesiumWorkers),
          to: "Workers"
        }
      ]),
      new CopyWebpackPlugin([
        {
          from: path.join(cesiumSource, "Assets"),
          to: "Assets"
        }
      ]),
      new CopyWebpackPlugin([
        {
          from: path.join(cesiumSource, "Widgets"),
          to: "Widgets"
        }
      ]),
      new CopyWebpackPlugin([
        {
          from: path.join(cesiumSource, "ThirdParty"),
          to: "ThirdParty"
        }
      ])
      // new webpack.ProvidePlugin({
      //   Cesium: ['cesium/Cesium'] // Cesium对象实例可在每个js中使用而无须import
      // })
    ]
  }
};

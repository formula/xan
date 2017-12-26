#!/usr/bin/env node

var koa = require("koa");
var app = koa();
var serveViews = require("koa-front-matter-views");
var serve = require("koa-static");
var accesslog = require("koa-accesslog");
var moment = require("moment");
var path = require("path");
var cwd = process.cwd();
var layouts = path.join(cwd, 'layouts');
var pages = path.join(cwd, 'pages');
var version = require(path.join(cwd, "package.json")).version;

var { inspect } = require("util");

console.log('current working directory: ', cwd, layouts, pages, version)
app.use(accesslog());

let webpackEnabled = true;

var webpack = require("webpack");
var webpackConfig = combinedConfig = require("./webpack.config.dev.js");

var localWebpackConfig = {};

let combineWebpack = (name) => {
  try {
    var localWebpackConfig = require(path.join(cwd, name));
    combinedConfig = Object.assign({}, webpackConfig, {
      devtool: localWebpackConfig.devtool || webpackConfig.devtool,
      entry: Object.assign({}, webpackConfig.entry, localWebpackConfig.entry),
      output: Object.assign({}, webpackConfig.output, localWebpackConfig.output),
      // plugins: webpackConfig.plugins.concat(localWebpackConfig.plugins),
      module: {
        loaders: webpackConfig.module.loaders.concat(
          localWebpackConfig.module.loaders
        )
      }
    });
  } catch (e) {
    console.log("unable to configure with file: ", name);
    localWebpackConfig = {};
  }
}

combineWebpack('.xanrc');
combineWebpack('webpack.config.js');

console.log("DEFAULT WEBPACK CONFIG");
console.log(webpackConfig);
console.log("CUSTOM WEBPACK CONFIG");
console.log(localWebpackConfig);
console.log("COMBINED WEBPACK CONFIG");
console.log(JSON.stringify(combinedConfig, null, 4));

var compiler = webpack(combinedConfig);
var hotMiddleware = require("webpack-hot-middleware")(compiler);

var webpackMiddleware = require("koa-webpack-dev-middleware");

app.use(
  webpackMiddleware(compiler, {
    noInfo: false,
    lazy: false,
    publicPath: combinedConfig.output.publicPath
  })
);

app.use(function*(next) {
  yield hotMiddleware.bind(null, this.req, this.res);
  yield next;
});

console.log(typeof cwd, cwd)
// serve generate pages
app.use(
  serveViews({
    layouts,
    pages,
    defaults: {
      layouts,
      pages,
      __DEV__: true,
      __ts__: moment().format("YYYY-MM-DD"),
      __version__: version
    }
  })
);

// serve static assets
app.use(serve(cwd));

// serve the index.html page
app.use(function*() {
  yield this.serveView("index");
});

app.listen(process.env.PORT || 3000, process.env.BIND_IP);
console.log(
  `Listening on ${process.env.BIND_IP || "localhost"}:${process.env.PORT ||
    3000}`
);

#!/usr/bin/env node

var path = require('path');
var architect = require("architect");

// Configure the plugins.
var config = [
  {
    "packagePath": "./plugins/logger",
    "filename": "debug.log",
    "debug": true
  },
  {
    "packagePath": "./plugins/server",
    "port": "3000",
  },
  {
    "packagePath": "./plugins/socket"
  },
];

// User the configuration to start the application.
config = architect.resolveConfig(config, __dirname);
architect.createApp(config, function (err, app) {
  if (err) {
    throw err;
  }
});

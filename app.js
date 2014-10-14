#!/usr/bin/env node

var path = require('path');
var architect = require("architect");

// Load config file.
var config = require(__dirname + '/config.json');

// Configure the plugins.
var config = [
  {
    "packagePath": "./plugins/logger",
    "filename": config.log.file,
    "debug": config.log.debug
  },
  {
    "packagePath": "./plugins/server",
    "port": config.port,
  },
  {
    "packagePath": "./plugins/socket"
  },
  {
    "packagePath": "./plugins/api",
  },
  {
    "packagePath": "./plugins/search",
    "hosts": config.hosts
  }
];

// User the configuration to start the application.
config = architect.resolveConfig(config, __dirname);
architect.createApp(config, function (err, app) {
  if (err) {
    throw err;
  }
});

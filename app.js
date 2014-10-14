#!/usr/bin/env node

var path = require('path');
var architect = require("architect");

// Load config file.
var configs = require(__dirname + '/config.json');

// Configure the plugins.
var config = [
  {
    "packagePath": "./plugins/logger",
    "filename": configs.log.file,
    "debug": configs.log.debug
  },
  {
    "packagePath": "./plugins/server",
    "port": configs.port,
  },
  {
    "packagePath": "./plugins/socket"
  },
  {
    "packagePath": "./plugins/api",
  },
  {
    "packagePath": "./plugins/search",
    "hosts": configs.search.hosts,
    "mappings": __dirname + '/' + configs.search.mappings
  }
];

// User the configuration to start the application.
config = architect.resolveConfig(config, __dirname);
architect.createApp(config, function (err, app) {
  if (err) {
    throw err;
  }
});

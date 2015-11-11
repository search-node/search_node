#!/usr/bin/env node

/**
 * @file
 * This is the main application that uses architect to build the application
 * base on plugins.
 */

var path = require('path');
var architect = require("architect");

// Load config file.
var configs = require(__dirname + '/config.json');

// Configure the plugins.
var config = [
  {
    "packagePath": "./plugins/logger",
    "filename": path.join(__dirname, configs.log.file),
    "debug": configs.log.debug
  },
  {
    "packagePath": "./plugins/server",
    "port": configs.port,
    "path": path.join(__dirname, 'public')
  },
	{
		"packagePath": "./plugins/apikeys",
		"file": __dirname + '/' + configs.apikeys
	},
  {
    "packagePath": "./plugins/mappings",
    "file": __dirname + '/' + configs.search.mappings
  },
  {
    "packagePath": "./plugins/auth",
    "secret": configs.secret,
    "admin": configs.admin
  },
  {
    "packagePath": "./plugins/admin",
    "secret": configs.secret
  },
  {
    "packagePath": "./plugins/socket",
    "secret": configs.secret
  },
  {
    "packagePath": "./plugins/search",
    "hosts": configs.search.hosts
  },
  {
    "packagePath": "./plugins/api",
    "secret": configs.secret
  },
  {
    "packagePath": "./plugins/search_client"
  },
];

// User the configuration to start the application.
config = architect.resolveConfig(config, __dirname);
architect.createApp(config, function (err, app) {
  if (err) {
    throw err;
  }
});

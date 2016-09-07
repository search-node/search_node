#!/usr/bin/env node

/**
 * @file
 * This is the main application that uses architect to build the application
 * base on plugins.
 */

var path = require('path');
var architect = require("architect");

// Load config file.
var config = require(__dirname + '/config.json');

// Configure the plugins.
var plugins = [
  {
    "packagePath": "./plugins/logger",
    "logs": config.logs
  },
  {
    "packagePath": "./plugins/server",
    "port": config.port,
    "path": path.join(__dirname, 'public')
  },
	{
		"packagePath": "./plugins/apikeys",
		"file": __dirname + '/' + config.apikeys
	},
  {
    "packagePath": "./plugins/analysis",
    "file": __dirname + '/' + config.analysis
  },
  {
    "packagePath": "./plugins/mappings",
    "file": __dirname + '/' + config.search.mappings
  },
  {
    "packagePath": "./plugins/auth",
    "secret": config.secret,
    "admin": config.admin
  },
  {
    "packagePath": "./plugins/admin",
    "secret": config.secret
  },
  {
    "packagePath": "./plugins/socket",
    "secret": config.secret,
    "monitor": config.hasOwnProperty('monitor') ? config.monitor : false
  },
  {
    "packagePath": "./plugins/search",
    "hosts": config.search.hosts,
    "settings": config.hasOwnProperty('config.search.settings') ? config.search.settings : {}
  },
  {
    "packagePath": "./plugins/api",
    "secret": config.secret
  },
  {
    "packagePath": "./plugins/search_client",
    "monitor": config.hasOwnProperty('monitor') ? config.monitor : false
  }
];

// User the configuration to start the application.
config = architect.resolveConfig(plugins, __dirname);
architect.createApp(config, function (err, app) {
  if (err) {
    throw err;
  }
});

#!/bin/bash

# Install main modules
npm install --production

# Install plugin dependencies.
for folder in plugins/*; do
  if [ -d $folder ]; then
    cd $folder
    rm -rf node_modules
    npm install --production
    cd ../..
  fi
done

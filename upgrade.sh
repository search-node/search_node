#!/bin/bash

# Install main modules
npm audit fix

# Install plugin dependencies.
for folder in plugins/*; do
  if [ -d $folder ]; then
    cd $folder
    npm audit fix
    cd ../..
  fi
done

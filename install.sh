#!/bin/bash

# Install main modules
npm install

# Install plugin dependencies.
for folder in plugins/*; do
  if [ -d $folder ]; then
    cd $folder; npm install; cd ../..;
  fi
done

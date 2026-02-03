#!/bin/bash

npm remove wme-sdk-typings
npm add https://web-assets.waze.com/wme_sdk_docs/production/latest/wme-sdk-typings.tgz
npm install
npm install -g rollup
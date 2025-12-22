#!/bin/bash


if grep -qEi "(microsoft|wsl)" /proc/version; then
  path="file:$(wslpath -w . | sed 's|\\|/|g')/.out/main.user.js"
else
  path="file:$PWD/.out/main.user.js"
fi

sed -i "s#^// @require.*#// @require\t\t$path#" header-dev.js
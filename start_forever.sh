#!/bin/bash
set -e
export PATH="$PATH:/usr/local/bin"
cd /var/local/nodecode
PORT=80 node app.js 

#!/bin/bash
set -e
export PATH="$PATH:/usr/local/bin"
ps aux|grep "node app.js"|grep -v grep|tr -s ' '|cut -d" " -f2|xargs kill
cd /Users/david/projects/nodecode
export NODECODE_HOME="/tmp/"
export NODECODE_EXEC_PREFIX=" "

node app.js &
#/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome http://localhost:3000/code/bJDoTeePB
#/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome http://localhost:3000/code/bJDoTeePB


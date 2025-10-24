#!/bin/bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/home/pegons/apps/andestripmanager/mcp-server/serviceAccountKey.json
cd /home/pegons/apps/andestripmanager/mcp-server
node dist/index.js

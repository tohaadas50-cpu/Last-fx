#!/bin/bash
# Start backend in background
cd /home/runner/workspace/fx-build/backend && node dist/index.js --port=3001 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend (Vite) in foreground on port 5000
cd /home/runner/workspace/fx-build/app && npx vite --port 5000 --host 0.0.0.0

# Cleanup backend when frontend exits
kill $BACKEND_PID 2>/dev/null

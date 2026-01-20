#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo "Stopping services..."
    kill $SERVER_PID
    kill $CLIENT_PID
    exit
}

trap cleanup SIGINT

echo "Starting Server on port 3000..."
cd server
node index.js &
SERVER_PID=$!
cd ..

echo "Starting Client on port 5174..."
cd client
# Run vite directly via node to avoid symlink issues on some filesystems
node node_modules/vite/bin/vite.js --port 5174 &
CLIENT_PID=$!
cd ..

echo "=================================================="
echo "Application is running!"
echo "Server API: http://localhost:3000"
echo "Client UI:  http://localhost:5174"
echo "=================================================="
echo "Default Admin Credentials:"
echo "Username: admin"
echo "Password: admin"
echo "=================================================="

wait

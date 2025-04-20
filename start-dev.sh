#!/bin/bash

# Start Vite dev server in the background
echo "Starting Vite development server..."
npm run dev &
VITE_PID=$!

# Start the backend server in the background
echo "Starting backend server..."
npm run server &
SERVER_PID=$!

# Wait a bit for the server to initialize
sleep 3

# Start Prisma Studio in the background
echo "Starting Prisma Studio..."
npx prisma studio &
PRISMA_PID=$!

# Function to handle exit and kill all processes
cleanup() {
  echo "Shutting down all services..."
  kill $VITE_PID $SERVER_PID $PRISMA_PID 2>/dev/null
  exit 0
}

# Set up trap to call cleanup function when script receives SIGINT or SIGTERM
trap cleanup SIGINT SIGTERM

# Wait for user to press Ctrl+C
echo "All services started. Press Ctrl+C to stop all services."
echo "Vite: http://localhost:5173"
echo "Server: http://localhost:3001"
echo "Prisma Studio: http://localhost:5555"
wait 
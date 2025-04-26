#!/bin/bash
# Script to start both backend and frontend for network access

# Get local IP address
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
echo "====================================================="
echo "🎯 DartCounter Network Development Server"
echo "====================================================="
echo "Your local IP address: ${IP_ADDRESS}"
echo
echo "📱 iPad/Mobile Device Connection:"
echo "  Frontend URL: http://${IP_ADDRESS}:5173"
echo "  (The app will automatically connect to your backend)"
echo
echo "🔍 Troubleshooting:"
echo "  If players don't appear, check the browser console for errors"
echo "  Backend API is accessible at: http://${IP_ADDRESS}:3001/api"
echo "====================================================="

# Start the backend server
echo "Starting backend server on all network interfaces..."
cd "$(dirname "$0")" || exit
NODE_ENV=development npx tsx server/index.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 2
echo "Backend server started! (PID: $BACKEND_PID)"

# Start the frontend with network access enabled
echo "Starting frontend server on all network interfaces..."
npm run dev -- --host &
FRONTEND_PID=$!
echo "Frontend server started! (PID: $FRONTEND_PID)"

echo
echo "Press Ctrl+C to stop both servers"

# Handle Ctrl+C to kill both processes
trap 'echo "Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID; echo "Servers stopped"; exit' INT

# Keep the script running
wait
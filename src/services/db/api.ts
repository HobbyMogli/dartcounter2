// Dynamically determine the API base URL depending on environment
function getApiUrl() {
  // For development using the Vite dev server proxy
  if (window.location.hostname === 'localhost') {
    return '/api'; // Uses Vite proxy from vite.config.ts
  } 
  
  // For remote devices (iPad/mobile), always use explicit server URL with port
  return `http://${window.location.hostname}:3001/api`;
}

export const API_URL = getApiUrl();

// Display API URL to console for debugging
console.log('📡 API URL configured as:', API_URL);

export const fetchConfig = {
  headers: {
    'Content-Type': 'application/json'
  },
  // Don't use credentials for cross-origin requests to avoid CORS issues
  credentials: 'omit'
};
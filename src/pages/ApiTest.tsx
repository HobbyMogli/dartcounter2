import React, { useState, useEffect } from 'react';
import { Button } from '../components/common';
import { API_URL } from '../services/db/api';

const ApiTest: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [players, setPlayers] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>('');
  const [manualUrl, setManualUrl] = useState<string>(`http://${window.location.hostname}:3001/api/players`);

  useEffect(() => {
    setApiUrl(`${API_URL}/players`);
    testApiConnection();
  }, []);

  const testApiConnection = async () => {
    setApiStatus('loading');
    setErrorMessage('');
    
    try {
      console.log('Testing API connection to:', `${API_URL}/players`);
      setApiUrl(`${API_URL}/players`);

      // Directly fetch without using the service
      const response = await fetch(`${API_URL}/players`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded players:', data);
      setPlayers(data);
      setApiStatus('success');
    } catch (error) {
      console.error('API Test Error:', error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setApiStatus('error');
    }
  };

  const testManualUrl = async () => {
    setApiStatus('loading');
    setErrorMessage('');
    
    try {
      console.log('Testing manual URL:', manualUrl);
      
      const response = await fetch(manualUrl);
      console.log('Manual response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Manual loaded players:', data);
      setPlayers(data);
      setApiStatus('success');
    } catch (error) {
      console.error('Manual API Test Error:', error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setApiStatus('error');
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto bg-dark-800/90 backdrop-blur-md rounded-lg border border-gray-700">
      <h1 className="text-2xl font-bold text-neon-blue mb-6">API Connection Test</h1>
      
      <div className="mb-6">
        <h2 className="text-xl text-gray-200 mb-2">Auto-configured API URL:</h2>
        <div className="text-gray-400 mb-4 break-all">{apiUrl || 'Not configured'}</div>
        <Button onClick={testApiConnection}>
          Test Auto Connection
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl text-gray-200 mb-2">Manual API URL:</h2>
        <input 
          type="text"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          className="w-full p-2 rounded bg-dark-700 text-gray-200 border border-gray-600 mb-4"
        />
        <Button onClick={testManualUrl}>
          Test Manual URL
        </Button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl text-gray-200 mb-2">Connection Status:</h2>
        {apiStatus === 'loading' && (
          <div className="text-yellow-400">Testing connection...</div>
        )}
        {apiStatus === 'success' && (
          <div className="text-green-400">✅ Connection successful!</div>
        )}
        {apiStatus === 'error' && (
          <div className="text-red-400">❌ Connection failed: {errorMessage}</div>
        )}
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl text-gray-200 mb-2">Device Info:</h2>
        <div className="text-gray-400">
          <p>User Agent: {navigator.userAgent}</p>
          <p>Window Host: {window.location.hostname}</p>
          <p>Window Port: {window.location.port}</p>
        </div>
      </div>
      
      {apiStatus === 'success' && (
        <div>
          <h2 className="text-xl text-gray-200 mb-2">Players Loaded ({players.length}):</h2>
          <ul className="bg-dark-700 rounded-md p-4 max-h-60 overflow-y-auto">
            {players.map((player) => (
              <li key={player.id} className="text-gray-300 mb-2">
                {player.name} {player.nickname ? `(${player.nickname})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ApiTest;
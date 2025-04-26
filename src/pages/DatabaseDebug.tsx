import React, { useState, useEffect } from 'react';
import { Button, Card } from '../components/common';
import { API_URL } from '../services/db/api';

// Component to display any type of data nicely
const DataDisplay: React.FC<{ label: string; data: any }> = ({ label, data }) => (
  <div className="mb-4">
    <h3 className="text-neon-blue font-medium text-sm mb-1">{label}</h3>
    <div className="bg-dark-900 rounded p-3 overflow-x-auto">
      <pre className="text-xs text-gray-300">{JSON.stringify(data, null, 2)}</pre>
    </div>
  </div>
);

// Debug request with explicit details
const makeDebugRequest = async (url: string): Promise<{
  status: number;
  ok: boolean;
  statusText: string;
  rawText: string;
  parsedData?: any;
  error?: string;
}> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const rawText = await response.text();
    let parsedData = null;
    let error = null;
    
    try {
      parsedData = JSON.parse(rawText);
    } catch (e) {
      error = e instanceof Error ? e.message : 'JSON parse error';
    }
    
    return {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      rawText: rawText,
      parsedData,
      error
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      statusText: 'Request failed',
      rawText: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const DatabaseDebug: React.FC = () => {
  // Local state
  const [directApiResult, setDirectApiResult] = useState<any>(null);
  const [directApiLoading, setDirectApiLoading] = useState(false);
  
  const [proxyApiResult, setProxyApiResult] = useState<any>(null);
  const [proxyApiLoading, setProxyApiLoading] = useState(false);
  
  const [customApiResult, setCustomApiResult] = useState<any>(null);
  const [customApiLoading, setCustomApiLoading] = useState(false);
  
  const [customUrl, setCustomUrl] = useState(`http://${window.location.hostname}:3001/api/players`);
  
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // Get device info
  useEffect(() => {
    setDeviceInfo({
      userAgent: navigator.userAgent,
      host: window.location.hostname,
      port: window.location.port,
      autoApiUrl: API_URL,
      protocol: window.location.protocol,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
    });
  }, []);

  // Test direct API connection (using the full URL)
  const testDirectApi = async () => {
    setDirectApiLoading(true);
    setDirectApiResult(null);
    
    try {
      const url = `http://${window.location.hostname}:3001/api/players`;
      const result = await makeDebugRequest(url);
      setDirectApiResult({
        url,
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setDirectApiResult({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    } finally {
      setDirectApiLoading(false);
    }
  };

  // Test API connection using the configured API_URL
  const testProxyApi = async () => {
    setProxyApiLoading(true);
    setProxyApiResult(null);
    
    try {
      const url = `${API_URL}/players`;
      const result = await makeDebugRequest(url);
      setProxyApiResult({
        url,
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setProxyApiResult({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    } finally {
      setProxyApiLoading(false);
    }
  };

  // Test custom URL
  const testCustomUrl = async () => {
    setCustomApiLoading(true);
    setCustomApiResult(null);
    
    try {
      const result = await makeDebugRequest(customUrl);
      setCustomApiResult({
        url: customUrl,
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setCustomApiResult({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    } finally {
      setCustomApiLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4">
      <Card className="mb-6 p-4">
        <h1 className="text-2xl font-bold text-neon-blue mb-4">Database Connectivity Debug</h1>
        <p className="text-gray-300 mb-4">
          This page helps diagnose issues with connecting to your database from iPad/mobile devices.
        </p>
        
        <div className="bg-dark-800/50 border border-gray-700 p-3 rounded mb-4">
          <p className="text-sm text-yellow-400 mb-1">Troubleshooting Tips</p>
          <ul className="list-disc list-inside text-sm text-gray-300">
            <li>Make sure both your iPad and computer are on the same network</li>
            <li>Check if your computer firewall is blocking the API port (3001)</li>
            <li>Check if your server is properly listening on 0.0.0.0 (all interfaces)</li>
            <li>Look for CORS errors in the response data below</li>
          </ul>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Test Direct API Connection</h2>
          <p className="text-sm text-gray-400 mb-4">
            This tests a direct connection to the API server using a hardcoded URL.
          </p>
          <Button 
            onClick={testDirectApi}
            disabled={directApiLoading}
            className="mt-auto"
          >
            {directApiLoading ? 'Testing...' : 'Test Direct Connection'}
          </Button>
        </Card>
        
        <Card className="p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Test API_URL Config</h2>
          <p className="text-sm text-gray-400 mb-4">
            This tests connection using the configured API_URL from your app.
          </p>
          <Button 
            onClick={testProxyApi}
            disabled={proxyApiLoading}
            className="mt-auto"
          >
            {proxyApiLoading ? 'Testing...' : 'Test API_URL Config'}
          </Button>
        </Card>
        
        <Card className="p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Test Custom URL</h2>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="bg-dark-900 text-gray-300 border border-gray-700 rounded px-3 py-2 mb-4"
          />
          <Button 
            onClick={testCustomUrl}
            disabled={customApiLoading}
            className="mt-auto"
          >
            {customApiLoading ? 'Testing...' : 'Test Custom URL'}
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {deviceInfo && (
          <Card className="p-4">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Device Information</h2>
            <DataDisplay label="Device Info" data={deviceInfo} />
          </Card>
        )}
        
        {directApiResult && (
          <Card className="p-4">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">
              Direct API Results 
              <span className={`ml-2 text-sm ${directApiResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                {directApiResult.ok ? '✅ Success' : '❌ Failed'}
              </span>
            </h2>
            <DataDisplay label="Response Details" data={directApiResult} />
            
            {directApiResult.parsedData && (
              <div className="mt-4">
                <h3 className="text-neon-blue font-medium mb-2">Players Loaded: {Array.isArray(directApiResult.parsedData) ? directApiResult.parsedData.length : 'N/A'}</h3>
                {Array.isArray(directApiResult.parsedData) && directApiResult.parsedData.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-300">
                    {directApiResult.parsedData.slice(0, 5).map((player: any) => (
                      <li key={player.id}>
                        {player.name} {player.nickname ? `(${player.nickname})` : ''}
                      </li>
                    ))}
                    {directApiResult.parsedData.length > 5 && <li>... and {directApiResult.parsedData.length - 5} more</li>}
                  </ul>
                )}
              </div>
            )}
          </Card>
        )}
        
        {proxyApiResult && (
          <Card className="p-4">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">
              API_URL Config Results
              <span className={`ml-2 text-sm ${proxyApiResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                {proxyApiResult.ok ? '✅ Success' : '❌ Failed'}
              </span>
            </h2>
            <DataDisplay label="Response Details" data={proxyApiResult} />
            
            {proxyApiResult.parsedData && (
              <div className="mt-4">
                <h3 className="text-neon-blue font-medium mb-2">Players Loaded: {Array.isArray(proxyApiResult.parsedData) ? proxyApiResult.parsedData.length : 'N/A'}</h3>
                {Array.isArray(proxyApiResult.parsedData) && proxyApiResult.parsedData.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-300">
                    {proxyApiResult.parsedData.slice(0, 5).map((player: any) => (
                      <li key={player.id}>
                        {player.name} {player.nickname ? `(${player.nickname})` : ''}
                      </li>
                    ))}
                    {proxyApiResult.parsedData.length > 5 && <li>... and {proxyApiResult.parsedData.length - 5} more</li>}
                  </ul>
                )}
              </div>
            )}
          </Card>
        )}
        
        {customApiResult && (
          <Card className="p-4">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">
              Custom URL Results
              <span className={`ml-2 text-sm ${customApiResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                {customApiResult.ok ? '✅ Success' : '❌ Failed'}
              </span>
            </h2>
            <DataDisplay label="Response Details" data={customApiResult} />
            
            {customApiResult.parsedData && (
              <div className="mt-4">
                <h3 className="text-neon-blue font-medium mb-2">Players Loaded: {Array.isArray(customApiResult.parsedData) ? customApiResult.parsedData.length : 'N/A'}</h3>
                {Array.isArray(customApiResult.parsedData) && customApiResult.parsedData.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-300">
                    {customApiResult.parsedData.slice(0, 5).map((player: any) => (
                      <li key={player.id}>
                        {player.name} {player.nickname ? `(${player.nickname})` : ''}
                      </li>
                    ))}
                    {customApiResult.parsedData.length > 5 && <li>... and {customApiResult.parsedData.length - 5} more</li>}
                  </ul>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default DatabaseDebug;
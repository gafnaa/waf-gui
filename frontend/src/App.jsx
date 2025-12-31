import React, { useEffect, useState } from 'react';
import { Shield, Activity, RefreshCw } from 'lucide-react';
import StatCard from './components/StatCard';
import { getStats, restartNginx } from './services/api';

function App() {
  const [stats, setStats] = useState({ total_requests: 0, blocked_requests: 0, status: 'unknown' });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleRestart = async () => {
    try {
      await restartNginx();
      alert('Nginx restart command sent');
    } catch (error) {
      alert('Failed to restart Nginx');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="text-blue-500" />
          WAF Dashboard
        </h1>
        <button 
          onClick={handleRestart}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={18} />
          Restart Nginx
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Requests" 
          value={stats.total_requests || 0} 
          icon={Activity} 
          color="text-blue-400" 
        />
        <StatCard 
          title="Blocked Threats" 
          value={stats.blocked_requests || 0} 
          icon={Shield} 
          color="text-red-400" 
        />
        <StatCard 
          title="System Status" 
          value={stats.status || 'Active'} 
          icon={Activity} 
          color="text-green-400" 
        />
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="text-gray-400">
          Log visualization will go here...
        </div>
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { 
  Activity, ShieldAlert, Server, RefreshCw, Lock, Unlock 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { getStats, addWafRule, restartNginx } from './services/api';
import StatCard from './components/StatCard';
import Sidebar from './components/Sidebar';     // Komponen Baru
import RulesPage from './pages/RulesPage';      // Halaman Baru

// --- KOMPONEN DASHBOARD (Logic Lama) ---
const Dashboard = () => {
  const [stats, setStats] = useState({
    total_requests: 0,
    blocked_attacks: 0,
    cache_hit_rate: 0,
    status: 'loading...'
  });
  
  const [chartData, setChartData] = useState([]);
  const [ipInput, setIpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getStats();
        setStats(response.data);
        
        setChartData(prev => {
            const newData = [...prev, { 
                name: new Date().toLocaleTimeString(), 
                req: response.data.total_requests,
                blocked: response.data.blocked_attacks 
            }];
            if (newData.length > 10) newData.shift(); 
            return newData;
        });

      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); 
    return () => clearInterval(interval);
  }, []);

  const handleWafAction = async (action) => {
    if (!ipInput) return alert("Please enter an IP Address");
    setIsLoading(true);
    try {
      const res = await addWafRule(ipInput, action);
      alert(res.data.message);
      setIpInput("");
    } catch (err) {
      alert("Error updating WAF rule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!confirm("Are you sure you want to reload Nginx?")) return;
    setIsLoading(true);
    try {
      const res = await restartNginx();
      alert(res.data.message);
    } catch (err) {
      alert("Failed to reload Nginx");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Requests" 
          value={stats.total_requests} 
          icon={Activity} 
          color="text-blue-400" 
        />
        <StatCard 
          title="Blocked Attacks" 
          value={stats.blocked_attacks} 
          icon={ShieldAlert} 
          color="text-red-400" 
        />
        <StatCard 
          title="Cache Hit Rate" 
          value={`${stats.cache_hit_rate}%`} 
          icon={Server} 
          color="text-emerald-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-6">Traffic Overview</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  itemStyle={{ color: '#E5E7EB' }}
                />
                <Line type="monotone" dataKey="req" stroke="#60A5FA" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="blocked" stroke="#F87171" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Controls Section */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock size={20} /> Quick Block
            </h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="IP Address (e.g., 192.168.1.55)"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleWafAction('allow')}
                  disabled={isLoading}
                  className="flex justify-center items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
                >
                  <Unlock size={16} /> Whitelist
                </button>
                <button 
                  onClick={() => handleWafAction('deny')}
                  disabled={isLoading}
                  className="flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition"
                >
                  <ShieldAlert size={16} /> Block
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Server size={20} /> System
            </h3>
            <button 
              onClick={handleRestart}
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
            >
              <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? "Processing..." : "Reload Nginx"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT BARU ---
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                <p className="text-gray-400 text-sm">Server: Rocky-Linux-9-Node-1</p>
            </div>
            <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20">
                    SYSTEM ONLINE
                </span>
            </div>
        </header>

        {/* Dynamic Content Switching */}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'rules' && <RulesPage />}
        {activeTab === 'logs' && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                <ShieldAlert size={48} className="mb-4 opacity-50"/>
                <p className="text-lg">Attack Log Analysis Module</p>
                <span className="text-sm">(Feature Coming Soon)</span>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;
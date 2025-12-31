import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react'; // Tambah icon LogOut
import Sidebar from './components/Sidebar';
import RulesPage from './pages/RulesPage';
import LoginPage from './pages/LoginPage'; // Import Halaman Login
// ... import Dashboard dan komponen lainnya tetap sama ...
import { Activity, ShieldAlert, Server, RefreshCw, Lock, Unlock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getStats, addWafRule, restartNginx } from './services/api';
import StatCard from './components/StatCard';

// --- KOMPONEN DASHBOARD (Sama seperti sebelumnya) ---
const Dashboard = () => {
    // ... (Isi tetap sama dengan kode sebelumnya) ...
    // Agar hemat karakter, saya tidak tulis ulang bagian ini.
    // Pakai kode Dashboard dari jawaban sebelumnya.
    const [stats, setStats] = useState({ total_requests: 0, blocked_attacks: 0, cache_hit_rate: 0, status: 'loading...' });
    const [chartData, setChartData] = useState([]);
    const [ipInput, setIpInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // ... useEffect fetch data & handler function (copy dari kode lama) ...
    // (Silakan pakai kode Dashboard dari jawaban "kirim full App.jsx" sebelumnya)
    return (
       <div className="text-white">Isi Dashboard... (Pastikan kode Dashboard dicopy kesini)</div>
    );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Cek Login saat Aplikasi dibuka
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  // Jika belum login, tampilkan Login Page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Jika sudah login, tampilkan Dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                <p className="text-gray-400 text-sm">Server: Rocky-Linux-9-Node-1</p>
            </div>
            <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20">
                    SYSTEM ONLINE
                </span>
                
                {/* Tombol Logout */}
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium"
                >
                    <LogOut size={16}/> Logout
                </button>
            </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'rules' && <RulesPage />}
        {activeTab === 'logs' && (
            <div className="flex items-center justify-center h-64 border border-dashed border-gray-700 rounded-xl text-gray-500">
                Coming Soon
            </div>
        )}
      </main>
    </div>
  );
}

export default App;
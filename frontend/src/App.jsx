import React, { useState, useEffect } from 'react';
import { LogOut, Bell } from 'lucide-react';
import Sidebar from './components/Sidebar';
import RulesPage from './pages/RulesPage';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';

// Placeholder Components for missing pages
const PlaceholderPage = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="p-6 bg-slate-800/50 rounded-full border border-dashed border-slate-700">
            <span className="text-4xl">🚧</span>
        </div>
        <div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
                This module is under development. Please check back later for updates.
            </p>
        </div>
    </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // Default to overview

  // Check Login on App Load
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

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#050A18] text-slate-200 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 h-screen overflow-y-auto">
        
        {/* Global Header (Optional - usually page specific but we can keep a top bar if needed) */}
        {/* For this design, headers are inside pages, but we can add a user/notif bar here if we want global access */}
        
        {/* Page Content */}
        <div className="max-w-7xl mx-auto">
            <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out">
                {activeTab === 'overview' && <OverviewPage />}
                {activeTab === 'rules' && <RulesPage />}
                {activeTab === 'access-control' && <PlaceholderPage title="Access Control" />}
                {activeTab === 'server-monitor' && <PlaceholderPage title="Server Monitor" />}
                {activeTab === 'logs' && <PlaceholderPage title="System Logs" />}
                {activeTab === 'settings' && <PlaceholderPage title="System Configuration" />}
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;
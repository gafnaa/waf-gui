import React from 'react';
import { LayoutDashboard, Shield, FileText, Settings } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rules', label: 'Rule Tuning', icon: Shield },
    { id: 'logs', label: 'Attack Logs', icon: FileText },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-emerald-500"/> Sentinel<span className="text-gray-500">WAF</span>
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 text-gray-400 text-sm">
            <Settings size={16}/> System v1.0.2
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
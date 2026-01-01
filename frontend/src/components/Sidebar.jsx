import React from 'react';
import { 
  LayoutDashboard, 
  Shield, 
  Lock, 
  Server, 
  FileText, 
  Settings 
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'rules', label: 'Rules', icon: Shield },
    { id: 'access-control', label: 'Access Control', icon: Lock },
    { id: 'server-monitor', label: 'Server Monitor', icon: Server },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 h-screen fixed left-0 top-0 border-r border-slate-800 flex flex-col z-50">
      
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
           <Shield className="text-white w-5 h-5 fill-current" />
        </div>
        <div>
           <h1 className="text-lg font-bold text-white tracking-tight leading-none">SentinelWAF</h1>
           <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Enterprise Security</span>
        </div>
      </div>

      {/* Node Status Widget */}
      <div className="px-4 py-6">
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Node Status</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
            </div>
            <div className="font-mono text-xs text-slate-300">us-east-1a • v4.2.0</div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2">
         {menuItems.map((item) => {
             const Icon = item.icon;
             const isActive = activeTab === item.id;
             
             return (
                 <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        isActive 
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                 >
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {item.label}
                 </button>
             )
         })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <span className="text-xs font-bold text-slate-400">AP</span>
              </div>
              <div className="overflow-hidden">
                  <h4 className="text-sm font-medium text-slate-200 truncate">Alexander P.</h4>
                  <p className="text-xs text-slate-500 truncate">Security Admin</p>
              </div>
          </div>
      </div>
    </aside>
  );
};

export default Sidebar;
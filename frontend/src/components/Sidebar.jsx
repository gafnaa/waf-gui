import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  Lock, 
  Server, 
  FileText, 
  Settings,
  LogOut 
} from 'lucide-react';
import { getUserProfile } from '../services/api';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({ name: 'Loading...', role: 'Security Admin' });

  const fetchUser = async () => {
      try {
          const res = await getUserProfile();
          setUser({
              name: res.data.full_name || res.data.username,
              role: 'Security Admin' // Static for now, can be dynamic later
          });
      } catch (err) {
          console.error("Failed to fetch user for sidebar", err);
      }
  };

  useEffect(() => {
      fetchUser();

      // Listen for updates from SettingsPage
      const handleUpdate = () => fetchUser();
      window.addEventListener('user-profile-updated', handleUpdate);

      return () => window.removeEventListener('user-profile-updated', handleUpdate);
  }, []);

  const menuItems = [
    { path: '/overview', label: 'Overview', icon: LayoutDashboard },
    { path: '/rules', label: 'WAF Management', icon: Shield },
    { path: '/access-control', label: 'Access Control', icon: Lock },
    { path: '/server-monitor', label: 'Server Monitor', icon: Server },
    { path: '/logs', label: 'Logs', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
      localStorage.removeItem('token');
      navigate('/login');
  };

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

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2 no-scrollbar">
         {menuItems.map((item) => {
             const Icon = item.icon;
             const isActive = location.pathname.startsWith(item.path);
             
             return (
                 <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
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
      <div className="p-4 border-t border-slate-800/50 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 overflow-hidden relative">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff&size=128`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
              </div>
              <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">{user.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{user.role}</p>
              </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-400 transition-colors"
          >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
          </button>
      </div>
    </aside>
  );
};

export default Sidebar;
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  Lock, 
  Server, 
  FileText, 
  Settings,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { getUserProfile } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({ name: 'Loading...', role: 'Security Admin' });
  const { theme, toggleTheme } = useTheme();

  const fetchUser = async () => {
      try {
          const res = await getUserProfile();
          setUser({
              name: res.data.full_name || res.data.username,
              role: 'Security Admin' 
          });
      } catch (err) {
          console.error("Failed to fetch user for sidebar", err);
      }
  };

  useEffect(() => {
      fetchUser();
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
    <aside className="w-64 dark:bg-slate-900 bg-white h-screen fixed left-0 top-0 border-r dark:border-slate-800 border-slate-200 flex flex-col z-50 transition-colors duration-300">
      
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3 border-b dark:border-slate-800/50 border-slate-200/50">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
           <Shield className="text-white w-5 h-5 fill-current" />
        </div>
        <div>
           <h1 className="text-lg font-bold dark:text-white text-slate-900 tracking-tight leading-none">SentinelWAF</h1>
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
                        ? 'dark:bg-blue-600/10 bg-blue-50 dark:text-blue-400 text-blue-600 border dark:border-blue-600/20 border-blue-200 shadow-sm' 
                        : 'dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/50 hover:bg-slate-100 border border-transparent'
                    }`}
                 >
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'dark:text-blue-400 text-blue-600' : 'text-slate-500 dark:group-hover:text-slate-300 group-hover:text-slate-700'}`} />
                    {item.label}
                 </button>
             )
         })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t dark:border-slate-800/50 border-slate-200/50 space-y-2">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium dark:text-slate-400 text-slate-600 dark:hover:bg-slate-800/50 hover:bg-slate-100 transition-colors mb-2"
          >
             <span className="flex items-center gap-2">
                 {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                 <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
             </span>
             <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}>
                 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${theme === 'dark' ? 'left-4.5' : 'left-0.5'}`} style={{ transform: theme === 'dark' ? 'translateX(100%)' : 'translateX(0)' }}></div>
             </div>
          </button>

          <div className="flex items-center gap-3 p-2 rounded-lg dark:hover:bg-slate-800/50 hover:bg-slate-100 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-full dark:bg-slate-800 bg-slate-200 flex items-center justify-center border dark:border-slate-700 border-slate-300 overflow-hidden relative">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff&size=128`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
              </div>
              <div className="overflow-hidden">
                  <h4 className="text-sm font-bold dark:text-slate-200 text-slate-900 truncate dark:group-hover:text-white group-hover:text-blue-600 transition-colors">{user.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{user.role}</p>
              </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-500 transition-colors"
          >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
          </button>
      </div>
    </aside>
  );
};

export default Sidebar;
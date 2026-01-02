import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Key, Eye, EyeOff, Circle } from 'lucide-react';
import { loginUser } from '../services/api';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginUser(formData.username, formData.password);
      // Assuming response follows standard JWT pattern as implied in previous code
      const token = res?.data?.access_token || res?.access_token;
      
      if (token) {
        localStorage.setItem('token', token);
        navigate('/'); // Redirect to dashboard
      } else {
        // Fallback for demo if no backend token but success
        navigate('/'); 
      }
      
    } catch (err) {
      console.error(err);
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050A18] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#050A18] to-[#000000] flex items-center justify-center p-4 relative overflow-hidden text-slate-200">
      
      {/* Background Decoration */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[420px] mx-auto z-10 flex flex-col items-center">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8 space-y-3 text-center">
          <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl mb-2">
            <Shield className="w-8 h-8 text-white fill-current" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">WAF Admin Console</h1>
            <p className="text-slate-400 text-xs font-medium tracking-wide">
              Secure Access <span className="mx-1 text-slate-600">|</span> Nginx + ModSecurity
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full bg-[#0B1120]/80 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <Circle className="w-4 h-4 fill-red-500/20" />
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <Input 
                    type="text" 
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="admin"
                    required
                    className="pl-10 h-11 bg-[#151b2b] border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all rounded-xl"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <Input 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="pl-10 pr-10 h-11 bg-[#151b2b] border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Authenticate Button */}
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] border border-blue-500/20"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>{loading ? "Authenticating..." : "Authenticate"}</span>
              </div>
            </Button>

            {/* System Status */}
            <div className="pt-2 flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full border border-slate-800/50">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 tracking-widest">
                  SYSTEM STATUS: OPERATIONAL
                </span>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest">
             © 2026 WAF Shield by gafnaa
          </p>
          <p className="text-slate-700 text-[10px] font-mono">
            v3.1.0-stable
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
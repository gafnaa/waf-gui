import React, { useState } from 'react';
import { ShieldCheck, Lock, User } from 'lucide-react';
import { loginUser } from '../services/api';

const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        console.log("Attempting login...");
        const res = await loginUser(username, password);
        console.log("Login success:", res.data);
        const token = res.data.access_token;
        localStorage.setItem('token', token);
        onLoginSuccess(); 
    } catch (err) {
        console.error("Login failed:", err);
        const errorMsg = err.response?.data?.detail || "Invalid username or password";
        setError(errorMsg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
                <ShieldCheck size={48} className="text-emerald-500"/>
            </div>
            <h1 className="text-2xl font-bold text-white">Nginx Sentinel</h1>
            <p className="text-gray-400">Secure WAF Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-sm text-center">
                    {error}
                </div>
            )}

            <div>
                <label className="text-gray-400 text-sm mb-1 block">Username</label>
                <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-500" size={18}/>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="Enter username"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="text-gray-400 text-sm mb-1 block">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-500" size={18}/>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-all"
            >
                {loading ? "Verifying..." : "Login to Dashboard"}
            </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Shield, 
  Database, 
  Code, 
  FileWarning, 
  Terminal, 
  Bot, 
  Lock, 
  Activity, 
  Download, 
  Clock, 
  Cpu, 
  Globe, 
  Zap,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { getStats } from "../services/api";

const StatCard = ({ title, value, subtext, trend, icon: Icon, trendUp }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">{title}</span>
      <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-slate-800 transition-colors">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
    </div>
    <div className="flex items-end gap-3 z-10">
      <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
      {subtext && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${trendUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'}`}>
          {subtext}
        </span>
      )}
    </div>
    {/* Decorative Background Icon */}
    <Icon className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-800/30 group-hover:text-slate-800/50 transition-colors z-0" />
  </div>
);

const ModuleCard = ({ module }) => {
  const isActive = module.status === 'Active';
  
  // Mapping Icon Name string to Component if needed, or if module.icon isn't a component
  let IconComponent = Shield;
  if (module.title.includes("SQL")) IconComponent = Database;
  if (module.title.includes("XSS")) IconComponent = Code;
  if (module.title.includes("DDoS")) IconComponent = Zap;
  if (module.title.includes("Brute")) IconComponent = Lock;
  if (module.title.includes("Command")) IconComponent = Terminal;
  if (module.title.includes("Bot")) IconComponent = Bot;

  // Color logic based on component type
  let color = 'text-blue-500';
  let bgColor = 'bg-blue-500/10';
  let lineColor = '#3b82f6';

  if (module.title.includes("SQL")) { color = 'text-rose-500'; bgColor = 'bg-rose-500/10'; lineColor = '#f43f5e'; }
  if (module.title.includes("XSS")) { color = 'text-amber-500'; bgColor = 'bg-amber-500/10'; lineColor = '#f59e0b'; }
  if (module.title.includes("DDoS")) { color = 'text-purple-500'; bgColor = 'bg-purple-500/10'; lineColor = '#a855f7'; }
  if (module.title.includes("Brute")) { color = 'text-orange-500'; bgColor = 'bg-orange-500/10'; lineColor = '#f97316'; }
  if (module.title.includes("Command")) { color = 'text-slate-500'; bgColor = 'bg-slate-500/10'; lineColor = '#64748b'; }
  if (module.title.includes("Bot")) { color = 'text-emerald-500'; bgColor = 'bg-emerald-500/10'; lineColor = '#10b981'; }

  return (
    <div className={`relative bg-slate-900/50 border ${isActive ? 'border-slate-800' : 'border-slate-800/60 opacity-70'} rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all group overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${bgColor}`}>
            <IconComponent className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">{module.title}</h4>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{module.subtitle}</p>
          </div>
        </div>
        
        {/* Toggle Simulation */}

      </div>

      <div className="flex justify-between items-end">
        <div>
           {isActive ? (
             <>
                <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${color}`}>{module.count}</span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Today</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Last incident: {module.last_incident}</p>
             </>
           ) : (
                <div className="text-xl font-bold text-slate-600 tracking-wide">Inactive</div>
           )}
        </div>

        {/* Mini Bar Chart for Trend */}
        {isActive && module.trend && (
            <div className="flex items-end gap-1 h-8">
                {module.trend.map((val, i) => (
                    <div 
                        key={i} 
                        style={{ height: `${(val / (Math.max(...module.trend) || 1)) * 100}%`, backgroundColor: lineColor }} 
                        className="w-1.5 rounded-t-sm opacity-60 hover:opacity-100 transition-opacity"
                    />
                ))}
            </div>
        )}
      </div>
      
       {isActive && <div className="absolute bottom-4 right-4 text-[10px] text-slate-600 font-mono">ID: {module.id}</div>}
    </div>
  );
};

const OverviewPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await getStats();
                setStats(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch stats:", err);
                setError("Failed to load dashboard data. Is backend running?");
                setLoading(false);
            }
        };

        fetchData();
        // Set interval to refresh data every 10 seconds
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p>Loading security status...</p>
            </div>
        );
    }

    if (error || !stats) {
        return (
             <div className="flex items-center justify-center h-[50vh] text-red-400 gap-3">
                <FileWarning className="w-8 h-8" />
                <p>{error || "No data available"}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                   <Shield className="w-5 h-5 text-blue-500" />
                   <h2 className="text-xl font-bold text-white tracking-tight">Security Overview</h2>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        {['Live', '1H', '24H', '7D'].map((t) => (
                            <button key={t} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${t === 'Live' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-blue-600 border-blue-600 hover:bg-blue-500 hover:border-blue-500 text-white shadow shadow-blue-900/20">
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Report</span>
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Requests" 
                    value={stats.total_requests.toLocaleString()} 
                    subtext="Live" 
                    trendUp={true} 
                    icon={Globe} 
                />
                <StatCard 
                    title="Threats Blocked" 
                    value={stats.blocked_attacks.toLocaleString()} 
                    subtext="Live" 
                    trendUp={true} 
                    icon={Shield} 
                />
                <StatCard 
                    title="Avg Latency" 
                    value={stats.avg_latency} 
                    subtext="Stable" 
                    trendUp={true} 
                    icon={Clock} 
                />
                <StatCard 
                    title="CPU Load" 
                    value={stats.cpu_load} 
                    subtext={stats.system_status} 
                    trendUp={false} 
                    icon={Cpu} 
                />
            </div>

            {/* Active modules header */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                    <div className="h-5 w-1 bg-rose-500 rounded-full" />
                    <h3 className="text-lg font-bold text-white">Active Protection Modules</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 tracking-wide">
                        {stats.system_status}
                    </span>
                </div>
                <Button variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 p-0 h-auto font-normal">
                    Configure Rules <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.attack_modules.map((module, idx) => (
                    <ModuleCard key={idx} module={module} />
                ))}
            </div>

            {/* Traffic Chart */}
            <Card className="bg-slate-900/50 border-slate-800 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">Real-Time Traffic Analysis</h3>
                        <p className="text-sm text-slate-500">Hourly Requests (24h) • Inbound Traffic</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-slate-300">Valid Traffic</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="text-slate-300">Blocked Attacks</span>
                        </div>
                    </div>
                </div>
                
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.traffic_chart}>
                            <defs>
                                <linearGradient id="colorValid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                stroke="#475569" 
                                tick={{fill: '#64748b', fontSize: 12}} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                stroke="#475569" 
                                tick={{fill: '#64748b', fontSize: 12}} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                itemStyle={{ fontSize: '12px' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="valid" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorValid)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="blocked" 
                                stroke="#f43f5e" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorBlocked)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

export default OverviewPage;

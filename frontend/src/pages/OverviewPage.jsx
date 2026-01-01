import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

// --- Mock Data ---
const trafficData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  valid: Math.floor(Math.random() * 500) + 200,
  blocked: Math.floor(Math.random() * 100) + 20
}));

const attackModules = [
  {
    title: 'SQL Injection',
    subtitle: 'High Severity Protection',
    count: 42,
    trend: [4, 6, 8, 12, 10, 15, 20], // Last 7 data points
    icon: Database,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    lineColor: '#f43f5e',
    status: 'Active',
    lastIncident: '2m ago',
    id: '9422'
  },
  {
    title: 'XSS Filtering',
    subtitle: 'Script Injection Defense',
    count: 12,
    trend: [2, 3, 2, 5, 4, 3, 2],
    icon: Code,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    lineColor: '#f59e0b',
    status: 'Active',
    lastIncident: '45m ago',
    id: '1084'
  },
  {
    title: 'DDoS Protection',
    subtitle: 'L7 Rate Limiting',
    count: '1.0K',
    trend: [100, 200, 150, 400, 300, 800, 1000],
    icon: Zap,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    lineColor: '#a855f7',
    status: 'Active',
    lastIncident: 'Just now',
    id: 'D-01'
  },
  {
    title: 'Brute Force',
    subtitle: 'Credential Stuffing',
    count: 85,
    trend: [10, 12, 15, 20, 40, 60, 85],
    icon: Lock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    lineColor: '#f97316',
    status: 'Active',
    lastIncident: '1h ago',
    id: '8821'
  },
  {
    title: 'Command Injection',
    subtitle: 'System Call Protection',
    count: 0,
    trend: [0, 0, 0, 0, 0, 0, 0],
    icon: Terminal,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    lineColor: '#64748b',
    status: 'Inactive',
    lastIncident: 'No data',
    id: '----'
  },
  {
    title: 'Bot Mitigation',
    subtitle: 'User-Agent Challenge',
    count: 305,
    trend: [20, 40, 50, 80, 100, 200, 305],
    icon: Bot,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    lineColor: '#10b981',
    status: 'Active',
    lastIncident: '5m ago',
    id: 'B-99'
  }
];

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
  
  return (
    <div className={`relative bg-slate-900/50 border ${isActive ? 'border-slate-800' : 'border-slate-800/60 opacity-70'} rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all group overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${module.bgColor}`}>
            <module.icon className={`w-5 h-5 ${module.color}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">{module.title}</h4>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{module.subtitle}</p>
          </div>
        </div>
        
        {/* Toggle Simulation */}
        <div className={`w-8 h-4 rounded-full relative transition-colors ${isActive ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
          <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${isActive ? 'right-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'left-0.5 bg-slate-500'}`} />
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
           {isActive ? (
             <>
                <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${module.color}`}>{module.count}</span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Today</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Last incident: {module.lastIncident}</p>
             </>
           ) : (
                <div className="text-xl font-bold text-slate-600 tracking-wide">Inactive</div>
           )}
        </div>

        {/* Mini Bar Chart for Trend */}
        {isActive && (
            <div className="flex items-end gap-1 h-8">
                {module.trend.map((val, i) => (
                    <div 
                        key={i} 
                        style={{ height: `${(val / Math.max(...module.trend)) * 100}%`, backgroundColor: module.lineColor }} 
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
                    value="2.4M" 
                    subtext="+12%" 
                    trendUp={true} 
                    icon={Globe} 
                />
                <StatCard 
                    title="Threats Blocked" 
                    value="1,498" 
                    subtext="+5%" 
                    trendUp={true} 
                    icon={Shield} 
                />
                <StatCard 
                    title="Avg Latency" 
                    value="24ms" 
                    subtext="-2ms" 
                    trendUp={true} 
                    icon={Clock} 
                />
                <StatCard 
                    title="CPU Load" 
                    value="42%" 
                    subtext="Stable" 
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
                        SYSTEM HEALTHY
                    </span>
                </div>
                <Button variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 p-0 h-auto font-normal">
                    Configure Rules <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attackModules.map((module, idx) => (
                    <ModuleCard key={idx} module={module} />
                ))}
            </div>

            {/* Traffic Chart */}
            <Card className="bg-slate-900/50 border-slate-800 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">Real-Time Traffic Analysis</h3>
                        <p className="text-sm text-slate-500">Requests per Second (RPS) • Inbound Traffic</p>
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
                        <AreaChart data={trafficData}>
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

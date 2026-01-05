import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Terminal, 
  Bot, 
  Lock, 
  Download, 
  Clock, 
  Cpu, 
  Globe, 
  Zap,
  ArrowRight,
  Loader2,
  FileWarning,
  Link
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { getStats } from "../services/api";
import { useTheme } from '../context/ThemeContext';

// --- Hooks & Components for Animation ---

const useCountUp = (end, duration = 1500) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    // Reset loop if end changes drasticly? 
    // For now we just animate from 0 on mount or when key changes.
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Ease Out Quart
      const ease = 1 - Math.pow(1 - percentage, 4);
      
      setCount(ease * end);

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure exact final value
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

const AnimatedNumber = ({ value }) => {
  // Handle numbers or strings with suffixes (e.g. "45%", "12ms")
  let numericValue = 0;
  let suffix = "";

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    // Regex extract number and suffix
    const match = value.match(/([\d\.]+)(.*)/);
    if (match) {
        numericValue = parseFloat(match[1]);
        suffix = match[2];
    } else {
        return <span>{value}</span>; // Fallback for non-numeric
    }
  }

  const current = useCountUp(numericValue);
  
  // Format: Commas for large integers, decimals for small floats (if any)
  // We assume integer counting mostly.
  const displayVal = Math.floor(current).toLocaleString();

  return <span>{displayVal}{suffix}</span>;
};


const StatCard = ({ title, value, subtext, trend, icon: Icon, trendUp }) => (
  <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 shadow-sm rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className="dark:text-slate-400 text-slate-500 text-xs font-semibold tracking-wider uppercase">{title}</span>
      <div className="p-2 dark:bg-slate-800/50 bg-slate-100 rounded-lg dark:group-hover:bg-slate-800 group-hover:bg-slate-200 transition-colors">
        <Icon className="w-5 h-5 dark:text-slate-400 text-slate-500" />
      </div>
    </div>
    <div className="flex items-end gap-3 z-10">
      <h3 className="text-3xl font-bold dark:text-white text-slate-900 tracking-tight">
         <AnimatedNumber value={value} />
      </h3>
      {subtext && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${trendUp ? 'text-emerald-500 bg-emerald-500/10' : 'dark:text-slate-400 text-slate-500 dark:bg-slate-800 bg-slate-100'}`}>
          {subtext}
        </span>
      )}
    </div>
    {/* Decorative Background Icon */}
    <Icon className="absolute -right-4 -bottom-4 w-24 h-24 dark:text-slate-800/30 text-slate-100 dark:group-hover:text-slate-800/50 group-hover:text-slate-200 transition-colors z-0" />
  </div>
);

const ModuleCard = ({ module, timeRange }) => {
  const isActive = module.status === 'Active';
  const [animate, setAnimate] = useState(false);

  // Helper to format the "Today" label based on context
  const getContextLabel = () => {
      const t = timeRange || 'Live';
      if (t === 'Live') return 'Today'; // Live usually implies Today's rolling status
      if (t === '1H') return 'Last Hour';
      if (t === '24H') return '24 Hours';
      if (t === '7D') return '7 Days';
      return t;
  };

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Mapping Icon Name string to Component if needed, or if module.icon isn't a component
  let IconComponent = Shield;
  if (module.title.includes("SQL")) IconComponent = Database;
  if (module.title.includes("XSS")) IconComponent = Code;
  if (module.title.includes("DDoS")) IconComponent = Zap;
  if (module.title.includes("Brute")) IconComponent = Lock;
  if (module.title.includes("Command")) IconComponent = Terminal;
  if (module.title.includes("Bot")) IconComponent = Bot;
  if (module.title.includes("Protocol Violation")) IconComponent = FileWarning;
  if (module.title.includes("Hotlink")) IconComponent = Link;

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
  if (module.title.includes("Protocol Violation")) { color = 'text-indigo-500'; bgColor = 'bg-indigo-500/10'; lineColor = '#6366f1'; }
  if (module.title.includes("Hotlink")) { color = 'text-pink-500'; bgColor = 'bg-pink-500/10'; lineColor = '#ec4899'; }

  return (
    <div className={`relative dark:bg-slate-900/50 bg-white border ${isActive ? 'dark:border-slate-800 border-slate-200' : 'dark:border-slate-800/60 border-slate-200/60 opacity-70'} rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all group overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${bgColor}`}>
            <IconComponent className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold dark:text-slate-100 text-slate-800">{module.title}</h4>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{module.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
             <>
                <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${isActive ? color : 'text-slate-400'}`}>
                        <AnimatedNumber value={module.count} />
                    </span>
                    {isActive ? (
                         <span className="text-[10px] font-medium text-slate-500 dark:bg-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{getContextLabel()}</span>
                    ) : (
                         <span className="text-[10px] font-bold text-slate-400 dark:bg-slate-800/50 bg-slate-100 px-1.5 py-0.5 rounded border dark:border-slate-700 border-slate-200 tracking-wider">OFF</span>
                    )}
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                    {isActive ? `Last incident: ${module.last_incident}` : 'Monitoring suspended'}
                </p>
             </>
        </div>

        {/* Mini Bar Chart for Trend */}
        {isActive && module.trend && (
            <div className="flex items-end gap-1 h-8">
                {module.trend.map((val, i) => (
                    <div 
                        key={i} 
                        style={{ 
                            height: animate ? `${(val / (Math.max(...module.trend) || 1)) * 100}%` : '0%', 
                            backgroundColor: lineColor,
                            transitionDelay: `${i * 100}ms`
                        }} 
                        className="w-1.5 rounded-t-sm opacity-60 hover:opacity-100 transition-all duration-500 ease-out"
                    />
                ))}
            </div>
        )}
      </div>
      
       {isActive && <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 font-mono">ID: {module.id}</div>}
    </div>
  );
};

const OverviewPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('Live');
    const { theme } = useTheme();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Keep loading true only on first load or manual filter change if desired, 
                // but for smooth polling we might not want spinner every 10s.
                // We'll let the user see the numbers update.
                const res = await getStats(timeRange.toLowerCase());
                setStats(res.data);
                setLoading(false);
                setIsTransitioning(false);
            } catch (err) {
                console.error("Failed to fetch stats:", err);
                setError("Failed to load dashboard data. Is backend running?");
                setLoading(false);
                setIsTransitioning(false);
            }
        };

        setIsTransitioning(true); // Start fade out
        fetchData();
        
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [timeRange]);

    if (loading && !stats) {
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

    // Chart Colors based on theme
    const chartGridColor = theme === 'dark' ? '#1e293b' : '#cbd5e1'; // slate-800 vs slate-300
    const chartTickColor = theme === 'dark' ? '#94a3b8' : '#64748b'; // slate-400 vs slate-500
    const toolTipBgs = theme === 'dark' ? '#0f172a' : '#ffffff';
    const toolTipBorder = theme === 'dark' ? '#1e293b' : '#e2e8f0';
    const toolTipText = theme === 'dark' ? '#f8fafc' : '#1e293b';

    return (
        <div className={`space-y-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
            
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                   <Shield className="w-5 h-5 text-blue-500" />
                   <h2 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight">Security Overview</h2>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex dark:bg-slate-900 bg-white p-1 rounded-lg border dark:border-slate-800 border-slate-200">
                        {['Live', '1H', '24H', '7D'].map((t) => (
                            <button 
                                key={t} 
                                onClick={() => setTimeRange(t)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === t ? 'dark:bg-slate-800 bg-slate-100 dark:text-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
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
                    value={stats.total_requests} 
                    subtext="Live" 
                    trendUp={true} 
                    icon={Globe} 
                />
                <StatCard 
                    title="Threats Blocked" 
                    value={stats.blocked_attacks} 
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
                    <h3 className="text-lg font-bold dark:text-white text-slate-900">Active Protection Modules</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 tracking-wide">
                        {stats.system_status}
                    </span>
                </div>
                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/rules')} 
                    className="text-xs text-blue-500 hover:text-blue-400 hover:bg-transparent p-0 h-auto font-normal cursor-pointer transition-colors"
                >
                    Configure Rules <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.attack_modules.map((module, idx) => (
                    <ModuleCard key={idx} module={module} timeRange={timeRange} />
                ))}
            </div>

            {/* Traffic Chart */}
            <Card className="dark:bg-slate-900/50 bg-white dark:border-slate-800 border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold dark:text-white text-slate-900">Real-Time Traffic Analysis</h3>
                        <p className="text-sm text-slate-500">Hourly Requests (24h) • Inbound Traffic</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="dark:text-slate-300 text-slate-600">Valid Traffic</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="dark:text-slate-300 text-slate-600">Blocked Attacks</span>
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
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                stroke={chartTickColor} 
                                tick={{fill: chartTickColor, fontSize: 12}} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                stroke={chartTickColor} 
                                tick={{fill: chartTickColor, fontSize: 12}} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: toolTipBgs, borderColor: toolTipBorder, color: toolTipText }}
                                itemStyle={{ fontSize: '12px' }}
                                labelStyle={{ color: chartTickColor, marginBottom: '4px' }}
                            />
                            {/* Animated Areas */}
                            <Area 
                                type="monotone" 
                                dataKey="valid" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorValid)"
                                animationDuration={2000}
                                animationEasing="ease-out"
                            />
                            <Area 
                                type="monotone" 
                                dataKey="blocked" 
                                stroke="#f43f5e" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorBlocked)"
                                animationDuration={2000}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

export default OverviewPage;

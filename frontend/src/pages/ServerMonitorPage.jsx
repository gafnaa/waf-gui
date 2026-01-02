import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Activity, 
  HardDrive, 
  Clock, 
  Cpu, 
  RefreshCw, 
  Zap, 
  Terminal,
  Power,
  RotateCcw,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { getSystemStatus, restartNginx, clearWafCache } from '../services/api';
import { Button } from "../components/ui/button";

const ServerMonitorPage = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState({ cpu: [], net: [] });
    const [notification, setNotification] = useState(null);
    const [showRestartModal, setShowRestartModal] = useState(false);
    const [showClearCacheModal, setShowClearCacheModal] = useState(false);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => fetchStatus(true), 2000); // Fast Polling for "Real-time" feel
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const fetchStatus = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const res = await getSystemStatus();
            const data = res.data;
            setStatus(data);

            // Update History for Charts
            const now = new Date().toLocaleTimeString('en-US', {hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit"});
            
            setHistory(prev => {
                const newCpu = [...prev.cpu, { time: now, value: data.cpu_usage }].slice(-20); // Keep last 20 points
                const newNet = [...prev.net, { time: now, in: data.network.in, out: data.network.out }].slice(-20);
                return { cpu: newCpu, net: newNet };
            });

        } catch (err) {
            console.error(err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const handleRestart = () => {
        setShowRestartModal(true);
    };

    const confirmRestart = async () => {
        setShowRestartModal(false);
        setNotification({ type: 'info', message: 'Initiating server restart...' });
        try {
            await restartNginx();
            setNotification({ type: 'success', message: 'Server restarted successfully' });
        } catch (e) {
            setNotification({ type: 'error', message: 'Restart failed: ' + e.message });
        }
    };

    const handleClearCache = () => {
        setShowClearCacheModal(true);
    };

    const confirmClearCache = async () => {
        setShowClearCacheModal(false);
        setNotification({ type: 'info', message: 'Purging WAF cache...' });
        try {
            await clearWafCache();
            setNotification({ type: 'success', message: 'WAF Cache cleared successfully' });
        } catch (e) {
            setNotification({ type: 'error', message: 'Failed to clear cache' });
        }
    };


    if (loading && !status) return <div className="text-center text-slate-500 mt-20">Connecting to server node...</div>;

    return (
        <div className="space-y-6 relative">
             {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 ${
                    notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' :
                    notification.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' :
                    'bg-blue-950/90 border-blue-500/50 text-blue-200'
                }`}>
                    {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
                    {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}

            {/* Restart Confirmation Modal */}
            {showRestartModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 border-l-4 border-l-rose-500">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-rose-500/10 rounded-full shrink-0">
                                <AlertTriangle className="w-6 h-6 text-rose-500" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-slate-100">Restart Server?</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Are you sure you want to restart the Nginx server? This will <strong className="text-rose-400">interrupt traffic</strong> for a few seconds while the service reloads.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-4 pt-2">
                            <button 
                                onClick={() => setShowRestartModal(false)}
                                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmRestart}
                                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/20 transition-all text-sm font-bold flex items-center gap-2"
                            >
                                <Power className="w-4 h-4" />
                                Restart Server
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Cache Confirmation Modal */}
            {showClearCacheModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 border-l-4 border-l-amber-500">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-full shrink-0">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-slate-100">Clear WAF Cache?</h3>
                                <div className="text-sm text-slate-400 leading-relaxed space-y-2">
                                    <p>Are you sure you want to clear the entire WAF cache?</p>
                                    <ul className="list-disc pl-4 space-y-1 text-slate-500">
                                        <li>This will cause a <strong className="text-amber-400">temporary performance drop</strong>.</li>
                                        <li>Initial requests will be slower while the cache rebuilds.</li>
                                        <li>Backend server load may increase significantly.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-4 pt-2">
                            <button 
                                onClick={() => setShowClearCacheModal(false)}
                                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmClearCache}
                                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20 transition-all text-sm font-bold flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Clear Cache
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Server Management</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm text-slate-400 font-mono">Production-Server-01 (192.168.1.10)</span>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <CheckCircleIcon className="w-3 h-3" />
                        System Online
                    </span>
                    <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {/* Notification Bell & Help would go here */}
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* RAM */}
                <MetricCard 
                    title="RAM Usage" 
                    value={`${status.ram_usage.used} / ${status.ram_usage.total} GB`}
                    subValue={status.ram_usage.percent + "%"}
                    icon={Cpu}
                    color="blue"
                    progress={status.ram_usage.percent}
                />
                
                {/* Disk */}
                <MetricCard 
                    title="Disk (/var/log)" 
                    value={`${status.disk_usage.used_percent}% Used`} 
                    subValue="Warning"
                    subColor="amber"
                    icon={HardDrive}
                    color="amber"
                    progress={status.disk_usage.used_percent}
                />

                {/* Load Avg */}
                <MetricCard 
                    title="Load Average" 
                    value={status.load_avg} 
                    subValue="15m Avg"
                    description="Optimal performance range"
                    subColor="purple"
                    icon={Activity}
                    color="purple"
                    progress={Math.min((status.load_avg / 4) * 100, 100)}
                    progressLabel="System Load"
                />

                {/* Uptime */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl relative overflow-hidden group flex flex-col h-full">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Uptime</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{status.uptime}</h3>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>
                    <div className="mt-auto">
                        <p className="text-xs text-slate-500">Since last patch cycle</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CPU Realtime */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 min-h-[300px]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-blue-500" />
                                CPU Usage (Real-time)
                            </h3>
                            <p className="text-sm text-slate-500">4 Cores Active</p>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-bold text-white block">{status.cpu_usage}%</span>
                            <span className="text-xs text-emerald-400 font-medium">-2% vs last hour</span>
                        </div>
                    </div>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history.cpu}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Network Traffic */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 min-h-[300px]">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-cyan-400" />
                                Network Traffic
                            </h3>
                            <p className="text-sm text-slate-500">eth0 Interface</p>
                        </div>
                        <div className="flex gap-4 text-xs font-mono">
                            <div className="text-cyan-400">↓ {status.network.in} Mbps</div>
                            <div className="text-purple-400">↑ {status.network.out} Mbps</div>
                        </div>
                    </div>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history.net}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                />
                                <Line type="monotone" dataKey="in" stroke="#22d3ee" strokeWidth={2} dot={false} strokeDasharray="5 5" isAnimationActive={false} />
                                <Line type="monotone" dataKey="out" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Active Services List */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-slate-200">Active Services</h3>
                        <a href="#" className="text-xs text-blue-400 hover:text-blue-300">View All</a>
                    </div>
                    <div className="p-2">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-800/50">
                                    <th className="px-4 py-3">Service Name</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">PID</th>
                                    <th className="px-4 py-3">CPU</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/30">
                                {status.services.map((svc, i) => (
                                    <tr key={i} className="hover:bg-slate-800/20">
                                        <td className="px-4 py-3 font-medium text-slate-200 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${svc.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                                            {svc.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                                svc.status === 'Active' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-slate-700 text-slate-400 border-slate-600'
                                            }`}>
                                                {svc.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-400">{svc.pid}</td>
                                        <td className="px-4 py-3 font-mono text-slate-300">{svc.cpu}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Restart">
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                            <button className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400" title="Stop">
                                                <Power className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h3>
                    
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/50 transition-colors cursor-pointer group" onClick={handleClearCache}>
                        <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-200 text-sm">Clear Cache</h4>
                            <p className="text-xs text-slate-500">Purge WAF cache</p>
                        </div>
                    </div>



                     <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-rose-500/50 transition-colors cursor-pointer group" onClick={handleRestart}>
                        <div className="p-3 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 transition-colors">
                            <Power className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-200 text-sm">Restart Server</h4>
                            <p className="text-xs text-slate-500">Requires confirmation</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

// Helper Components
const CheckCircleIcon = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

const MetricCard = ({ title, value, subValue, icon: Icon, color, progress, subColor="emerald", progressLabel="Usage", description }) => {
    const colorClasses = {
        blue: "text-blue-500 bg-blue-500",
        amber: "text-amber-500 bg-amber-500",
        purple: "text-purple-500 bg-purple-500",
        emerald: "text-emerald-500 bg-emerald-500"
    };
    
    const textColors = {
        blue: "text-blue-500",
        amber: "text-amber-500",
        purple: "text-purple-500",
        emerald: "text-emerald-500"
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl relative overflow-hidden group flex flex-col h-full">
            <div className="flex-1"> {/* Flex-1 to push progress bar down */}
                <div className="flex justify-between items-start mb-2"> {/* margin-bottom reduced slightly */}
                    <div className="min-w-0 flex-1 mr-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <h3 className="text-xl lg:text-2xl font-bold text-white leading-none whitespace-nowrap">{value}</h3>
                            {subValue && (
                                <span className={`text-[10px] font-bold ${subColor === 'amber' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'} px-1.5 py-0.5 rounded uppercase tracking-wider`}>
                                    {subValue}
                                </span>
                            )}
                        </div>
                         {description && (
                            <p className="text-[12px] text-slate-400 mt-2">{description}</p>
                        )}
                    </div>
                    <div className={`p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors shrink-0`}>
                        <Icon className={`w-5 h-5 ${textColors[color]}`} />
                    </div>
                </div>
            </div>
            
            {/* Progress Bar */}
            {progress !== undefined && (
                <div className="mt-auto">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>{progressLabel}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${colorClasses[color].split(' ')[1]}`} 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServerMonitorPage;

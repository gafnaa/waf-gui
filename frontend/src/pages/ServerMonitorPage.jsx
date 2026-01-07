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
import { getSystemStatus, restartNginx, clearWafCache, manageService } from '../services/api';
import { Button } from "../components/ui/button";
import { useTheme } from "../context/ThemeContext";

const ServerMonitorPage = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState({ cpu: [], net: [] });
    const [notification, setNotification] = useState(null);
    const [showRestartModal, setShowRestartModal] = useState(false);
    const [showClearCacheModal, setShowClearCacheModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const { theme } = useTheme();

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => fetchStatus(true), 2000); // Fast Polling for "Real-time" feel
        return () => clearInterval(interval);
    }, []);

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        if (!isVisible && notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 300); // Wait for exit animation
            return () => clearTimeout(timer);
        }
    }, [isVisible, notification]);

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

    const handleServiceAction = (serviceId, action, serviceName) => {
        setPendingAction({ serviceId, action, serviceName });
        setShowServiceModal(true);
    };

    const confirmServiceAction = async () => {
        if (!pendingAction) return;
        
        setShowServiceModal(false);
        const { serviceId, action, serviceName } = pendingAction;
        
        const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
        setNotification({ type: 'info', message: `${actionLabel}ing ${serviceName}...` });
        
        try {
            await manageService(serviceId, action);
            setNotification({ type: 'success', message: `${serviceName} ${action}ed successfully` });
            fetchStatus(true); // Refresh data
        } catch (e) {
            setNotification({ type: 'error', message: `Action failed: ${e.response?.data?.message || e.message}` });
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


    const handleManualRefresh = async () => {
        setNotification({ type: 'info', message: 'Refreshing data...' });
        await fetchStatus();
        setNotification({ type: 'success', message: 'System data refreshed' });
    };

    if (loading && !status) return <div className="text-center text-slate-500 mt-20">Connecting to server node...</div>;
    if (!status) return <div className="text-center text-rose-500 mt-20">Failed to load system status. Check backend connection.</div>;

    // Chart Colors based on theme
    const chartGridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0'; // slate-800 vs slate-200
    const toolTipBgs = theme === 'dark' ? '#0f172a' : '#ffffff';
    const toolTipBorder = theme === 'dark' ? '#1e293b' : '#e2e8f0';
    const toolTipText = theme === 'dark' ? '#f8fafc' : '#1e293b';

    return (
        <div className="space-y-6 relative">
             {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 transition-all duration-300 ${
                    isVisible 
                        ? 'animate-in fade-in slide-in-from-top-5 opacity-100 translate-y-0' 
                        : 'animate-out fade-out slide-out-to-right-10 opacity-0 translate-x-10'
                } ${
                    notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-900/20' :
                    notification.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-900/20' :
                    'bg-blue-950/90 border-blue-500/50 text-blue-200 shadow-blue-900/20'
                }`}>
                    {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
                    {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                    
                    <div className="flex flex-col">
                         <span className="text-sm font-medium">{notification.message}</span>
                    </div>

                    <button 
                        onClick={() => setIsVisible(false)}
                        className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 opacity-70" />
                    </button>
                </div>
            )}

            {/* Restart Confirmation Modal */}
            {showRestartModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 ring-1 dark:ring-white/5 ring-black/5">
                        
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-rose-100 dark:bg-rose-500/10 rounded-full">
                                <Power className="w-8 h-8 text-rose-600 dark:text-rose-500" />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold dark:text-white text-slate-900">System Restart</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[90%] mx-auto">
                                    Are you sure you want to restart the Nginx server?
                                </p>
                            </div>

                            <div className="w-full bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/10 rounded-lg p-3 text-left">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Downtime Warning</p>
                                        <p className="text-xs text-rose-800/80 dark:text-rose-200/70 leading-relaxed">
                                            Traffic will be interrupted for a few seconds while the service reloads. Active connections may be dropped.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button 
                                onClick={() => setShowRestartModal(false)}
                                className="px-4 py-2.5 rounded-xl border dark:border-slate-700 border-slate-200 dark:text-slate-300 text-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmRestart}
                                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98]"
                            >
                                Restart Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showClearCacheModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 ring-1 dark:ring-white/5 ring-black/5">
                        
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-amber-100 dark:bg-amber-500/10 rounded-full">
                                <RefreshCw className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold dark:text-white text-slate-900">Clear WAF Cache?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[90%] mx-auto">
                                    You are about to purge the entire WAF cache. This action cannot be undone.
                                </p>
                            </div>

                            <div className="w-full bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 rounded-lg p-3 text-left">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Performance Impact</p>
                                        <p className="text-xs text-amber-800/80 dark:text-amber-200/70 leading-relaxed">
                                            Clearing the cache will cause a temporary spike in backend server load as the cache rebuilds.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button 
                                onClick={() => setShowClearCacheModal(false)}
                                className="px-4 py-2.5 rounded-xl border dark:border-slate-700 border-slate-200 dark:text-slate-300 text-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmClearCache}
                                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                            >
                                Clear Cache
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showServiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 ring-1 dark:ring-white/5 ring-black/5">
                        
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-4 rounded-full ${
                                pendingAction?.action === 'stop' ? 'bg-rose-100 dark:bg-rose-500/10' :
                                pendingAction?.action === 'start' ? 'bg-emerald-100 dark:bg-emerald-500/10' :
                                'bg-amber-100 dark:bg-amber-500/10'
                            }`}>
                                {pendingAction?.action === 'stop' && <Power className="w-8 h-8 text-rose-600 dark:text-rose-500" />}
                                {pendingAction?.action === 'start' && <Zap className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />}
                                {pendingAction?.action === 'restart' && <RotateCcw className="w-8 h-8 text-amber-600 dark:text-amber-500" />}
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
                                    {pendingAction?.action} Service?
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[90%] mx-auto">
                                    Are you sure you want to <strong>{pendingAction?.action}</strong> the <strong>{pendingAction?.serviceName}</strong> service?
                                </p>
                            </div>

                            {pendingAction?.serviceId === 'ssh' && pendingAction?.action === 'stop' && (
                                <div className="w-full bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/10 rounded-lg p-3 text-left">
                                    <div className="flex gap-3">
                                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Critical Warning</p>
                                            <p className="text-xs text-rose-800/80 dark:text-rose-200/70 leading-relaxed">
                                                Stopping SSH will immediately disconnect your remote session. You may be locked out permanently if you don't have console access.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button 
                                onClick={() => setShowServiceModal(false)}
                                className="px-4 py-2.5 rounded-xl border dark:border-slate-700 border-slate-200 dark:text-slate-300 text-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmServiceAction}
                                className={`px-4 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all active:scale-[0.98] ${
                                    pendingAction?.action === 'stop' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20' :
                                    pendingAction?.action === 'start' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' :
                                    'bg-amber-500 hover:bg-amber-600 shadow-amber-900/20'
                                }`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">Server Management</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm dark:text-slate-400 text-slate-600 font-mono">Production-Server-01 (192.168.1.10)</span>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <CheckCircleIcon className="w-3 h-3" />
                        System Online
                    </span>
                    <button 
                        onClick={handleManualRefresh}
                        className="p-2 rounded-lg dark:bg-slate-800 bg-white dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white border dark:border-slate-700 border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
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
                <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 p-5 rounded-xl relative overflow-hidden group flex flex-col h-full shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Uptime</p>
                            <h3 className="text-2xl font-bold dark:text-white text-slate-900 mt-1">{status.uptime}</h3>
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
                <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-xl p-6 min-h-[300px] shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold dark:text-slate-200 text-slate-900 flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-blue-500" />
                                CPU Usage (Real-time)
                            </h3>
                            <p className="text-sm dark:text-slate-500 text-slate-600">4 Cores Active</p>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-bold dark:text-white text-slate-900 block">{status.cpu_usage}%</span>
                            <span className="text-xs text-emerald-500 font-medium">-2% vs last hour</span>
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
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: toolTipBgs, borderColor: toolTipBorder, color: toolTipText }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Network Traffic */}
                <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-xl p-6 min-h-[300px] shadow-sm">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold dark:text-slate-200 text-slate-900 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-cyan-400" />
                                Network Traffic
                            </h3>
                            <p className="text-sm dark:text-slate-500 text-slate-600">eth0 Interface</p>
                        </div>
                        <div className="flex gap-4 text-xs font-mono">
                            <div className="text-cyan-500">↓ {status.network.in} Mbps</div>
                            <div className="text-purple-500">↑ {status.network.out} Mbps</div>
                        </div>
                    </div>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history.net}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: toolTipBgs, borderColor: toolTipBorder, color: toolTipText }}
                                />
                                <Line type="monotone" dataKey="in" stroke="#06b6d4" strokeWidth={2} dot={false} strokeDasharray="5 5" isAnimationActive={false} />
                                <Line type="monotone" dataKey="out" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Active Services List */}
                <div className="lg:col-span-2 dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-xl flex flex-col shadow-sm">
                    <div className="p-4 border-b dark:border-slate-800 border-slate-200 flex items-center">
                        <h3 className="font-bold dark:text-slate-200 text-slate-900">Active Services</h3>
                    </div>
                    <div className="p-2">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs font-bold text-slate-500 uppercase border-b dark:border-slate-800/50 border-slate-200">
                                    <th className="px-4 py-3">Service Name</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">PID</th>
                                    <th className="px-4 py-3">CPU</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800/30 divide-slate-200">
                                {status.services.map((svc, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                                        <td className="px-4 py-3 font-medium dark:text-slate-200 text-slate-900 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${svc.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                                            {svc.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                                svc.status === 'Active' 
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                : 'dark:bg-slate-700 bg-slate-200 dark:text-slate-400 text-slate-600 border dark:border-slate-600 border-slate-300'
                                            }`}>
                                                {svc.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono dark:text-slate-400 text-slate-600">{svc.pid}</td>
                                        <td className="px-4 py-3 font-mono dark:text-slate-300 text-slate-700">{svc.cpu}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleServiceAction(svc.id, 'restart', svc.name)}
                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" 
                                                title="Restart"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                            
                                            {svc.status === 'Active' ? (
                                                <button 
                                                    onClick={() => handleServiceAction(svc.id, 'stop', svc.name)}
                                                    className="p-1 hover:bg-rose-500/20 rounded text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors" 
                                                    title="Stop"
                                                >
                                                    <Power className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleServiceAction(svc.id, 'start', svc.name)}
                                                    className="p-1 hover:bg-emerald-500/20 rounded text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors" 
                                                    title="Start"
                                                >
                                                    <Zap className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold dark:text-slate-400 text-slate-500 uppercase tracking-wider">Quick Actions</h3>
                    
                    <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/50 transition-colors cursor-pointer group shadow-sm" onClick={handleClearCache}>
                        <div className="p-3 dark:bg-blue-500/10 bg-blue-50 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold dark:text-slate-200 text-slate-900 text-sm">Clear Cache</h4>
                            <p className="text-xs text-slate-500">Purge WAF cache</p>
                        </div>
                    </div>

                     <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-rose-500/50 transition-colors cursor-pointer group shadow-sm" onClick={handleRestart}>
                        <div className="p-3 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 transition-colors">
                            <Power className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h4 className="font-bold dark:text-slate-200 text-slate-900 text-sm">Restart Server</h4>
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
        <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 p-5 rounded-xl relative overflow-hidden group flex flex-col h-full shadow-sm">
            <div className="flex-1"> {/* Flex-1 to push progress bar down */}
                <div className="flex justify-between items-start mb-2"> {/* margin-bottom reduced slightly */}
                    <div className="min-w-0 flex-1 mr-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <h3 className="text-xl lg:text-2xl font-bold dark:text-white text-slate-900 leading-none whitespace-nowrap">{value}</h3>
                            {subValue && (
                                <span className={`text-[10px] font-bold ${subColor === 'amber' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'} px-1.5 py-0.5 rounded uppercase tracking-wider`}>
                                    {subValue}
                                </span>
                            )}
                        </div>
                         {description && (
                            <p className="text-[12px] text-slate-400 mt-2">{description}</p>
                        )}
                    </div>
                    <div className={`p-2 rounded-lg dark:bg-slate-800 bg-slate-100 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors shrink-0`}>
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
                    <div className="w-full h-1.5 dark:bg-slate-800 bg-slate-200 rounded-full overflow-hidden">
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

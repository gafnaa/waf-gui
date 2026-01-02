import React, { useState, useEffect } from 'react';
import { 
    Download, 
    Activity, 
    Calendar, 
    Filter, 
    RefreshCw, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    Command
} from 'lucide-react';
import { getLogs } from '../services/api';

const LogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEvents, setTotalEvents] = useState(0);
    const [search, setSearch] = useState("");
    
    // Filters
    const [timeRange, setTimeRange] = useState("Last 24h");
    const [activeFilter, setActiveFilter] = useState("All"); // Attack Type
    const [statusFilter, setStatusFilter] = useState("All");

    useEffect(() => {
        fetchLogs();
    }, [page, search, activeFilter, statusFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await getLogs({ 
                page, 
                limit: 10, 
                search: search || undefined,
                status: statusFilter,
                attack_type: activeFilter
            });
            const data = res.data;
            setLogs(data.data);
            setTotalPages(data.total_pages);
            setTotalEvents(data.total);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1); // Reset to first page
    };

    const getStatusColor = (code) => {
        if (code >= 200 && code < 300) return "text-emerald-400";
        if (code >= 300 && code < 400) return "text-blue-400";
        if (code >= 400 && code < 500) return "text-rose-400";
        if (code >= 500) return "text-amber-400";
        return "text-slate-400";
    };

    const getBadgeStyle = (type) => {
        switch (type) {
            case 'SQL Injection': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'XSS': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'RCE': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'Scanner': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Path Traversal': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'Safe': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Live Attack Log</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm text-slate-400 font-medium tracking-wide">Real-time threat monitoring</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all">
                        <Activity className="w-4 h-4" />
                        Live Tail
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search IP, Path, or Payload..." 
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-10 pr-12 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        value={search}
                        onChange={handleSearch}
                    />
                    <div className="absolute right-3 top-2.5 flex items-center gap-1">
                        <Command className="w-3 h-3 text-slate-600" />
                        <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">K</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {/* Time Filter */}
                    <div className="flex items-center gap-2 bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select 
                            className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option>Last 24h</option>
                            <option>Last Hour</option>
                            <option>7 Days</option>
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2 bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select 
                            className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                        >
                            <option value="All">Type: All</option>
                            <option value="Attacks Only">Attacks Only</option>
                            <option value="SQL Injection">SQL Injection</option>
                            <option value="XSS">XSS</option>
                            <option value="Scanner">Scanner</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2 bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <select 
                            className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">Status: All</option>
                            <option value="403">Blocked (403)</option>
                            <option value="200">Allowed (200)</option>
                            <option value="500">Error (500)</option>
                        </select>
                    </div>

                    <button 
                        onClick={() => fetchLogs()}
                        className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Source IP</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Target Path</th>
                                <th className="px-6 py-4">Attack Type</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/30">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        No logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, i) => (
                                    <tr key={log.id || i} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                                            {log.timestamp}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-200 font-medium">{log.source_ip}</span>
                                                <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1 rounded">{log.country}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`font-bold text-xs ${
                                                log.method === 'GET' ? 'text-blue-400' :
                                                log.method === 'POST' ? 'text-purple-400' :
                                                log.method === 'DELETE' ? 'text-rose-400' :
                                                'text-slate-400'
                                            }`}>
                                                {log.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px] truncate text-slate-300 font-mono text-xs" title={log.path}>
                                            {log.path}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${getBadgeStyle(log.attack_type)}`}>
                                                {log.attack_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`font-bold font-mono ${getStatusColor(log.status_code)}`}>
                                                {log.status_code}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                <div className="bg-slate-950/30 px-6 py-4 border-t border-slate-800 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        Showing <span className="font-bold text-slate-300">{logs.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to <span className="font-bold text-slate-300">{Math.min(page * 10, totalEvents)}</span> of <span className="font-bold text-slate-300">{totalEvents.toLocaleString()}</span> events
                    </div>
                    
                    <div className="flex gap-2">
                         <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        {/* Simple Pagination Buttons */}
                        {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                            let p = idx + 1;
                            if (totalPages > 5 && page > 3) {
                                p = page - 2 + idx;
                            }
                            if (p > totalPages) return null;
                            
                            return (
                                <button 
                                    key={p} 
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                                        page === p 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-500' 
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button 
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogsPage;

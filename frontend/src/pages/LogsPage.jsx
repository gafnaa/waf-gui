import React, { useState, useEffect, useRef } from 'react';
import { 
    Download, 
    Activity, 
    Calendar, 
    Filter, 
    RefreshCw, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    ChevronDown,
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

    // Live Tail
    const [isLiveTail, setIsLiveTail] = useState(false);

    // Live Tail effect
    useEffect(() => {
        let interval;
        if (isLiveTail) {
            // Initial fetch
            fetchLogs(true); 
            // Poll
            interval = setInterval(() => {
                fetchLogs(true);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isLiveTail, page, search, activeFilter, statusFilter, timeRange]);

    useEffect(() => {
        if (!isLiveTail) fetchLogs();
    }, [page, search, activeFilter, statusFilter, timeRange]);

    const fetchLogs = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await getLogs({ 
                page, 
                limit: 10, 
                search: search || undefined,
                status: statusFilter,
                attack_type: activeFilter,
                time_range: timeRange
            });
            const data = res.data;
            setLogs(data.data);
            setTotalPages(data.total_pages);
            setTotalEvents(data.total);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            if (!silent) setLoading(false);
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

    const handleExport = async () => {
        // Show temporary feedback if needed? We will just rely on browser download behavior for now, 
        // or we could add a toast.
        try {
            const res = await getLogs({
                page: 1,
                limit: 5000, // Export up to 5000 recent logs matching filters
                search: search || undefined,
                status: statusFilter,
                attack_type: activeFilter,
                time_range: timeRange
            });
            
            const dataToExport = res.data.data;
            if (!dataToExport || dataToExport.length === 0) {
                alert("No logs found to export.");
                return;
            }

            // CSV Header
            const headers = ["ID", "Timestamp", "Source IP", "Country", "Method", "Path", "Status", "Type"];
            const csvRows = [headers.join(",")];
            
            // CSV Body
            dataToExport.forEach(row => {
                const values = [
                    row.id,
                    `"${row.timestamp}"`,
                    `"${row.source_ip}"`,
                    `"${row.country}"`,
                    `"${row.method}"`,
                    `"${row.path.replace(/"/g, '""')}"`, // Handle quotes in path
                    row.status_code,
                    `"${row.attack_type}"`
                ];
                csvRows.push(values.join(","));
            });
            
            const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
            const encodedUri = encodeURI(csvContent);
            
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `waf_logs_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (err) {
            console.error("Export error:", err);
            alert("Failed to export logs.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">Live Attack Log</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm text-slate-400 font-medium tracking-wide">Real-time threat monitoring</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 dark:bg-slate-800 bg-white hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-700 border-slate-200 dark:text-slate-300 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors active:scale-95 shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button 
                        onClick={() => setIsLiveTail(!isLiveTail)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${
                            isLiveTail 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/40 ring-2 ring-emerald-500/20' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/40'
                        }`}
                    >
                        <Activity className={`w-4 h-4 ${isLiveTail ? 'animate-pulse' : ''}`} />
                        {isLiveTail ? 'Live Tail: ON' : 'Live Tail'}
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search IP, or Path..." 
                        className="w-full dark:bg-slate-950/50 bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg pl-10 pr-12 py-2 text-sm dark:text-slate-200 text-slate-900 dark:placeholder:text-slate-500 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        value={search}
                        onChange={handleSearch}
                    />
                    <div className="absolute right-3 top-2.5 flex items-center gap-1">
                        <Command className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] dark:bg-slate-800 bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded border dark:border-slate-700 border-slate-300">K</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {/* Time Filter */}
                    <CustomSelect 
                        icon={Calendar}
                        value={timeRange}
                        onChange={setTimeRange}
                        minWidth="min-w-[100px]"
                        options={[
                            { value: "Last Hour", label: "Last Hour" },
                            { value: "Last 24h", label: "Last 24h" },
                            { value: "Last 3d", label: "Last 3d" },
                            { value: "Last 7d", label: "Last 7d" }
                        ]}
                    />

                    {/* Type Filter */}
                    <CustomSelect 
                        icon={Filter}
                        value={activeFilter}
                        onChange={setActiveFilter}
                        minWidth="min-w-[110px]"
                        options={[
                            { value: "All", label: "Type: All" },
                            { value: "Attacks Only", label: "Attacks Only" },
                            { value: "Safe Traffic", label: "Safe Traffic" },
                            { value: "SQL Injection", label: "SQL Injection" },
                            { value: "XSS", label: "XSS" },
                            { value: "Scanner", label: "Scanner" },
                            { value: "Brute Force", label: "Brute Force" },
                            { value: "RCE", label: "RCE" },
                            { value: "LFI", label: "LFI" }
                        ]}
                    />

                    {/* Status Filter */}
                    <CustomSelect 
                        icon={Activity}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        minWidth="min-w-[110px]"
                        options={[
                            { value: "All", label: "Status: All" },
                            { value: "200", label: "OK (200)" },
                            { value: "403", label: "Forbidden (403)" },
                            { value: "401", label: "Unauth (401)" },
                            { value: "404", label: "Not Found (404)" },
                            { value: "500", label: "Server Error (500)" }
                        ]}
                    />

                    <button 
                        onClick={() => fetchLogs()}
                        className="p-2 dark:bg-slate-800 bg-white hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-700 border-slate-200 rounded-lg dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="dark:bg-slate-950/50 bg-slate-50 border-b dark:border-slate-800 border-slate-200 text-xs font-bold dark:text-slate-500 text-slate-600 uppercase tracking-wider">
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Source IP</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Target Path</th>
                                <th className="px-6 py-4">Attack Type</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800/30 divide-slate-200">
                            {loading ? (
                                [...Array(10)].map((_, idx) => (
                                    <tr key={idx} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-4 dark:bg-slate-800/50 bg-slate-200 rounded w-24"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 dark:bg-slate-800/50 bg-slate-200 rounded w-32"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 dark:bg-slate-800/50 bg-slate-200 rounded w-16"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 dark:bg-slate-800/50 bg-slate-200 rounded w-48"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-6 dark:bg-slate-800/50 bg-slate-200 rounded-full w-24"></div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="h-4 dark:bg-slate-800/50 bg-slate-200 rounded w-8 ml-auto"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Filter className="w-8 h-8 opacity-20" />
                                            <span>No logs found matching your criteria.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, i) => (
                                    <tr key={log.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group animate-in fade-in duration-500">
                                        <td className="px-6 py-4 whitespace-nowrap dark:text-slate-400 text-slate-500 font-mono text-xs">
                                            {log.timestamp}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="dark:text-slate-200 text-slate-700 font-medium">{log.source_ip}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`font-bold text-xs ${
                                                log.method === 'GET' ? 'text-blue-500' :
                                                log.method === 'POST' ? 'text-purple-500' :
                                                log.method === 'DELETE' ? 'text-rose-500' :
                                                'text-slate-500'
                                            }`}>
                                                {log.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px] truncate dark:text-slate-300 text-slate-600 font-mono text-xs" title={log.path}>
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
                <div className="dark:bg-slate-950/30 bg-slate-50 px-6 py-4 border-t dark:border-slate-800 border-slate-200 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        Showing <span className="font-bold dark:text-slate-300 text-slate-700">{logs.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to <span className="font-bold dark:text-slate-300 text-slate-700">{Math.min(page * 10, totalEvents)}</span> of <span className="font-bold dark:text-slate-300 text-slate-700">{totalEvents.toLocaleString()}</span> events
                    </div>
                    
                    <div className="flex gap-2">
                         <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="p-2 dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
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
                                        : 'dark:bg-slate-800 bg-white dark:text-slate-400 text-slate-600 border dark:border-slate-700 border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white hover:text-slate-900 shadow-sm'
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button 
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="p-2 dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Custom Select Component
const CustomSelect = ({ value, onChange, options, icon: Icon, minWidth = "min-w-[120px]" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 dark:bg-slate-950/50 bg-white border ${isOpen ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'dark:border-slate-700 border-slate-200'} hover:border-slate-400 dark:hover:border-slate-600 rounded-lg pl-3 pr-2 py-2 transition-all group focus:outline-none h-[38px] shadow-sm`}
            >
                {Icon && <Icon className="w-4 h-4 text-slate-400" />}
                <span className={`text-sm dark:text-slate-300 text-slate-700 font-sans ${minWidth} text-left truncate mr-2`}>{selectedLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-[calc(100%+20px)] min-w-max dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-200 rounded-lg shadow-xl shadow-black/20 dark:shadow-black/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer rounded-md font-sans transition-colors flex items-center justify-between ${
                                value === opt.value 
                                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-medium' 
                                : 'dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white hover:text-slate-900'
                            }`}
                        >
                            {opt.label}
                            {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-2" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LogsPage;

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Search, 
  Download, 
  Filter, 
  MoreHorizontal,
  Trash2, 
  AlertOctagon, 
  CheckCircle2,
  Clock,
  Globe
} from 'lucide-react';
import { addWafRule, getActiveIps, deleteIpRule } from '../services/api';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const AccessControlPage = () => {
    const [activeIps, setActiveIps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        ip: '',
        action: 'deny',
        duration: 'Permanent',
        note: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const res = await getActiveIps();
            setActiveIps(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addWafRule(formData.ip, formData.action, formData.note, formData.duration);
            setFormData({ ip: '', action: 'deny', duration: 'Permanent', note: '' });
            fetchData(true); // Refresh table to see status change
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBlockIp = async (ip) => {
        try {
            await addWafRule(ip, 'deny', 'Quick Block from Table', 'Permanent');
            fetchData(true);
        } catch(e) { console.error(e) }
    };

    const handleUnblockIp = async (ip) => {
        try {
            await deleteIpRule(ip);
            fetchData(true);
        } catch(e) { console.error(e) }
    };

    const filteredIps = activeIps.filter(item => 
        item.ip.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Access Control (IP Management)</h2>
                    <p className="text-sm text-slate-500">Manage network access policies, blocklists, and whitelists.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Add Rule Form */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Plus className="w-4 h-4 text-blue-500" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Manual Rule Entry</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">IP Address / CIDR</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <Input 
                                        name="ip"
                                        value={formData.ip}
                                        onChange={handleInputChange}
                                        className="pl-9 bg-[#0b1121] border-slate-700 text-slate-200 focus-visible:ring-blue-600"
                                        placeholder="e.g., 192.168.1.1"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-slate-600">Supports IPv4/IPv6 and CIDR notation.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Action</label>
                                <div className="relative">
                                    <select 
                                        name="action"
                                        value={formData.action}
                                        onChange={handleInputChange}
                                        className="w-full h-10 bg-[#0b1121] border border-slate-700 rounded-md px-3 text-sm text-slate-200 font-sans focus:outline-none focus:border-blue-500 appearance-none"
                                    >
                                        <option value="deny">Blacklist (Block)</option>
                                        <option value="allow">Whitelist (Allow)</option>
                                    </select>
                                    <AlertOctagon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Duration</label>
                                <div className="relative">
                                    <select 
                                        name="duration"
                                        value={formData.duration}
                                        onChange={handleInputChange}
                                        className="w-full h-10 bg-[#0b1121] border border-slate-700 rounded-md px-3 text-sm text-slate-200 font-sans focus:outline-none focus:border-blue-500 appearance-none"
                                    >
                                        <option value="Permanent">Permanent</option>
                                        <option value="24h">Temporary (24 Hours)</option>
                                        <option value="7d">Temporary (7 Days)</option>
                                    </select>
                                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Reason / Note</label>
                                <textarea 
                                    name="note"
                                    value={formData.note}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#0b1121] border border-slate-700 rounded-md p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 min-h-[100px]"
                                    placeholder="Optional context for audit logs..."
                                />
                            </div>

                            <Button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                            >
                                {submitting ? 'Enforcing...' : 'Enforce Rule'}
                            </Button>
                        </form>
                    </div>


                </div>

                {/* Right Column: List */}
                <div className="lg:col-span-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col h-full min-h-[600px]">
                        
                        {/* Toolbar */}
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-emerald-500/10 rounded">
                                       <Globe className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-200">LIVE TRAFFIC (Last 30m)</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-500 border border-slate-700">
                                    {activeIps.length} Active IPs
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder="Search IP..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-8 bg-[#0b1121] border border-slate-700 rounded-lg pl-8 pr-3 text-xs text-slate-300 focus:outline-none focus:border-slate-500 w-48 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/30 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                        <th className="px-6 py-3 border-b border-slate-800/50 w-12 text-center">ST</th>
                                        <th className="px-6 py-3 border-b border-slate-800/50">IP Address</th>
                                        <th className="px-6 py-3 border-b border-slate-800/50 text-right">Requests</th>
                                        <th className="px-6 py-3 border-b border-slate-800/50 text-right">Attacks</th>
                                        <th className="px-6 py-3 border-b border-slate-800/50 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/30">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                                                Scanning traffic logs...
                                            </td>
                                        </tr>
                                    ) : filteredIps.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                                                No active traffic found in the last 30 minutes.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredIps.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`w-2 h-2 rounded-full mx-auto ${item.rule_status === 'Blocked' ? 'bg-rose-500' : (item.attack_count > 0 ? 'bg-amber-500' : 'bg-emerald-500')}`} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-sm text-slate-200 font-medium">{item.ip}</span>
                                                        <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">{item.country}</span>
                                                        {item.rule_status === 'Blocked' && 
                                                            <span className="text-[10px] bg-rose-500/10 text-rose-500 px-1 rounded border border-rose-500/20">BLOCKED</span>
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm text-slate-300 font-mono">{item.request_count}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {item.attack_count > 0 ? (
                                                        <span className="text-sm text-rose-400 font-bold font-mono">{item.attack_count}</span>
                                                    ) : (
                                                        <span className="text-sm text-slate-600 font-mono">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {item.rule_status === 'Blocked' ? (
                                                        <button 
                                                            onClick={() => handleUnblockIp(item.ip)}
                                                            className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                                                        >
                                                            Unblock
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleBlockIp(item.ip)}
                                                            className="text-xs px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                                                        >
                                                            Block IP
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Footer / Pagination */}
                        <div className="p-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
                             <span>Showing <span className="text-slate-300 font-medium">1-{filteredIps.length}</span> of {activeIps.length}</span>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccessControlPage;

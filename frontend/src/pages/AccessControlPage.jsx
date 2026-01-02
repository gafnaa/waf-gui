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
import { addWafRule, getIpRules, deleteIpRule } from '../services/api';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const AccessControlPage = () => {
    const [rules, setRules] = useState([]);
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
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await getIpRules();
            setRules(res.data);
        } catch (err) {
            console.error("Failed to fetch IP rules", err);
        } finally {
            setLoading(false);
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
            fetchRules();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (ip) => {
        if (!confirm(`Are you sure you want to remove the rule for ${ip}?`)) return;
        try {
            await deleteIpRule(ip);
            fetchRules();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredRules = rules.filter(r => 
        r.ip.includes(searchTerm) || 
        r.note.toLowerCase().includes(searchTerm.toLowerCase())
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
                            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Add Rule</h3>
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
                                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-200">ACTIVE LIST</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-500 border border-slate-700">
                                    {rules.length} Entries
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder="Search IP, Note..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-8 bg-[#0b1121] border border-slate-700 rounded-lg pl-8 pr-3 text-xs text-slate-300 focus:outline-none focus:border-slate-500 w-48 transition-all"
                                    />
                                </div>
                                <button className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 rounded-lg transition-colors">
                                    <Filter className="w-3.5 h-3.5" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 rounded-lg transition-colors">
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/30 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                        <th className="px-6 py-3 border-b border-slate-800/50 w-12 text-center">ST</th>
                                        <th className="px-6 py-3 border-b border-slate-800/50">IP Address</th>
                                        <th className="px-6 py-3 border-b border-slate-800/50">Details</th>
                                        <th className="px-6 py-3 border-b border-slate-800/50">Action</th>
                                        <th className="px-6 py-3 border-b border-slate-800/50 text-right">Controls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/30">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                                                Loading rules...
                                            </td>
                                        </tr>
                                    ) : filteredRules.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                                                No rules found. Add one on the left.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRules.map((rule, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`w-2 h-2 rounded-full mx-auto ${rule.status === 'Active' ? (rule.action === 'deny' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]') : 'bg-slate-600'}`} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-sm text-slate-200 font-medium">{rule.ip}</span>
                                                        <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">{rule.region}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-slate-300">{rule.note}</span>
                                                        <span className="text-[10px] text-slate-500">{rule.duration} • Added just now</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
                                                        rule.action === 'deny' 
                                                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                        {rule.action === 'deny' ? 'Block' : 'Allow'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleDelete(rule.ip)}
                                                            className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 rounded-md transition-colors"
                                                            title="Remove Rule"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button className="p-1.5 hover:bg-slate-800 text-slate-500 rounded-md transition-colors">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Footer / Pagination */}
                        <div className="p-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
                             <span>Showing <span className="text-slate-300 font-medium">1-{filteredRules.length}</span> of {rules.length}</span>
                             <div className="flex gap-2">
                                <button className="px-3 py-1 bg-slate-800 border border-slate-700 rounded hover:text-slate-300 transition-colors disabled:opacity-50" disabled>Previous</button>
                                <button className="px-3 py-1 bg-slate-800 border border-slate-700 rounded hover:text-slate-300 transition-colors disabled:opacity-50" disabled>Next</button>
                             </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccessControlPage;

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Database, 
  Code, 
  Terminal, 
  Bot, 
  Lock, 
  Save, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { getRules, toggleRule, getCustomRules, saveCustomRules } from "../services/api";

const RulesPage = () => {
    const [activeTab, setActiveTab] = useState('core'); // 'core' or 'custom'
    const [rules, setRules] = useState([]);
    const [customRules, setCustomRules] = useState('');
    const [loading, setLoading] = useState(true);
    const [statusMsg, setStatusMsg] = useState(null);
    
    // Refs
    const lineNumbersRef = useRef(null);

    // Initial Fetch
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // Fetch Core Rules
                try {
                    const rulesRes = await getRules();
                    setRules(rulesRes.data);
                } catch (e) {
                    console.error("Failed to load core rules:", e);
                }

                // Fetch Custom Rules
                try {
                    const customRes = await getCustomRules();
                    setCustomRules(customRes.data.content);
                } catch (e) {
                    console.error("Failed to load custom rules:", e);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const handleToggle = async (id, currentStatus) => {
        // Optimistic update
        const originalRules = [...rules];
        setRules(rules.map(r => r.id === id ? { ...r, enabled: !currentStatus } : r));

        try {
            await toggleRule(id, !currentStatus);
            // Success feedback could go here
        } catch (err) {
            // Revert on error
            setRules(originalRules);
            console.error("Failed to toggle rule", err);
        }
    };

    const handleSaveCustom = async () => {
        setLoading(true);
        setStatusMsg(null);
        try {
            await saveCustomRules(customRules);
            setStatusMsg({ type: 'success', text: 'Rule updated successfully.' });
            setTimeout(() => setStatusMsg(null), 3000);
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Failed to update rule.' });
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (category) => {
        switch(category) {
            case 'Injection': return Database; // SQL/XSS often related to data/code
            case 'System': return Terminal;
            case 'Bot': return Bot;
            case 'Auth': return Lock;
            default: return Shield;
        }
    };

    if (loading && rules.length === 0) {
        return <div className="text-slate-400 p-10 text-center">Loading Configuration...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                     <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">WAF Rules Engine</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">System Active</span>
                     </div>
                     <p className="text-sm text-slate-500">Server: <span className="dark:bg-slate-800 bg-slate-200 px-1 rounded dark:text-slate-300 text-slate-700">production-nginx-01</span> | Managing OWASP & Custom ModSecurity rulesets</p>
                </div>
                
                {statusMsg && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {statusMsg.text}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b dark:border-slate-800 border-slate-200">
                <div className="flex gap-6">
                    <button 
                        onClick={() => setActiveTab('core')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'core' ? 'border-blue-500 dark:text-blue-400 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Shield className="w-4 h-4 inline mr-2" />
                        Core Protections
                    </button>
                    <button 
                        onClick={() => setActiveTab('custom')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'custom' ? 'border-blue-500 dark:text-blue-400 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Code className="w-4 h-4 inline mr-2" />
                        Custom Rules (Advanced)
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'core' && (
                    <div className="space-y-4">
                        {/* Summary Card */}
                        <div className="dark:bg-blue-500/5 bg-blue-50 border dark:border-blue-500/10 border-blue-200 rounded-lg p-4 flex items-start gap-4">
                             <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                                <Shield className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className="text-sm font-bold dark:text-slate-200 text-slate-900">OWASP Core Rule Set (CRS)</h4>
                                <p className="text-xs dark:text-slate-400 text-slate-600 mt-1">These rules provide generic protection against common web application vulnerabilities. Changes apply immediately.</p>
                             </div>
                        </div>

                        {/* Rules List */}
                        {rules.map((rule) => {
                            const RuleIcon = getIcon(rule.category);
                            return (
                                <div key={rule.id} className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-lg p-5 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all group shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${rule.enabled ? 'dark:bg-slate-800 bg-slate-100 text-blue-500' : 'dark:bg-slate-800/50 bg-slate-100 text-slate-600'}`}>
                                            <RuleIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-base font-bold ${rule.enabled ? 'dark:text-slate-200 text-slate-900' : 'text-slate-500'}`}>{rule.name}</h4>
                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${rule.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'dark:bg-slate-800 bg-slate-200 text-slate-500'}`}>
                                                    {rule.enabled ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-0.5">{rule.desc}</p>
                                        </div>
                                    </div>
                                    
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={rule.enabled}
                                            onChange={() => handleToggle(rule.id, rule.enabled)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 dark:peer-focus:ring-blue-800 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'custom' && (
                    <div className="space-y-4">
                        <div className="dark:bg-amber-500/5 bg-amber-50 border dark:border-amber-500/10 border-amber-200 rounded-lg p-4 flex items-start gap-4">
                             <div className="p-2 bg-amber-500/20 rounded-full text-amber-500">
                                <AlertTriangle className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-amber-500">Advanced Configuration Area</h4>
                                <p className="text-xs text-amber-500/80 mt-1">Incorrect ModSecurity syntax can cause the Nginx process to crash. Please validate your rules before applying.</p>
                             </div>
                        </div>

                        <div className="dark:bg-[#0f172a] bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-2xl shadow-black/20 dark:shadow-black/50">
                            {/* Editor Header */}
                            <div className="flex items-center justify-between px-4 py-2.5 dark:bg-[#0f172a] bg-slate-200 border-b dark:border-slate-800 border-slate-300 select-none">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse"></div>
                                    <span className="text-sm font-mono font-medium dark:text-slate-200 text-slate-800 tracking-tight">custom_rules.conf</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                                    <span>Fira Code</span>
                                    <span>•</span>
                                    <span>UTF-8</span>
                                </div>
                            </div>
                            
                            {/* Editor Body */}
                            <div className="relative flex h-[500px] group">
                                {/* Line Numbers */}
                                <div 
                                    ref={lineNumbersRef}
                                    className="hidden sm:block w-12 py-4 text-right pr-4 text-slate-500 select-none dark:bg-[#1e293b] bg-slate-100 border-r dark:border-[#334155] border-slate-300 font-mono text-[13px] leading-6 overflow-hidden"
                                >
                                    {customRules.split('\n').map((_, i) => (
                                        <div key={i} className="text-slate-500">{i + 1}</div>
                                    ))}
                                </div>

                                {/* Code Area */}
                                <textarea
                                    value={customRules}
                                    onChange={(e) => setCustomRules(e.target.value)}
                                    onScroll={(e) => {
                                        if (lineNumbersRef.current) {
                                            lineNumbersRef.current.scrollTop = e.target.scrollTop;
                                        }
                                    }}
                                    className="flex-1 w-full dark:bg-[#020617] bg-white dark:text-slate-300 text-slate-900 font-mono text-[13px] leading-6 p-4 focus:outline-none resize-none selection:bg-blue-500/30 whitespace-pre"
                                    spellCheck="false"
                                    placeholder="# Add your custom ModSecurity rules here..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setLoading(true);
                                    getCustomRules().then(res => {
                                        setCustomRules(res.data.content);
                                        setLoading(false);
                                    });
                                }}
                                className="dark:bg-slate-800 bg-white border-slate-200 dark:border-slate-600 dark:text-slate-200 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Discard Changes
                            </Button>
                            <Button onClick={handleSaveCustom} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                                <Save className="w-4 h-4 mr-2" />
                                Save Configuration
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RulesPage;
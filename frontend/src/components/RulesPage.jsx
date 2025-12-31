import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

const RulesPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch rules saat load
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
        // Ganti URL sesuai backend anda
        const res = await axios.get('http://localhost:8000/api/waf/rules');
        setRules(res.data);
    } catch (err) {
        console.error("Error fetching rules", err);
    }
  };

  const handleToggle = async (ruleId, currentStatus) => {
    setLoading(true);
    try {
        await axios.post('http://localhost:8000/api/waf/rules/toggle', {
            rule_id: ruleId,
            enable: !currentStatus
        });
        await fetchRules(); // Refresh list
    } catch (err) {
        alert("Failed to toggle rule");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-2">Rule Tuning Engine</h2>
            <p className="text-gray-400">
                Disable specific protection rules if they are causing false positives (bugs) on your application.
            </p>
        </div>

        <div className="grid gap-4">
            {rules.map((rule) => (
                <div key={rule.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center justify-between hover:border-gray-600 transition-all">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${rule.is_enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {rule.is_enabled ? <ShieldCheck size={24}/> : <ShieldAlert size={24}/>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white">{rule.name}</h3>
                                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">{rule.id}</span>
                                <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-0.5 rounded uppercase">{rule.category}</span>
                            </div>
                            <p className="text-gray-400 text-sm mt-1">{rule.description}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Custom Toggle Switch */}
                        <button 
                            onClick={() => handleToggle(rule.id, rule.is_enabled)}
                            disabled={loading}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                                rule.is_enabled ? 'bg-emerald-600' : 'bg-gray-600'
                            }`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                rule.is_enabled ? 'translate-x-7' : 'translate-x-1'
                            }`}/>
                        </button>
                    </div>
                </div>
            ))}
        </div>
        
        {/* Warning Note */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex gap-3 text-yellow-500 text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5"/>
            <p>Disabling rules reduces server security. Only disable rules if you are sure they are interfering with legitimate traffic (False Positives).</p>
        </div>
    </div>
  );
};

export default RulesPage;
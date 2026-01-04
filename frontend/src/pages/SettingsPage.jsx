import React, { useState } from 'react';
import { 
    User, 
    Lock, 
    Bell, 
    Send, 
    ShieldAlert, 
    Save,
    Trash2,
    Eye,
    EyeOff
} from 'lucide-react';

const SettingsPage = () => {
    // State Mockup
    const [profile, setProfile] = useState({ name: "Alexander P.", username: "admin" });
    const [security, setSecurity] = useState({ currentPass: "", newPass: "" });
    const [notifications, setNotifications] = useState({ 
        telegramEnabled: true, 
        telegramChatId: "",
        telegramBotToken: "", 
        dailyReports: false 
    });
    
    const [showPassword, setShowPassword] = useState(false);

    const handleProfileChange = (e) => setProfile({...profile, [e.target.name]: e.target.value});
    const handleSecurityChange = (e) => setSecurity({...security, [e.target.name]: e.target.value});
    const handleNotifToggle = (key) => setNotifications({...notifications, [key]: !notifications[key]});
    const handleNotifChange = (e) => setNotifications({...notifications, [e.target.name]: e.target.value});

    const handleSave = (section) => {
        // Mock API Call
        alert(`Creating simulation: Saving ${section} settings...`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
                <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">Rocky Linux Server #01</span>
                    <span>•</span>
                    <span>Configuration</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <User className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-200">Account Profile</h3>
                    </div>
                    <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={profile.name} 
                                    onChange={handleProfileChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                                <input 
                                    type="text" 
                                    name="username"
                                    value={profile.username} 
                                    onChange={handleProfileChange}
                                    disabled
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-500 cursor-not-allowed"
                                />
                                <p className="text-[10px] text-slate-600">Username cannot be changed directly.</p>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={() => handleSave('Profile')}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Lock className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-200">Security</h3>
                    </div>
                    <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        name="currentPass"
                                        value={security.currentPass}
                                        onChange={handleSecurityChange}
                                        placeholder="Current password"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        name="newPass"
                                        value={security.newPass}
                                        onChange={handleSecurityChange}
                                        placeholder="New strong password"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                                    />
                                    <button 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-400"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={() => handleSave('Security')}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Update Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
                        <Bell className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-200">Notifications</h3>
                </div>
                <div className="p-6 space-y-6">
                    {/* Telegram Config */}
                    <div className="space-y-4">
                         <div className="flex items-start justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                    <Send className="w-4 h-4 text-sky-400" />
                                    Telegram Alerts
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-lg">
                                    Receive immediate push notifications on Telegram when critical attacks (SQLi, RCE) are detected.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={notifications.telegramEnabled}
                                    onChange={() => handleNotifToggle('telegramEnabled')}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                         </div>

                         {notifications.telegramEnabled && (
                             <div className="grid grid-cols-1 gap-6 pt-4 animate-in fade-in slide-in-from-top-2">
                                 <div className="space-y-2">
                                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bot Token</label>
                                     <input 
                                         type="password" 
                                         name="telegramBotToken"
                                         value={notifications.telegramBotToken}
                                         onChange={handleNotifChange}
                                         placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                         className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors text-sm font-mono placeholder:text-slate-700"
                                     />
                                 </div>
                                 <div className="space-y-2">
                                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chat ID</label>
                                     <input 
                                         type="text" 
                                         name="telegramChatId"
                                         value={notifications.telegramChatId}
                                         onChange={handleNotifChange}
                                         placeholder="-100123456789"
                                         className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors text-sm font-mono placeholder:text-slate-700"
                                     />
                                 </div>
                             </div>
                         )}
                    </div>

                    <div className="border-t border-slate-800 my-4"></div>

                    {/* Daily Reports */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-200">Daily Digest</h4>
                            <p className="text-xs text-slate-500 mt-1">
                                Receive a summary of valid vs blocked traffic every midnight (00:00 UTC).
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={notifications.dailyReports}
                                onChange={() => handleNotifToggle('dailyReports')}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-rose-500/20 flex items-center gap-3">
                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-rose-500">Danger Zone</h3>
                </div>
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-slate-200">Factory Reset</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                            This will wipe all rules, logs, and custom configurations. This action cannot be undone.
                        </p>
                    </div>
                    <button 
                        onClick={() => { if(confirm("Are you sure? This will wipe everything!")) alert("Resetting..."); }}
                        className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-rose-900/20"
                    >
                        <Trash2 className="w-4 h-4" />
                        Reset Server
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import RulesPage from './pages/RulesPage';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import AccessControlPage from './pages/AccessControlPage';
import ServerMonitorPage from './pages/ServerMonitorPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';

// Placeholder Components for missing pages
const PlaceholderPage = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="p-6 bg-slate-800/50 rounded-full border border-dashed border-slate-700">
            <span className="text-4xl">🚧</span>
        </div>
        <div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
                This module is under development. Please check back later for updates.
            </p>
        </div>
    </div>
);

// Protected route wrapper
const ProtectedRoute = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

// Layout for dashboard pages
const DashboardLayout = () => {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-[#050A18] text-slate-200 font-sans flex overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 ml-64 p-8 h-screen overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div 
                        key={location.pathname}
                        className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
                    >
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

function App() {
  return (
    <Router>
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route index element={<Navigate to="/overview" replace />} />
                    <Route path="overview" element={<OverviewPage />} />
                    <Route path="rules" element={<RulesPage />} />
                    <Route path="access-control" element={<AccessControlPage />} />
                    <Route path="server-monitor" element={<ServerMonitorPage />} />
                    <Route path="logs" element={<LogsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Router>
  );
}

export default App;
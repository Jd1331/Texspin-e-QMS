
import React from 'react';
import { ClipboardCheck, FileText, AlertTriangle, BarChart2, ShieldCheck, Ruler, LogOut, Users, CheckSquare, Settings, Award } from 'lucide-react';
import * as db from '../services/mockBackend';
import { BRANDING } from '../services/branding';

interface LayoutProps {
    children: React.ReactNode;
    activeModule: string;
    onNavigate: (module: string) => void;
    onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeModule, onNavigate, onLogout }) => {
    const user = db.getCurrentUser();

    // Role-based Navigation
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2, roles: ['ADMIN', 'HOD', 'INSPECTOR'] },
        { id: 'control-plan', label: 'Control Plan', icon: FileText, roles: ['ADMIN', 'HOD', 'INSPECTOR'] },
        { id: 'process-approval', label: 'Process Approval', icon: Settings, roles: ['ADMIN', 'HOD', 'INSPECTOR'] }, // New
        { id: 'poka-yoke', label: 'Poka-Yoke Verify', icon: CheckSquare, roles: ['ADMIN', 'HOD', 'INSPECTOR'] }, // New
        { id: 'inspection', label: 'Inspection', icon: ClipboardCheck, roles: ['ADMIN', 'HOD', 'INSPECTOR'] },
        { id: 'process-validation', label: 'SC Validation', icon: Award, roles: ['ADMIN', 'HOD', 'INSPECTOR'] }, // UPDATED: Visible to Inspector
        { id: 'validation-summary', label: 'Mgmt. Summary', icon: Award, roles: ['ADMIN', 'HOD'] }, // KPI Shortcut
        { id: 'nc-capa', label: 'NC & CAPA', icon: AlertTriangle, roles: ['ADMIN', 'HOD', 'INSPECTOR'] },
        { id: 'calibration', label: 'Calibration', icon: Ruler, roles: ['ADMIN', 'HOD'] },
        { id: 'user-management', label: 'User Master', icon: Users, roles: ['ADMIN'] },
    ];

    const allowedNavItems = navItems.filter(item => item.roles.includes(user.role));

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10">
                {/* Branding Header */}
                <div className="h-20 flex items-center justify-center border-b border-slate-700 bg-white shadow-sm">
                    <img 
                        src={BRANDING.logoBase64} 
                        alt={BRANDING.companyName} 
                        className="h-10 w-auto object-contain max-w-[80%]" 
                    />
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1">
                        {allowedNavItems.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => onNavigate(item.id)}
                                    className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors duration-150 ${
                                        activeModule === item.id 
                                        ? 'bg-blue-600 text-white border-r-4 border-blue-400' 
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold">
                                {user.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-medium max-w-[100px] truncate" title={user.name}>{user.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase">{user.role}</p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-200 py-2 rounded text-xs transition border border-slate-700 hover:border-red-900"
                    >
                        <LogOut className="w-3 h-3" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="bg-white shadow-sm sticky top-0 z-20 h-16 flex items-center px-8 justify-between">
                    <h2 className="text-xl font-semibold text-slate-800 capitalize">
                        {activeModule.replace('-', ' ')}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>Plant: <strong>Bearing Unit 1</strong></span>
                        <span className="h-4 w-px bg-slate-300"></span>
                        <span>Year: <strong>2024-25</strong></span>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

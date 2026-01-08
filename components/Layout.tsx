
import React from 'react';
import { 
    ClipboardCheck, FileText, AlertTriangle, BarChart2, ShieldCheck, 
    Ruler, LogOut, Users, CheckSquare, Settings, Award, 
    FileSpreadsheet, Factory 
} from 'lucide-react';
import * as db from '../services/mockBackend';
import { BRANDING } from '../services/branding';

interface LayoutProps {
    children: React.ReactNode;
    activeModule: string;
    onNavigate: (module: string) => void;
    onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeModule, onNavigate, onLogout }) => {
    let user;
    try {
        user = db.getCurrentUser();
    } catch (e) {
        // Fallback or force logout if session is missing but Layout rendered
        onLogout();
        return null; 
    }

    // Updated Navigation based on Role
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2, roles: ['ADMIN', 'HOD', 'QUALITY', 'PRODUCTION', 'VIEW_ONLY'] },
        // New Modules
        { id: 'parts-master', label: 'Parts Master', icon: FileSpreadsheet, roles: ['ADMIN', 'QUALITY'] },
        { id: 'production-entry', label: 'Production Entry', icon: Factory, roles: ['ADMIN', 'PRODUCTION'] },
        
        // QMS Modules
        { id: 'control-plan', label: 'Control Plan', icon: FileText, roles: ['ADMIN', 'QUALITY', 'HOD'] },
        { id: 'inspection', label: 'Inspection', icon: ClipboardCheck, roles: ['ADMIN', 'QUALITY', 'INSPECTOR', 'HOD'] },
        { id: 'poka-yoke', label: 'Poka-Yoke', icon: CheckSquare, roles: ['ADMIN', 'QUALITY', 'INSPECTOR', 'HOD'] },
        { id: 'process-approval', label: 'Process Setup', icon: Settings, roles: ['ADMIN', 'QUALITY', 'INSPECTOR', 'HOD'] },
        { id: 'process-validation', label: 'Validation (SC)', icon: Award, roles: ['ADMIN', 'QUALITY', 'INSPECTOR', 'HOD'] },
        { id: 'nc-capa', label: 'NC & CAPA', icon: AlertTriangle, roles: ['ADMIN', 'QUALITY', 'HOD'] },
        { id: 'user-management', label: 'User Master', icon: Users, roles: ['ADMIN'] },
    ];

    // Simple role check: allow if role is in list OR if role is ADMIN (super user)
    const allowedNavItems = navItems.filter(item => 
        item.roles.includes(user.role) || user.role === 'ADMIN'
    );

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10">
                <div className="h-20 flex items-center justify-center border-b border-slate-700 bg-white shadow-sm">
                    <img src={BRANDING.logoBase64} alt={BRANDING.companyName} className="h-10 w-auto object-contain max-w-[80%]" />
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
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                            {user.name.substring(0,2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/50 text-slate-300 py-2 rounded text-xs transition">
                        <LogOut className="w-3 h-3" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="bg-white shadow-sm sticky top-0 z-20 h-16 flex items-center px-8 justify-between">
                    <h2 className="text-xl font-semibold text-slate-800 capitalize">{activeModule.replace('-', ' ')}</h2>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">Cloud Connected</span>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

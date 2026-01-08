
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ControlPlanModule } from './pages/ControlPlanModule';
import { InspectionModule } from './pages/InspectionModule';
import { NCManagement } from './pages/NCManagement';
import { Dashboard } from './pages/Dashboard';
import { UserManagement } from './pages/UserManagement';
import { Login } from './pages/Login';
import { PartsMasterModule } from './pages/PartsMasterModule';
import { ProductionEntryModule } from './pages/ProductionEntryModule';
import { PokaYokeModule } from './pages/PokaYokeModule';
import { ProcessApprovalModule } from './pages/ProcessApprovalModule';
import { ProcessValidationModule } from './pages/ProcessValidationModule';
import * as db from './services/mockBackend';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Loader2, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeModule, setActiveModule] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Only set authenticated if we also have the local user profile
                // This prevents race condition where Auth completes before Profile fetch
                if (localStorage.getItem('EQMS_USER')) {
                    setIsAuthenticated(true);
                } else {
                    // Try to restore profile if missing (e.g. valid session but clear storage)
                    await restoreUserProfile(session.user.id, session.user.email);
                }
            } else if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                localStorage.removeItem('EQMS_USER');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const restoreUserProfile = async (userId: string, email?: string) => {
        try {
            const { data: userProfile, error } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error || !userProfile) {
                console.warn("Profile not found for authenticated user, signing out.");
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                return;
            }

            if (userProfile.status !== 'ACTIVE') {
                console.warn("User is inactive, signing out.");
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                return;
            }

            const user = {
                id: userId,
                userCode: userProfile.user_code || 'N/A',
                name: userProfile.name,
                email: email || userProfile.email || '',
                role: userProfile.role,
                department: userProfile.department || 'General',
                status: userProfile.status
            };
            
            localStorage.setItem('EQMS_USER', JSON.stringify(user));
            setIsAuthenticated(true);
        } catch (err) {
            console.error("Failed to restore user profile", err);
            setIsAuthenticated(false);
        }
    };

    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const stored = localStorage.getItem('EQMS_USER');
                if (stored) {
                    setIsAuthenticated(true);
                } else {
                    await restoreUserProfile(session.user.id, session.user.email);
                }
            }
        } catch (e) {
            console.error("Auth check failed", e);
        } finally {
            setLoading(false);
        }
    };

    const renderModule = () => {
        switch (activeModule) {
            case 'parts-master': return <PartsMasterModule />;
            case 'production-entry': return <ProductionEntryModule />;
            case 'control-plan': return <ControlPlanModule />;
            case 'inspection': return <InspectionModule />;
            case 'poka-yoke': return <PokaYokeModule />;
            case 'process-approval': return <ProcessApprovalModule />;
            case 'process-validation': return <ProcessValidationModule />;
            case 'nc-capa': return <NCManagement />;
            case 'user-management': return <UserManagement />;
            case 'dashboard':
            default: return <Dashboard />;
        }
    };

    if (!isSupabaseConfigured()) {
        return (
             <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Supabase Not Configured</h1>
                <p className="text-slate-400 max-w-md">
                    Please add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to the environment variables.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
    }

    return (
        <Layout activeModule={activeModule} onNavigate={setActiveModule} onLogout={db.logout}>
            {renderModule()}
        </Layout>
    );
};

export default App;
        
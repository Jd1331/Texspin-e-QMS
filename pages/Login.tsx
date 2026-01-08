
import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { BRANDING } from '../services/branding';
import { Lock, User, ArrowRight, Loader2, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginProps {
    onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [view, setView] = useState<'LOGIN' | 'SETUP'>('LOGIN');
    const [checkingStatus, setCheckingStatus] = useState(true);
    
    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Setup State
    const [setupData, setSetupData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        checkSystemStatus();
    }, []);

    const checkSystemStatus = async () => {
        try {
            // Check if any users exist in the system
            const users = await db.getUsers();
            if (users.length === 0) {
                setView('SETUP');
            }
        } catch (e) {
            console.warn("Could not check system status, defaulting to login", e);
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsLoading(true);
        try {
            await db.login(email, password);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || 'Authentication Failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (setupData.password !== setupData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (setupData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        try {
            const newAdmin: UserType = {
                id: '', // Will be assigned by Auth
                userCode: 'ADMIN-01',
                name: setupData.name,
                email: setupData.email,
                role: 'ADMIN',
                department: 'Management',
                status: 'ACTIVE'
            };

            await db.createUser(newAdmin, setupData.password);
            setSuccessMsg("System Initialized! You can now log in with your Admin account.");
            setEmail(setupData.email);
            setView('LOGIN');
        } catch (err: any) {
            setError(err.message || "Setup Failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white blur-xl"></div>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <img 
                            src={BRANDING.logoRoundBase64} 
                            alt="Texspin Logo" 
                            className="w-20 h-20 mb-4 drop-shadow-md"
                        />
                        <h1 className="text-2xl font-bold text-white tracking-wide">{BRANDING.appName}</h1>
                        <p className="text-blue-100 mt-2 text-sm">Cloud QMS Edition</p>
                    </div>
                </div>
                
                <div className="p-8">
                    {view === 'SETUP' ? (
                        <>
                            <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                                <ShieldCheck className="w-6 h-6" />
                                <span className="font-bold tracking-wide text-xs uppercase">System Initialization</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Create Root Admin</h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                No users found. Please create the first Administrator account to access the system.
                            </p>

                            <form onSubmit={handleSetup} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full border p-2 rounded text-sm" 
                                        placeholder="Admin Name"
                                        value={setupData.name}
                                        onChange={e => setSetupData({...setupData, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        required 
                                        className="w-full border p-2 rounded text-sm" 
                                        placeholder="admin@texspin.com"
                                        value={setupData.email}
                                        onChange={e => setSetupData({...setupData, email: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                                        <input 
                                            type="password" 
                                            required 
                                            className="w-full border p-2 rounded text-sm" 
                                            placeholder="Min 6 chars"
                                            value={setupData.password}
                                            onChange={e => setSetupData({...setupData, password: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm</label>
                                        <input 
                                            type="password" 
                                            required 
                                            className="w-full border p-2 rounded text-sm" 
                                            placeholder="Confirm"
                                            value={setupData.confirmPassword}
                                            onChange={e => setSetupData({...setupData, confirmPassword: e.target.value})}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-red-600 text-xs bg-red-50 p-2 rounded border border-red-100 font-medium">
                                        {error}
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                                >
                                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Initialize System"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
                                Authorized Login
                            </h2>
                            
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input 
                                            type="email" 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                            placeholder="Enter your email" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input 
                                            type="password" 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                            placeholder="••••••" 
                                            required 
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 font-medium flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}
                                
                                {successMsg && (
                                    <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100 font-medium flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 shrink-0" />
                                        {successMsg}
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>

                            <div className="mt-6 text-center text-xs text-gray-400">
                                Protected System. Access restricted to authorized personnel only.
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

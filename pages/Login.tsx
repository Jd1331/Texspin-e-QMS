import React, { useState } from 'react';
import * as db from '../services/mockBackend';
import { BRANDING } from '../services/branding';
import { Lock, User, ArrowRight } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [userCode, setUserCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            db.login(userCode, password);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
                    {/* Background Pattern Enhancement */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white blur-xl"></div>
                        <div className="absolute top-20 -left-10 w-24 h-24 rounded-full bg-blue-300 blur-xl"></div>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        {/* Replaced Icon with Official Round Logo */}
                        <img 
                            src={BRANDING.logoRoundBase64} 
                            alt="Texspin Logo" 
                            className="w-20 h-20 mb-4 drop-shadow-md"
                        />
                        <h1 className="text-2xl font-bold text-white tracking-wide">{BRANDING.appName}</h1>
                        <p className="text-blue-100 mt-2 text-sm">Quality Management System</p>
                    </div>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">User Code / Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <input 
                                    type="text" 
                                    value={userCode} 
                                    onChange={(e) => setUserCode(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" 
                                    placeholder="e.g. EMP001" 
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
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" 
                                    placeholder="••••••" 
                                    required 
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-center">
                                <span className="font-bold mr-2">!</span> {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition transform hover:scale-[1.01] flex items-center justify-center gap-2"
                        >
                            Secure Login <ArrowRight className="w-4 h-4" />
                        </button>

                        <div className="text-center text-xs text-gray-400 mt-6">
                            Authorized Access Only. All activities are logged.
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
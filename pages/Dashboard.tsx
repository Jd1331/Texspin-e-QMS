import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import * as db from '../services/mockBackend';
import { AlertTriangle, Shield, Settings } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const ppmData = db.getPPMData();
    const instruments = db.getInstruments();
    const overdueInstruments = instruments.filter(i => i.status === 'OVERDUE');

    return (
        <div className="space-y-8">
            {/* Top Cards */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Avg PPM (Last 3 Mo)</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">850</h3>
                        </div>
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-green-600 font-medium flex items-center">
                        ↓ 12% vs previous quarter
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                     <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Audit Score</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">92%</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Shield className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                        Last Audit: Process Audit (Line 1)
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                     <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Calibration Status</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">{overdueInstruments.length} Overdue</h3>
                        </div>
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                            <Settings className="w-6 h-6" />
                        </div>
                    </div>
                     <div className="mt-4 text-xs text-red-500 font-medium">
                        Immediate action required
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="font-bold text-slate-700 mb-6">PPM Trend (Rejection Rate)</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ppmData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="ppm" stroke="#2563eb" strokeWidth={3} dot={{r: 4}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="font-bold text-slate-700 mb-4">Instrument Calibration Schedule</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="p-3">Instrument</th>
                                    <th className="p-3">Due Date</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {instruments.map(inst => (
                                    <tr key={inst.id}>
                                        <td className="p-3 font-medium text-slate-700">{inst.name} ({inst.serialNumber})</td>
                                        <td className="p-3">{inst.nextDueDate}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                inst.status === 'OK' ? 'bg-green-100 text-green-700' :
                                                inst.status === 'DUE_SOON' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {inst.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

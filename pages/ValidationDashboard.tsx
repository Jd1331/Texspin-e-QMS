
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as db from '../services/mockBackend';
import { CheckCircle, AlertOctagon, Clock, Activity } from 'lucide-react';

export const ValidationDashboard: React.FC = () => {
    const stats = db.getValidationAnalytics();
    
    // Data for Pie Chart
    const statusData = [
        { name: 'Valid', value: stats.valid, color: '#22c55e' },
        { name: 'Due Soon', value: stats.dueSoon, color: '#eab308' },
        { name: 'Overdue', value: stats.overdue, color: '#ef4444' }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600" /> Validation Management Summary
            </h2>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Validations</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active / Valid</p>
                            <h3 className="text-3xl font-bold text-green-600 mt-2">{stats.valid}</h3>
                        </div>
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Due Soon (7 Days)</p>
                            <h3 className="text-3xl font-bold text-yellow-600 mt-2">{stats.dueSoon}</h3>
                        </div>
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Critical Overdue</p>
                            <h3 className="text-3xl font-bold text-red-600 mt-2">{stats.overdue}</h3>
                        </div>
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                            <AlertOctagon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="font-bold text-slate-700 mb-6">Validation Health by Process</h4>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Total" fill="#3b82f6" name="Total Plans" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Overdue" fill="#ef4444" name="Overdue" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
                    <h4 className="font-bold text-slate-700 mb-6 w-full text-left">Compliance Status</h4>
                    <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center mt-4 text-sm text-gray-500">
                        Visual breakdown of active vs overdue re-validations.
                    </div>
                </div>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r">
                <h4 className="font-bold text-blue-800 text-sm">Audit Readiness Note</h4>
                <p className="text-xs text-blue-700 mt-1">
                    Processes marked "Overdue" are non-compliant with IATF 16949 periodic validation requirements. 
                    Ensure re-validation is performed immediately to maintain process capability evidence.
                </p>
            </div>
        </div>
    );
};

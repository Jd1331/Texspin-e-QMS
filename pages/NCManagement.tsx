import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { NCRecord, NCStatus } from '../types';
import { AlertOctagon, CheckSquare, Clock, ArrowRight } from 'lucide-react';

export const NCManagement: React.FC = () => {
    const [ncs, setNcs] = useState<NCRecord[]>([]);
    const [selectedNC, setSelectedNC] = useState<NCRecord | null>(null);

    // CAPA Form
    const [rca, setRca] = useState('');
    const [action, setAction] = useState('');

    useEffect(() => {
        refresh();
    }, []);

    const refresh = async () => {
        const records = await db.getNCRecords();
        setNcs(records);
    };

    const handleSelect = (nc: NCRecord) => {
        setSelectedNC(nc);
        setRca(nc.rootCause || '');
        setAction(nc.correctiveAction || '');
    };

    const updateStatus = async (status: NCStatus) => {
        if (!selectedNC) return;
        try {
            await db.updateNCStatus(selectedNC.id, {
                status,
                rootCause: rca,
                correctiveAction: action,
                effectivenessVerified: status === NCStatus.CLOSED
            });
            refresh();
            setSelectedNC(null);
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            {/* List View */}
            <div className="col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-slate-700">Open Non-Conformances</h3>
                </div>
                <div className="overflow-y-auto flex-1">
                    {ncs.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No active NCs</div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {ncs.map(nc => (
                                <li 
                                    key={nc.id} 
                                    onClick={() => handleSelect(nc)}
                                    className={`p-4 cursor-pointer hover:bg-blue-50 transition ${selectedNC?.id === nc.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${nc.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'}`}>
                                            {nc.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-500">{new Date(nc.detectedDate).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-medium text-slate-800">{nc.description}</h4>
                                    <div className="text-sm text-gray-500 mt-1">{nc.partNumber} | {nc.processName}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Detail/Action View */}
            <div className="col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
                {selectedNC ? (
                    <>
                        <div className="p-6 border-b">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">CAPA Workflow</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <AlertOctagon className="w-4 h-4" />
                                <span>Source: {selectedNC.source}</span>
                            </div>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            {/* Step 1: RCA */}
                            <div className={`p-4 rounded-lg border ${selectedNC.status === 'OPEN' ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs mr-2">1</span>
                                    Root Cause Analysis (Why-Why)
                                </h4>
                                <textarea 
                                    disabled={selectedNC.status !== 'OPEN'}
                                    value={rca}
                                    onChange={(e) => setRca(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md text-sm"
                                    rows={3}
                                    placeholder="Enter root cause analysis here..."
                                />
                                {selectedNC.status === 'OPEN' && (
                                    <div className="mt-2 text-right">
                                        <button onClick={() => updateStatus(NCStatus.RCA_SUBMITTED)} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">Submit RCA</button>
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Corrective Action */}
                            <div className={`p-4 rounded-lg border ${selectedNC.status === 'RCA_SUBMITTED' ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs mr-2">2</span>
                                    Corrective Action
                                </h4>
                                <textarea 
                                    disabled={selectedNC.status !== 'RCA_SUBMITTED'}
                                    value={action}
                                    onChange={(e) => setAction(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md text-sm"
                                    rows={3}
                                    placeholder="Define corrective action..."
                                />
                                {selectedNC.status === 'RCA_SUBMITTED' && (
                                    <div className="mt-2 text-right">
                                        <button onClick={() => updateStatus(NCStatus.ACTION_IMPLEMENTED)} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">Implement Action</button>
                                    </div>
                                )}
                            </div>

                            {/* Step 3: Verification */}
                            <div className={`p-4 rounded-lg border ${selectedNC.status === 'ACTION_IMPLEMENTED' ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs mr-2">3</span>
                                    Effectiveness Verification
                                </h4>
                                <div className="text-sm text-gray-600 mb-3">
                                    QA Manager must verify that the action taken has eliminated the root cause.
                                </div>
                                {selectedNC.status === 'ACTION_IMPLEMENTED' && (
                                    <div className="mt-2 text-right">
                                        <button onClick={() => updateStatus(NCStatus.CLOSED)} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 flex items-center gap-2 ml-auto">
                                            <CheckSquare className="w-4 h-4" /> Verify & Close NC
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <ArrowRight className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select an NC record to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};
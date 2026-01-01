
import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { generatePokaYokePDF } from '../services/pdfGenerator';
import { ControlPlan, PokaYokeRecord, InspectionStatus } from '../types';
import { CheckSquare, AlertTriangle, FileDown, Plus, ShieldCheck, Eye, ArrowLeft, Lock, Save, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { WorkflowActionModal } from '../components/WorkflowActionModal';

export const PokaYokeModule: React.FC = () => {
    const [view, setView] = useState<'LIST' | 'ENTRY'>('LIST');
    const [history, setHistory] = useState<PokaYokeRecord[]>([]);
    const [pending, setPending] = useState<PokaYokeRecord[]>([]);
    const [plans, setPlans] = useState<ControlPlan[]>([]);
    
    // Auth
    const user = db.getCurrentUser();
    const isHod = user.role === 'HOD';

    // Entry Form State
    const [selectedPart, setSelectedPart] = useState('');
    const [activePlan, setActivePlan] = useState<ControlPlan | null>(null);
    const [entryData, setEntryData] = useState<Partial<PokaYokeRecord>>({
        shift: 'A',
        machineNo: '',
        verifications: []
    });
    const [viewingRecord, setViewingRecord] = useState<PokaYokeRecord | null>(null);

    // Approval Modal
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, type: 'APPROVE' | 'REJECT', recordId: string } | null>(null);

    useEffect(() => {
        refresh();
    }, [view]);

    const refresh = () => {
        setHistory(db.getPokaYokeHistory());
        setPlans(db.getAllControlPlans().filter(p => p.status === 'ACTIVE'));
        if (isHod) {
            setPending(db.getPendingPokaYokes());
        }
    };

    const handleSelectPart = (partNo: string) => {
        setSelectedPart(partNo);
        const plan = db.getActiveControlPlan(partNo);
        if (plan) {
            setActivePlan(plan);
            const pyItems = plan.items.filter(i => i.isPokaYoke && i.isActive);
            setEntryData({
                ...entryData,
                partNumber: partNo,
                controlPlanId: plan.id,
                verifications: pyItems.map(i => ({
                    cpItemId: i.id,
                    checkPoint: i.productDesc,
                    method: i.controlMethod,
                    spec: i.tolerance,
                    actualObservation: '',
                    status: 'OK'
                }))
            });
        }
    };

    const handleVerificationChange = (idx: number, field: string, value: string) => {
        if (viewingRecord) return; // Read-only
        if (!entryData.verifications) return;
        const newVerifications = [...entryData.verifications];
        (newVerifications[idx] as any)[field] = value;
        setEntryData({ ...entryData, verifications: newVerifications });
    };

    const handleSubmit = () => {
        if (!entryData.machineNo) { alert("Enter Machine No"); return; }
        
        const record: PokaYokeRecord = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            shift: entryData.shift as any,
            partNumber: selectedPart,
            machineNo: entryData.machineNo!,
            controlPlanId: entryData.controlPlanId!,
            verifications: entryData.verifications as any,
            verifiedBy: db.getCurrentUser().name,
            status: InspectionStatus.SUBMITTED
        };

        db.savePokaYoke(record);
        alert("Poka-Yoke Verification Submitted for Approval!");
        setView('LIST');
        refresh();
    };

    const handleView = (rec: PokaYokeRecord) => {
        setViewingRecord(rec);
        setView('ENTRY');
        setEntryData(rec);
        setSelectedPart(rec.partNumber);
        
        // Load plan name for display
        const plan = db.getControlPlanById(rec.controlPlanId);
        if(plan) setActivePlan(plan);
    };

    const handleCloseEntry = () => {
        setView('LIST');
        setViewingRecord(null);
        setEntryData({ shift: 'A', machineNo: '', verifications: [] });
        setSelectedPart('');
        setActivePlan(null);
    };

    const handleApprovalAction = async (remark: string) => {
        if (!actionModal) return;
        const status = actionModal.type === 'APPROVE' ? InspectionStatus.APPROVED : InspectionStatus.REJECTED;
        await db.approvePokaYoke(actionModal.recordId, status, remark);
        setActionModal(null);
        refresh();
        if (viewingRecord) handleCloseEntry();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <CheckSquare className="w-6 h-6 text-blue-600" />
                    Poka-Yoke Verification
                </h3>
                {view === 'LIST' && (
                    <button onClick={() => { setView('ENTRY'); setViewingRecord(null); setEntryData({shift:'A', machineNo:'', verifications:[]}); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium shadow-sm">
                        <Plus className="w-4 h-4" /> New Verification
                    </button>
                )}
            </div>

            {view === 'LIST' && (
                <div className="space-y-6">
                    {/* HOD Pending Queue */}
                    {isHod && pending.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 animate-in fade-in">
                            <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-3">
                                <ShieldCheck className="w-5 h-5" /> Pending Approvals ({pending.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pending.map(rec => (
                                    <div key={rec.id} className="bg-white p-4 rounded-lg border shadow-sm flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-800">{rec.partNumber}</div>
                                            <div className="text-xs text-gray-500">Machine: {rec.machineNo} | {rec.date} ({rec.shift})</div>
                                            <div className="text-xs text-blue-600 mt-1 font-medium">By: {rec.verifiedBy}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleView(rec)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></button>
                                            <button 
                                                onClick={() => setActionModal({ isOpen: true, type: 'APPROVE', recordId: rec.id })}
                                                className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-bold hover:bg-green-200"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="p-4">Date / Shift</th>
                                    <th className="p-4">Part No</th>
                                    <th className="p-4">Machine</th>
                                    <th className="p-4">Verified By</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map(rec => (
                                    <tr key={rec.id} className="hover:bg-gray-50">
                                        <td className="p-4">{rec.date} ({rec.shift})</td>
                                        <td className="p-4 font-medium">{rec.partNumber}</td>
                                        <td className="p-4">{rec.machineNo}</td>
                                        <td className="p-4">{rec.verifiedBy}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold 
                                                ${rec.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                                  rec.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {rec.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button onClick={() => generatePokaYokePDF(rec)} className="text-gray-500 hover:text-red-600 flex items-center text-xs"><FileDown className="w-4 h-4 mr-1"/> PDF</button>
                                            <button onClick={() => handleView(rec)} className="text-blue-600 hover:text-blue-800 flex items-center text-xs"><Eye className="w-4 h-4 mr-1"/> View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'ENTRY' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[calc(100vh-140px)]">
                    <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">
                                {viewingRecord ? 'Verification Details' : 'New Poka-Yoke Entry'}
                            </h3>
                            {viewingRecord && (
                                <div className="flex gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${viewingRecord.status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-700' : viewingRecord.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                                        Status: {viewingRecord.status}
                                    </span>
                                    {viewingRecord.status === 'REJECTED' && <span className="text-xs text-red-600 font-medium">Reason: {viewingRecord.rejectionRemark}</span>}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {isHod && viewingRecord?.status === 'SUBMITTED' && (
                                <>
                                    <button onClick={() => setActionModal({ isOpen: true, type: 'APPROVE', recordId: viewingRecord.id })} className="bg-green-600 text-white px-4 py-2 rounded shadow-sm hover:bg-green-700 text-sm font-medium flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> Approve
                                    </button>
                                    <button onClick={() => setActionModal({ isOpen: true, type: 'REJECT', recordId: viewingRecord.id })} className="bg-red-600 text-white px-4 py-2 rounded shadow-sm hover:bg-red-700 text-sm font-medium flex items-center gap-2">
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                </>
                            )}
                            <button onClick={handleCloseEntry} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {/* Header Inputs */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Part Number</label>
                                {viewingRecord ? (
                                    <div className="p-2 bg-gray-100 rounded text-sm font-bold border">{entryData.partNumber}</div>
                                ) : (
                                    <select value={selectedPart} onChange={e => handleSelectPart(e.target.value)} className="w-full mt-1 border p-2 rounded text-sm">
                                        <option value="">Select Part...</option>
                                        {plans.map(p => <option key={p.id} value={p.partNumber}>{p.partNumber}</option>)}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Part Name</label>
                                <div className="p-2 bg-gray-50 rounded text-sm border text-gray-600">{activePlan?.partName || '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Machine No</label>
                                <input disabled={!!viewingRecord} value={entryData.machineNo} onChange={e => setEntryData({...entryData, machineNo: e.target.value})} className="w-full mt-1 border p-2 rounded text-sm" placeholder="e.g. MC-001" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Shift</label>
                                <select disabled={!!viewingRecord} value={entryData.shift} onChange={e => setEntryData({...entryData, shift: e.target.value as any})} className="w-full mt-1 border p-2 rounded text-sm">
                                    <option value="A">Shift A</option>
                                    <option value="B">Shift B</option>
                                    <option value="C">Shift C</option>
                                </select>
                            </div>
                        </div>

                        {/* Checklist */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th className="p-3 text-left w-1/3">Checkpoint / Failure Mode</th>
                                        <th className="p-3 text-left w-1/4">Method</th>
                                        <th className="p-3 text-left w-1/4">Observation</th>
                                        <th className="p-3 text-center w-24">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {entryData.verifications?.map((v, idx) => (
                                        <tr key={idx} className={v.status === 'NG' ? 'bg-red-50' : ''}>
                                            <td className="p-3 font-medium">
                                                {v.checkPoint}
                                                <div className="text-xs text-gray-500 mt-0.5">Ref: {v.spec}</div>
                                            </td>
                                            <td className="p-3 text-gray-600">{v.method}</td>
                                            <td className="p-3">
                                                <input 
                                                    disabled={!!viewingRecord}
                                                    value={v.actualObservation} 
                                                    onChange={e => handleVerificationChange(idx, 'actualObservation', e.target.value)} 
                                                    className="w-full border p-1.5 rounded text-sm" 
                                                    placeholder="Enter observation..."
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                <select 
                                                    disabled={!!viewingRecord}
                                                    value={v.status}
                                                    onChange={e => handleVerificationChange(idx, 'status', e.target.value)}
                                                    className={`border p-1.5 rounded text-xs font-bold ${v.status === 'OK' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}
                                                >
                                                    <option value="OK">OK</option>
                                                    <option value="NG">NG</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {entryData.verifications?.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">Select a Part Number to load checkpoints from Control Plan</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!viewingRecord && entryData.verifications && entryData.verifications.length > 0 && (
                            <div className="mt-6 flex justify-end">
                                <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Submit Verification
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {actionModal && (
                <WorkflowActionModal 
                    type={actionModal.type} 
                    onConfirm={handleApprovalAction} 
                    onClose={() => setActionModal(null)} 
                />
            )}
        </div>
    );
};

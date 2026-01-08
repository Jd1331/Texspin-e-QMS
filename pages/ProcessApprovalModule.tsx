
import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { generateProcessApprovalPDF } from '../services/pdfGenerator';
import { ProcessSetupMaster, ProcessSetupRecord, InspectionStatus } from '../types';
import { Settings, FileDown, Plus, Save, Eye, ShieldCheck, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { WorkflowActionModal } from '../components/WorkflowActionModal';

export const ProcessApprovalModule: React.FC = () => {
    const [view, setView] = useState<'LIST' | 'ENTRY' | 'MASTER'>('LIST');
    const [history, setHistory] = useState<ProcessSetupRecord[]>([]);
    const [pending, setPending] = useState<ProcessSetupRecord[]>([]);
    
    // Data States
    const [partList, setPartList] = useState<string[]>([]);
    const [mastersMap, setMastersMap] = useState<Record<string, ProcessSetupMaster>>({});

    // Auth
    const user = db.getCurrentUser();
    const isHod = user.role === 'HOD';

    // Master Creation State
    const [newMaster, setNewMaster] = useState<Partial<ProcessSetupMaster>>({
        partNumber: '',
        parameters: []
    });

    // Entry/View State
    const [selectedMaster, setSelectedMaster] = useState<ProcessSetupMaster | null>(null);
    const [entryData, setEntryData] = useState<Partial<ProcessSetupRecord>>({
        shift: 'A',
        readings: {}
    });
    const [viewingRecord, setViewingRecord] = useState<ProcessSetupRecord | null>(null);

    // Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, type: 'APPROVE' | 'REJECT', recordId: string } | null>(null);

    useEffect(() => {
        refresh();
    }, [view]);

    const refresh = async () => {
        setHistory(await db.getProcessSetupHistory());
        if (isHod) {
            setPending(await db.getPendingProcessSetups());
        }

        // Fetch Parts and Masters for lookup
        const parts = await db.getUniqueParts();
        setPartList(parts);
        const map: Record<string, ProcessSetupMaster> = {};
        for(const p of parts) {
             const m = await db.getProcessMaster(p);
             if(m) map[m.id] = m;
        }
        setMastersMap(map);
    };

    // --- MASTER LOGIC ---
    const addParameterToMaster = () => {
        const id = crypto.randomUUID();
        setNewMaster({
            ...newMaster,
            parameters: [...(newMaster.parameters || []), { id, name: '', specification: '', class: 'Major', controlMethod: '' }]
        });
    };

    const updateMasterParam = (idx: number, field: string, val: string) => {
        const params = [...(newMaster.parameters || [])];
        (params[idx] as any)[field] = val;
        setNewMaster({ ...newMaster, parameters: params });
    };

    const saveMaster = async () => {
        if (!newMaster.partNumber) return alert("Part Number required");
        try {
            await db.saveProcessMaster({
                id: crypto.randomUUID(),
                partNumber: newMaster.partNumber!,
                machineNo: newMaster.machineNo || 'General',
                processName: newMaster.processName || 'Standard',
                parameters: newMaster.parameters || []
            });
            alert("Process Template Saved!");
            setView('LIST');
        } catch (e: any) {
            alert(e.message);
        }
    };

    // --- ENTRY LOGIC ---
    const initEntry = async (partNo: string) => {
        const master = await db.getProcessMaster(partNo);
        if (master) {
            setSelectedMaster(master);
            setEntryData({
                masterId: master.id,
                date: new Date().toISOString().split('T')[0],
                shift: 'A',
                readings: {}
            });
        } else {
            alert("No Process Template found for this part. Please create one first.");
        }
    };

    const handleView = (rec: ProcessSetupRecord) => {
        const master = mastersMap[rec.masterId];
        if (master) setSelectedMaster(master);
        setEntryData(rec);
        setViewingRecord(rec);
        setView('ENTRY');
    };

    const handleReadingChange = (paramId: string, field: 'actualValue' | 'status', val: string) => {
        if (viewingRecord) return;
        setEntryData(prev => ({
            ...prev,
            readings: {
                ...prev.readings,
                [paramId]: {
                    ...prev.readings?.[paramId],
                    [field]: val,
                    status: field === 'status' ? val : (prev.readings?.[paramId]?.status || 'OK')
                } as any
            }
        }));
    };

    const submitEntry = async () => {
        if (!selectedMaster) return;
        const record: ProcessSetupRecord = {
            id: crypto.randomUUID(),
            masterId: selectedMaster.id,
            date: entryData.date!,
            shift: entryData.shift as any,
            checkedBy: db.getCurrentUser().name,
            status: InspectionStatus.SUBMITTED,
            readings: entryData.readings as any
        };
        try {
            await db.saveProcessSetupRecord(record);
            alert("Process Setup Submitted for Approval!");
            setView('LIST');
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleApprovalAction = async (remark: string) => {
        if (!actionModal) return;
        const status = actionModal.type === 'APPROVE' ? InspectionStatus.APPROVED : InspectionStatus.REJECTED;
        await db.approveProcessSetup(actionModal.recordId, status, remark);
        setActionModal(null);
        refresh();
        if (viewingRecord) setView('LIST');
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-700">Process Approval Check Sheet</h3>
                <div className="flex gap-2">
                    <button onClick={() => setView('MASTER')} className="text-blue-600 border border-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50">
                        Manage Templates
                    </button>
                    {view === 'LIST' && (
                        <button onClick={() => { setView('ENTRY'); setViewingRecord(null); setSelectedMaster(null); }} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow-sm font-medium">
                            <Plus className="w-4 h-4" /> New Setup Entry
                        </button>
                    )}
                </div>
            </div>

            {view === 'LIST' && (
                <div className="space-y-6">
                    {/* HOD Pending */}
                    {isHod && pending.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 animate-in fade-in">
                            <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-3">
                                <ShieldCheck className="w-5 h-5" /> Pending Approvals ({pending.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pending.map(rec => (
                                    <div key={rec.id} className="bg-white p-4 rounded-lg border shadow-sm flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-800">{rec.date} ({rec.shift})</div>
                                            <div className="text-xs text-gray-500">Checked By: {rec.checkedBy}</div>
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
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="p-4">Date / Shift</th>
                                    <th className="p-4">Checked By</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map(rec => {
                                    const master = mastersMap[rec.masterId];
                                    return (
                                        <tr key={rec.id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{rec.date} ({rec.shift})</div>
                                                <div className="text-xs text-gray-400">{master?.partNumber}</div>
                                            </td>
                                            <td className="p-4">{rec.checkedBy}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold 
                                                    ${rec.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                                    rec.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button onClick={() => master && generateProcessApprovalPDF(rec, master)} className="text-gray-500 hover:text-blue-600 flex items-center text-xs gap-1">
                                                    <FileDown className="w-4 h-4" /> PDF
                                                </button>
                                                <button onClick={() => handleView(rec)} className="text-blue-600 hover:text-blue-800 flex items-center text-xs gap-1">
                                                    <Eye className="w-4 h-4" /> View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'MASTER' && (
                <div className="bg-white p-6 rounded-xl shadow-lg border">
                    <h4 className="font-bold mb-4">Create New Process Parameter Template</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <input className="border p-2 rounded" placeholder="Part Number" value={newMaster.partNumber} onChange={e => setNewMaster({...newMaster, partNumber: e.target.value})} />
                        <input className="border p-2 rounded" placeholder="Machine No" value={newMaster.machineNo} onChange={e => setNewMaster({...newMaster, machineNo: e.target.value})} />
                        <input className="border p-2 rounded" placeholder="Process Name" value={newMaster.processName} onChange={e => setNewMaster({...newMaster, processName: e.target.value})} />
                    </div>
                    <table className="w-full mb-4 text-sm">
                        <thead>
                            <tr className="bg-gray-100 text-left"><th className="p-2">Param Name</th><th className="p-2">Spec</th><th className="p-2">Method</th></tr>
                        </thead>
                        <tbody>
                            {newMaster.parameters?.map((p, i) => (
                                <tr key={p.id}>
                                    <td className="p-1"><input className="w-full border p-1" value={p.name} onChange={e => updateMasterParam(i, 'name', e.target.value)} /></td>
                                    <td className="p-1"><input className="w-full border p-1" value={p.specification} onChange={e => updateMasterParam(i, 'specification', e.target.value)} /></td>
                                    <td className="p-1"><input className="w-full border p-1" value={p.controlMethod} onChange={e => updateMasterParam(i, 'controlMethod', e.target.value)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addParameterToMaster} className="text-sm text-blue-600 mb-4">+ Add Param</button>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setView('LIST')} className="px-4 py-2 text-gray-500">Cancel</button>
                        <button onClick={saveMaster} className="px-4 py-2 bg-blue-600 text-white rounded">Save Template</button>
                    </div>
                </div>
            )}

            {view === 'ENTRY' && (
                <div className="bg-white p-6 rounded-xl shadow-lg border flex flex-col h-[calc(100vh-140px)]">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <div>
                            <h4 className="font-bold text-lg text-slate-800">
                                {viewingRecord ? `Setup Details: ${selectedMaster?.partNumber}` : 'New Setup Entry'}
                            </h4>
                            {viewingRecord && (
                                <div className="flex gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${viewingRecord.status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-700' : viewingRecord.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                                        Status: {viewingRecord.status}
                                    </span>
                                    {viewingRecord.approvalRemark && <span className="text-xs text-green-700">Note: {viewingRecord.approvalRemark}</span>}
                                    {viewingRecord.rejectionRemark && <span className="text-xs text-red-600">Note: {viewingRecord.rejectionRemark}</span>}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                             {isHod && viewingRecord?.status === 'SUBMITTED' && (
                                <>
                                    <button onClick={() => setActionModal({ isOpen: true, type: 'APPROVE', recordId: viewingRecord.id })} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" /> Approve
                                    </button>
                                    <button onClick={() => setActionModal({ isOpen: true, type: 'REJECT', recordId: viewingRecord.id })} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1">
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                </>
                            )}
                            <button onClick={() => setView('LIST')} className="text-gray-500 hover:text-gray-800 text-sm flex items-center">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Back
                            </button>
                        </div>
                    </div>

                    {!selectedMaster ? (
                        <div>
                            <label className="font-bold text-sm">Select Part to Setup:</label>
                            <select className="border p-2 ml-2 rounded" onChange={e => initEntry(e.target.value)}>
                                <option value="">-- Select --</option>
                                {partList.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-1 gap-4">
                                {selectedMaster.parameters.map(p => {
                                    const reading = entryData.readings?.[p.id];
                                    return (
                                        <div key={p.id} className="flex items-center gap-4 border-b pb-4">
                                            <div className="w-1/3">
                                                <div className="font-medium text-sm text-slate-800">{p.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">Spec: {p.specification}</div>
                                                <div className="text-[10px] text-gray-400">Method: {p.controlMethod}</div>
                                            </div>
                                            <div className="w-1/3">
                                                <input 
                                                    disabled={!!viewingRecord}
                                                    className="w-full border p-2 rounded text-sm" 
                                                    placeholder="Actual Value"
                                                    value={reading?.actualValue || ''}
                                                    onChange={e => handleReadingChange(p.id, 'actualValue', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-1/4">
                                                <select 
                                                    disabled={!!viewingRecord}
                                                    className={`border p-2 rounded w-full text-sm font-bold ${reading?.status === 'NG' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                                                    value={reading?.status || 'OK'}
                                                    onChange={e => handleReadingChange(p.id, 'status', e.target.value)}
                                                >
                                                    <option value="OK">OK</option>
                                                    <option value="NG">NG</option>
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {!viewingRecord && (
                                <div className="mt-6 flex justify-end gap-2">
                                    <button onClick={submitEntry} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                                        <Save className="w-4 h-4" /> Submit Setup
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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

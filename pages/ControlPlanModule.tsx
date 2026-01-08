import React, { useState, useEffect } from 'react';
import { ControlPlan, ControlPlanItem, PlanStatus, ControlPlanChangeLog } from '../types';
import * as db from '../services/mockBackend';
import { generateControlPlanPDF } from '../services/pdfGenerator';
import { Plus, Archive, CheckCircle, Copy, Save, AlertTriangle, RefreshCw, History, Eye, X, ArrowRight, FileDown, Loader2 } from 'lucide-react';

const STANDARD_FAMILIES = [
    "Receiving",
    "Heat Treatment",
    "DG",
    "CG",
    "Grinding",
    "Assembly",
    "Pre-Dispatch"
];

const RESPONSIBILITIES = [
    "QA Engineer",
    "Production Engineer",
    "Assembly Supervisor",
    "Line Operator",
    "Maintenance",
    "Store Keeper"
];

export const ControlPlanModule: React.FC = () => {
    const [plans, setPlans] = useState<ControlPlan[]>([]);
    const [view, setView] = useState<'LIST' | 'EDIT' | 'HISTORY'>('LIST');

    // Editing State
    const [currentPlan, setCurrentPlan] = useState<Partial<ControlPlan>>({
        partNumber: '',
        partName: '',
        controlPlanNumber: '',
        processFamily: STANDARD_FAMILIES[5],
        phase: 'PRODUCTION',
        coreTeam: '',
        items: []
    });
    
    // UI State for Family Selection
    const [isManualFamily, setIsManualFamily] = useState(false);
    
    // Versioning State
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [changeReason, setChangeReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // History View State
    const [selectedPlanNumber, setSelectedPlanNumber] = useState('');
    const [changeLogs, setChangeLogs] = useState<ControlPlanChangeLog[]>([]);

    useEffect(() => {
        refreshData();
    }, []);

    useEffect(() => {
        if (view === 'EDIT' && currentPlan.processFamily) {
            const isStandard = STANDARD_FAMILIES.includes(currentPlan.processFamily);
            setIsManualFamily(!isStandard);
        }
    }, [view, currentPlan.id]);

    const refreshData = async () => {
        setPlans(await db.getAllControlPlans());
    };

    const handleCreateNew = () => {
        setCurrentPlan({
            partNumber: '',
            partName: '',
            controlPlanNumber: '',
            processFamily: STANDARD_FAMILIES[0],
            phase: 'PRODUCTION',
            coreTeam: '',
            items: []
        });
        setIsManualFamily(false);
        setView('EDIT');
    };

    const handleCopyVersion = (plan: ControlPlan) => {
        setCurrentPlan({
            ...plan,
            id: undefined, // Clear ID to force new version
            version: plan.version + 1,
            approvalDate: new Date().toISOString().split('T')[0]
        });
        setIsManualFamily(!STANDARD_FAMILIES.includes(plan.processFamily));
        setView('EDIT');
    };

    const handleViewHistory = async (cpNumber: string) => {
        setSelectedPlanNumber(cpNumber);
        setChangeLogs(await db.getControlPlanLogs(cpNumber));
        setView('HISTORY');
    };

    const handleAddItem = () => {
        const newItem: ControlPlanItem = {
            id: crypto.randomUUID(),
            stepNumber: '10.00',
            processName: '',
            machineDevice: '',
            charNo: (currentPlan.items?.length || 0) + 1,
            productDesc: '',
            processDesc: '',
            specialCharClass: '',
            tolerance: '',
            evaluationTechnique: '',
            sampleSize: '100%',
            frequency: 'Continuous',
            controlMethod: '',
            reactionPlan: '',
            responsibility: 'QA Engineer',
            isPokaYoke: false,
            isActive: true,
            unit: '-'
        };
        setCurrentPlan(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const handleUpdateItem = (id: string, field: keyof ControlPlanItem, value: any) => {
        setCurrentPlan(prev => ({
            ...prev,
            items: prev.items?.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const handleRemoveItem = (id: string) => {
        if (!confirm("Remove this row? For persistent plans, consider marking as Inactive instead.")) return;
        setCurrentPlan(prev => ({
            ...prev,
            items: prev.items?.filter(item => item.id !== id)
        }));
    };

    const handleInitiateSave = () => {
        if (!currentPlan.partNumber || !currentPlan.processFamily) {
            alert("Part Number and Process Family are required.");
            return;
        }
        setChangeReason('');
        setShowSaveModal(true);
    };

    const handleConfirmSave = async () => {
        if (!changeReason.trim()) {
            alert("Change Reason is mandatory for version control audit.");
            return;
        }
        setIsSaving(true);
        try {
            await db.saveControlPlan(currentPlan as ControlPlan, changeReason);
            setShowSaveModal(false);
            refreshData();
            setView('LIST');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFamilySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'OTHER_MANUAL') {
            setIsManualFamily(true);
            setCurrentPlan(prev => ({ ...prev, processFamily: '' }));
        } else {
            setIsManualFamily(false);
            setCurrentPlan(prev => ({ ...prev, processFamily: val }));
        }
    };

    const handleExportPDF = (plan: ControlPlan) => {
        generateControlPlanPDF(plan);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-700">Master Control Plans</h3>
                {view === 'LIST' && (
                    <button 
                        onClick={handleCreateNew}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Create New Plan
                    </button>
                )}
                {view !== 'LIST' && (
                     <button onClick={() => setView('LIST')} className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center">
                         <X className="w-4 h-4 mr-1" /> Close View
                     </button>
                )}
            </div>

            {view === 'LIST' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b">
                            <tr>
                                <th className="px-6 py-4 font-medium">CP Number</th>
                                <th className="px-6 py-4 font-medium">Part Number</th>
                                <th className="px-6 py-4 font-medium">Process Family</th>
                                <th className="px-6 py-4 font-medium">Ver</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {plans.map((plan) => (
                                <tr key={plan.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600">{plan.controlPlanNumber}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{plan.partNumber}</td>
                                    <td className="px-6 py-4">{plan.processFamily}</td>
                                    <td className="px-6 py-4 text-xs font-bold">V{plan.version}</td>
                                    <td className="px-6 py-4">
                                        {plan.status === PlanStatus.ACTIVE ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                                                <CheckCircle className="w-3 h-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded-full text-xs font-medium">
                                                <Archive className="w-3 h-3" /> Archived
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => handleExportPDF(plan)} className="text-gray-600 hover:text-red-600 inline-flex items-center text-xs font-medium border border-gray-200 px-2 py-1 rounded" title="Export PDF">
                                            <FileDown className="w-4 h-4 mr-1" /> PDF
                                        </button>
                                        <button onClick={() => handleViewHistory(plan.controlPlanNumber)} className="text-gray-500 hover:text-blue-600 inline-flex items-center text-xs font-medium" title="View Change Log">
                                            <History className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleCopyVersion(plan)} className="text-blue-600 hover:text-blue-800 inline-flex items-center text-xs font-medium" title="Edit / New Version">
                                            <Copy className="w-4 h-4 mr-1" /> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Same history and edit views ... */}
            {view === 'HISTORY' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                        <h4 className="font-bold text-gray-700">Change History for {selectedPlanNumber}</h4>
                    </div>
                    {changeLogs.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No history found (Legacy plans may not have logs)</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {changeLogs.map(log => (
                                <div key={log.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-slate-800">Version {log.version}</span>
                                        <span className="text-xs text-gray-500">{new Date(log.changeDate).toLocaleString()} by {log.changedBy}</span>
                                    </div>
                                    <div className="text-sm text-gray-700 mb-2">
                                        <span className="font-semibold">Reason:</span> {log.changeReason}
                                    </div>
                                    <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100">
                                        {log.changes.length > 0 ? (
                                            <ul className="list-disc pl-4">
                                                {log.changes.map((c, i) => (
                                                    <li key={i}>
                                                        <strong>{c.field}:</strong> {c.oldValue} <ArrowRight className="inline w-3 h-3" /> {c.newValue}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : "Initial Release / No detail diff available"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'EDIT' && (
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col h-[calc(100vh-140px)]">
                    {/* Header Inputs */}
                    <div className="p-6 border-b bg-gray-50 grid grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Control Plan No</label>
                            <input type="text" value={currentPlan.controlPlanNumber} onChange={e => setCurrentPlan({...currentPlan, controlPlanNumber: e.target.value})} className="w-full mt-1 p-2 border rounded text-sm" placeholder="TBL/CP/..." />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Part Number</label>
                            <input type="text" value={currentPlan.partNumber} onChange={e => setCurrentPlan({...currentPlan, partNumber: e.target.value})} className="w-full mt-1 p-2 border rounded text-sm" placeholder="Part No" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Part Name</label>
                            <input type="text" value={currentPlan.partName} onChange={e => setCurrentPlan({...currentPlan, partName: e.target.value})} className="w-full mt-1 p-2 border rounded text-sm" placeholder="Part Description" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Process Family</label>
                            {!isManualFamily ? (
                                <select 
                                    value={currentPlan.processFamily} 
                                    onChange={handleFamilySelectChange} 
                                    className="w-full mt-1 p-2 border rounded text-sm"
                                >
                                    {STANDARD_FAMILIES.map(family => (
                                        <option key={family} value={family}>{family}</option>
                                    ))}
                                    <option value="OTHER_MANUAL">Other (Type Manual)</option>
                                </select>
                            ) : (
                                <div className="flex gap-2 mt-1">
                                    <input 
                                        type="text" 
                                        value={currentPlan.processFamily} 
                                        onChange={e => setCurrentPlan({...currentPlan, processFamily: e.target.value})} 
                                        className="w-full p-2 border rounded text-sm" 
                                        placeholder="Enter Manual Process"
                                        autoFocus
                                    />
                                    <button 
                                        onClick={() => { setIsManualFamily(false); setCurrentPlan(prev => ({...prev, processFamily: STANDARD_FAMILIES[0]})) }}
                                        title="Back to List"
                                        className="p-2 text-gray-500 hover:text-blue-600"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Phase</label>
                            <div className="flex gap-2 mt-2">
                                {['PROTOTYPE', 'PRE-LAUNCH', 'PRODUCTION'].map(p => (
                                    <label key={p} className="flex items-center gap-1 text-xs cursor-pointer">
                                        <input type="radio" name="phase" checked={currentPlan.phase === p} onChange={() => setCurrentPlan({...currentPlan, phase: p as any})} /> {p}
                                    </label>
                                ))}
                            </div>
                        </div>
                         <div className="col-span-2 text-right self-end">
                            <button onClick={handleInitiateSave} className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 shadow-sm inline-flex items-center">
                                <Save className="w-4 h-4 mr-2" /> Save Version
                            </button>
                        </div>
                    </div>

                    {/* PDF Style Grid */}
                    <div className="flex-1 overflow-auto p-4">
                        <table className="min-w-[1500px] border-collapse border border-gray-300 text-xs table-fixed">
                            <thead className="bg-gray-100 text-center font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="border p-2 w-16">Step No</th>
                                    <th className="border p-2 w-32">Process Name</th>
                                    <th className="border p-2 w-24">Machine / Device</th>
                                    <th className="border p-2 w-8">No</th>
                                    <th className="border p-2 w-48">Product Char</th>
                                    <th className="border p-2 w-48">Process Char</th>
                                    <th className="border p-2 w-8">Spl</th>
                                    <th className="border p-2 w-32">Spec Text</th>
                                    <th className="border p-2 w-16 bg-yellow-50">LCL</th>
                                    <th className="border p-2 w-16 bg-yellow-50">UCL</th>
                                    <th className="border p-2 w-16 bg-blue-50">Unit</th>
                                    <th className="border p-2 w-24">Eval Method</th>
                                    <th className="border p-2 w-16">Sample</th>
                                    <th className="border p-2 w-16">Freq</th>
                                    <th className="border p-2 w-24">Control Method</th>
                                    <th className="border p-2 w-32">Reaction Plan</th>
                                    <th className="border p-2 w-24">Responsibility</th>
                                    <th className="border p-2 w-10">PY</th>
                                    <th className="border p-2 w-16">Status</th>
                                    <th className="border p-2 w-8">X</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPlan.items?.map((item) => (
                                    <tr key={item.id} className={`hover:bg-blue-50 ${!item.isActive ? 'opacity-50 bg-gray-50' : ''}`}>
                                        <td className="border p-1"><input className="w-full bg-transparent outline-none text-center" value={item.stepNumber} onChange={e => handleUpdateItem(item.id, 'stepNumber', e.target.value)} /></td>
                                        <td className="border p-1"><textarea className="w-full bg-transparent outline-none resize-none" rows={2} value={item.processName} onChange={e => handleUpdateItem(item.id, 'processName', e.target.value)} /></td>
                                        <td className="border p-1"><textarea className="w-full bg-transparent outline-none resize-none" rows={2} value={item.machineDevice} onChange={e => handleUpdateItem(item.id, 'machineDevice', e.target.value)} /></td>
                                        <td className="border p-1"><input className="w-full bg-transparent outline-none text-center" value={item.charNo} onChange={e => handleUpdateItem(item.id, 'charNo', parseInt(e.target.value))} /></td>
                                        <td className="border p-1"><textarea className="w-full bg-transparent outline-none resize-none" rows={3} value={item.productDesc} onChange={e => handleUpdateItem(item.id, 'productDesc', e.target.value)} /></td>
                                        <td className="border p-1"><textarea className="w-full bg-transparent outline-none resize-none" rows={3} value={item.processDesc} onChange={e => handleUpdateItem(item.id, 'processDesc', e.target.value)} /></td>
                                        <td className="border p-1"><input className="w-full bg-transparent outline-none text-center font-bold" value={item.specialCharClass} onChange={e => handleUpdateItem(item.id, 'specialCharClass', e.target.value)} /></td>
                                        <td className="border p-1"><textarea className="w-full bg-transparent outline-none resize-none" rows={2} value={item.tolerance} onChange={e => handleUpdateItem(item.id, 'tolerance', e.target.value)} /></td>
                                        <td className="border p-1 bg-yellow-50"><input type="number" step="0.001" className="w-full bg-transparent outline-none text-center" value={item.lsl || ''} onChange={e => handleUpdateItem(item.id, 'lsl', parseFloat(e.target.value))} placeholder="Min" /></td>
                                        <td className="border p-1 bg-yellow-50"><input type="number" step="0.001" className="w-full bg-transparent outline-none text-center" value={item.usl || ''} onChange={e => handleUpdateItem(item.id, 'usl', parseFloat(e.target.value))} placeholder="Max" /></td>
                                        <td className="border p-1 bg-blue-50"><input type="text" className="w-full bg-transparent outline-none text-center" value={item.unit || ''} onChange={e => handleUpdateItem(item.id, 'unit', e.target.value)} placeholder="Unit" /></td>
                                        <td className="border p-1"><input className="w-full bg-transparent outline-none" value={item.evaluationTechnique} onChange={e => handleUpdateItem(item.id, 'evaluationTechnique', e.target.value)} /></td>
                                        <td className="border p-1"><input className="w-full bg-transparent outline-none text-center" value={item.sampleSize} onChange={e => handleUpdateItem(item.id, 'sampleSize', e.target.value)} /></td>
                                        <td className="border p-1"><input className="w-full bg-transparent outline-none text-center" value={item.frequency} onChange={e => handleUpdateItem(item.id, 'frequency', e.target.value)} /></td>
                                        <td className="border p-1"><textarea className="w-full bg-transparent outline-none resize-none" rows={2} value={item.controlMethod} onChange={e => handleUpdateItem(item.id, 'controlMethod', e.target.value)} /></td>
                                        <td className="border p-1"><textarea className="w-full bg-transparent outline-none resize-none text-red-600" rows={2} value={item.reactionPlan} onChange={e => handleUpdateItem(item.id, 'reactionPlan', e.target.value)} /></td>
                                        <td className="border p-1">
                                            <select 
                                                className="w-full bg-transparent outline-none text-xs" 
                                                value={item.responsibility} 
                                                onChange={e => handleUpdateItem(item.id, 'responsibility', e.target.value)}
                                            >
                                                {RESPONSIBILITIES.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </td>
                                        <td className="border p-1 text-center">
                                            <input type="checkbox" checked={item.isPokaYoke} onChange={e => handleUpdateItem(item.id, 'isPokaYoke', e.target.checked)} />
                                        </td>
                                        <td className="border p-1 text-center">
                                            <button 
                                                onClick={() => handleUpdateItem(item.id, 'isActive', !item.isActive)}
                                                className={`text-[10px] px-2 py-1 rounded-full font-bold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                                            >
                                                {item.isActive ? 'ACTIVE' : 'DEACTIVE'}
                                            </button>
                                        </td>
                                        <td className="border p-1 text-center cursor-pointer hover:bg-red-100 text-red-500 font-bold" onClick={() => handleRemoveItem(item.id)}>×</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={handleAddItem} className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50 font-bold text-sm">
                            + Add New Process / Characteristic Row
                        </button>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Save New Version</h3>
                        <p className="text-sm text-gray-600 mb-4">Please provide a reason for this change. This will be logged in the audit trail.</p>
                        <textarea 
                            className="w-full border rounded p-2 text-sm mb-4" 
                            rows={3} 
                            placeholder="Reason for change..."
                            value={changeReason}
                            onChange={e => setChangeReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded" disabled={isSaving}>Cancel</button>
                            <button onClick={handleConfirmSave} className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 flex items-center gap-2" disabled={isSaving}>
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirm & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
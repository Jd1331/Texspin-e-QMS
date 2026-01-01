
import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { generateValidationPDF } from '../services/pdfGenerator';
import { ProcessValidationPlan, ValidationProcess, ValidationParameter, ValidationTrial, InspectionStatus } from '../types';
import { Award, Plus, FileDown, Trash2, ChevronDown, ChevronRight, CheckCircle, AlertTriangle, Save, RefreshCw, AlertOctagon, Clock, Copy, Eye, XCircle, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { ValidationDashboard } from './ValidationDashboard';
import { WorkflowActionModal } from '../components/WorkflowActionModal';

export const ProcessValidationModule: React.FC = () => {
    const [view, setView] = useState<'LIST' | 'ENTRY' | 'SUMMARY'>('LIST');
    const [plans, setPlans] = useState<ProcessValidationPlan[]>([]);
    const [pending, setPending] = useState<ProcessValidationPlan[]>([]);
    
    // Auth & Permissions
    const user = db.getCurrentUser();
    const isHod = user.role === 'HOD';
    const isInspector = user.role === 'INSPECTOR';
    const isAdmin = user.role === 'ADMIN';

    // Form State for Entry Mode
    const [currentPlan, setCurrentPlan] = useState<Partial<ProcessValidationPlan>>({
        processes: []
    });
    
    // Viewing State
    const [viewingPlan, setViewingPlan] = useState<ProcessValidationPlan | null>(null);
    
    // Expanded State for UI Accordions
    const [expandedProcesses, setExpandedProcesses] = useState<string[]>([]);
    
    // Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, type: 'APPROVE' | 'REJECT', recordId: string } | null>(null);

    useEffect(() => {
        refresh();
    }, [view]);

    const refresh = () => {
        setPlans(db.getValidationPlans());
        if (isHod) {
            setPending(db.getPendingValidations());
        }
    };

    // --- FORM MANAGEMENT ---
    
    const handleInitNew = () => {
        setCurrentPlan({
            id: crypto.randomUUID(),
            partNumber: '',
            partName: '',
            lineMachineNo: '',
            validationType: 'INITIAL',
            controlPlanRef: '',
            validationDate: new Date().toISOString().split('T')[0],
            frequencyMonths: 1, // Default
            processes: [],
            status: InspectionStatus.DRAFT
        });
        setExpandedProcesses([]);
        setViewingPlan(null);
        setView('ENTRY');
    };

    const handleReValidate = (oldPlan: ProcessValidationPlan) => {
        // Only Inspectors can initiate validation
        if (!isInspector) return;

        // Deep clone logic to carry over Process/Params but RESET Data
        const clonedProcesses = oldPlan.processes.map(p => ({
            ...p,
            id: crypto.randomUUID(),
            parameters: p.parameters.map(param => ({
                ...param,
                id: crypto.randomUUID(),
                trials: [] // Clear trials for new validation
            }))
        }));

        setCurrentPlan({
            id: crypto.randomUUID(),
            partNumber: oldPlan.partNumber,
            partName: oldPlan.partName,
            lineMachineNo: oldPlan.lineMachineNo,
            validationType: 'RE-VALIDATION',
            controlPlanRef: oldPlan.controlPlanRef,
            validationDate: new Date().toISOString().split('T')[0],
            frequencyMonths: oldPlan.frequencyMonths || 1,
            processes: clonedProcesses,
            status: InspectionStatus.DRAFT
        });
        setExpandedProcesses([]);
        setViewingPlan(null);
        setView('ENTRY');
    };

    const handleView = (plan: ProcessValidationPlan) => {
        setCurrentPlan(plan);
        setViewingPlan(plan);
        setExpandedProcesses(plan.processes.map(p => p.id));
        setView('ENTRY');
    };

    const handleAddProcess = () => {
        const newProcess: ValidationProcess = {
            id: crypto.randomUUID(),
            processName: '',
            parameters: []
        };
        setCurrentPlan(prev => ({ ...prev, processes: [...(prev.processes || []), newProcess] }));
        setExpandedProcesses(prev => [...prev, newProcess.id]);
    };

    const handleAddParameter = (processId: string) => {
        const newParam: ValidationParameter = {
            id: crypto.randomUUID(),
            name: '',
            specification: '',
            unit: '',
            trials: []
        };
        setCurrentPlan(prev => ({
            ...prev,
            processes: prev.processes?.map(p => 
                p.id === processId ? { ...p, parameters: [...p.parameters, newParam] } : p
            )
        }));
    };

    const handleAddTrial = (processId: string, paramId: string) => {
        const process = currentPlan.processes?.find(p => p.id === processId);
        const param = process?.parameters.find(par => par.id === paramId);
        const nextNo = (param?.trials.length || 0) + 1;

        const newTrial: ValidationTrial = {
            id: crypto.randomUUID(),
            trialNo: nextNo,
            readings: [null, null, null, null, null],
            observation: '',
            status: 'OK'
        };

        setCurrentPlan(prev => ({
            ...prev,
            processes: prev.processes?.map(p => 
                p.id === processId ? { 
                    ...p, 
                    parameters: p.parameters.map(par => 
                        par.id === paramId ? { ...par, trials: [...par.trials, newTrial] } : par
                    ) 
                } : p
            )
        }));
    };

    // --- UPDATE HANDLERS ---

    const updateProcessName = (procId: string, name: string) => {
        if(viewingPlan) return;
        setCurrentPlan(prev => ({
            ...prev,
            processes: prev.processes?.map(p => p.id === procId ? { ...p, processName: name } : p)
        }));
    };

    const updateParamField = (procId: string, paramId: string, field: keyof ValidationParameter, val: any) => {
        if(viewingPlan) return;
        setCurrentPlan(prev => ({
            ...prev,
            processes: prev.processes?.map(p => 
                p.id === procId ? {
                    ...p,
                    parameters: p.parameters.map(par => 
                        par.id === paramId ? { ...par, [field]: val } : par
                    )
                } : p
            )
        }));
    };

    // Auto Calculate Status when readings change
    const checkStatus = (readings: (number|null)[], lsl?: number, usl?: number): 'OK' | 'NG' => {
        if (lsl === undefined || usl === undefined) return 'OK';
        const validReadings = readings.filter(r => r !== null) as number[];
        if (validReadings.length === 0) return 'OK';
        
        const min = Math.min(...validReadings);
        const max = Math.max(...validReadings);
        
        if (min < lsl || max > usl) return 'NG';
        return 'OK';
    };

    const updateTrialReading = (procId: string, paramId: string, trialId: string, index: number, valStr: string) => {
        if(viewingPlan) return;
        const val = valStr === '' ? null : parseFloat(valStr);
        
        setCurrentPlan(prev => {
            const newProcesses = prev.processes?.map(p => {
                if (p.id !== procId) return p;
                return {
                    ...p,
                    parameters: p.parameters.map(par => {
                        if (par.id !== paramId) return par;
                        return {
                            ...par,
                            trials: par.trials.map(t => {
                                if (t.id !== trialId) return t;
                                const newReadings = [...t.readings] as [number|null, number|null, number|null, number|null, number|null];
                                newReadings[index] = val;
                                return {
                                    ...t,
                                    readings: newReadings,
                                    status: checkStatus(newReadings, par.lsl, par.usl)
                                };
                            })
                        };
                    })
                };
            });
            return { ...prev, processes: newProcesses };
        });
    };

    const updateTrialField = (procId: string, paramId: string, trialId: string, field: keyof ValidationTrial, val: any) => {
        if(viewingPlan) return;
        setCurrentPlan(prev => ({
            ...prev,
            processes: prev.processes?.map(p => 
                p.id === procId ? {
                    ...p,
                    parameters: p.parameters.map(par => 
                        par.id === paramId ? { 
                            ...par, 
                            trials: par.trials.map(t => t.id === trialId ? { ...t, [field]: val } : t)
                        } : par
                    )
                } : p
            )
        }));
    };

    const handleSave = () => {
        if (!isInspector) {
            alert("Permission Denied: Only Inspectors can create and submit validation plans.");
            return;
        }

        if (!currentPlan.partNumber || !currentPlan.processes || currentPlan.processes.length === 0) {
            alert("Please enter Part Number and add at least one Process.");
            return;
        }

        const planToSave: ProcessValidationPlan = {
            ...currentPlan,
            validatedBy: db.getCurrentUser().name,
            // Status handled by backend on save (force SUBMITTED)
        } as ProcessValidationPlan;

        try {
            db.saveValidationPlan(planToSave);
            alert("Validation Plan Submitted for Approval!");
            setView('LIST');
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleApprovalAction = async (remark: string) => {
        if (!actionModal) return;
        const status = actionModal.type === 'APPROVE' ? InspectionStatus.APPROVED : InspectionStatus.REJECTED;
        await db.approveValidationPlan(actionModal.recordId, status, remark);
        setActionModal(null);
        refresh();
        if (viewingPlan) setView('LIST');
    };

    // --- RENDER HELPERS ---
    const toggleAccordion = (id: string) => {
        if (expandedProcesses.includes(id)) {
            setExpandedProcesses(expandedProcesses.filter(pid => pid !== id));
        } else {
            setExpandedProcesses([...expandedProcesses, id]);
        }
    };
    
    const getStatusBadge = (plan: ProcessValidationPlan) => {
        const valStatus = db.getValidationStatus(plan);
        // Show Approval Status first if pending/rejected
        if (plan.status === InspectionStatus.SUBMITTED) return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Pending Approval</span>;
        if (plan.status === InspectionStatus.REJECTED) return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Rejected</span>;

        // If Approved, show validity
        if (valStatus === 'OVERDUE') {
            return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold"><AlertOctagon className="w-3 h-3"/> Overdue</span>;
        } else if (valStatus === 'DUE_SOON') {
             return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-bold"><Clock className="w-3 h-3"/> Due Soon</span>;
        }
        return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle className="w-3 h-3"/> Valid</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <Award className="w-6 h-6 text-blue-600" />
                    Process Validation (Assembly Line SC)
                </h3>
                <div className="flex gap-2">
                    {view === 'LIST' && (
                        <>
                            <button onClick={() => setView('SUMMARY')} className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 shadow-sm font-medium text-sm">
                                <AlertOctagon className="w-4 h-4" /> Mgmt. Summary
                            </button>
                            {isInspector && (
                                <button onClick={handleInitNew} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow-sm font-medium text-sm">
                                    <Plus className="w-4 h-4" /> New Validation
                                </button>
                            )}
                        </>
                    )}
                    {view === 'SUMMARY' && (
                        <button onClick={() => setView('LIST')} className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 shadow-sm">
                            Back to List
                        </button>
                    )}
                </div>
            </div>

            {view === 'SUMMARY' && (
                <ValidationDashboard />
            )}

            {view === 'LIST' && (
                <div className="space-y-6">
                    {/* HOD Pending Queue */}
                    {isHod && pending.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 animate-in fade-in">
                            <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-3">
                                <ShieldCheck className="w-5 h-5" /> Pending Validations ({pending.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pending.map(rec => (
                                    <div key={rec.id} className="bg-white p-4 rounded-lg border shadow-sm flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-800">{rec.partNumber}</div>
                                            <div className="text-xs text-gray-500">{rec.lineMachineNo} | {rec.validationDate}</div>
                                            <div className="text-xs text-blue-600 mt-1 font-medium">By: {rec.validatedBy}</div>
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
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Part No / Name</th>
                                    <th className="p-4">Line / Machine</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {plans.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-500">{p.validationDate}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{p.partNumber}</div>
                                            <div className="text-xs text-gray-400">{p.partName}</div>
                                        </td>
                                        <td className="p-4">{p.lineMachineNo}</td>
                                        <td className="p-4"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded font-bold">{p.validationType}</span></td>
                                        <td className="p-4">{getStatusBadge(p)}</td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {p.status === InspectionStatus.APPROVED && isInspector && (
                                                <button onClick={() => handleReValidate(p)} className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded inline-flex items-center text-xs font-medium border border-orange-200">
                                                    <RefreshCw className="w-3 h-3 mr-1" /> Re-Validate
                                                </button>
                                            )}
                                            <button onClick={() => generateValidationPDF(p)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded inline-flex items-center text-xs font-medium border border-blue-200">
                                                <FileDown className="w-3 h-3 mr-1" /> PDF
                                            </button>
                                            <button onClick={() => handleView(p)} className="text-gray-500 hover:text-blue-600 px-2 py-1 inline-flex items-center text-xs font-medium">
                                                <Eye className="w-3 h-3 mr-1" /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'ENTRY' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[calc(100vh-180px)] relative">
                    {/* Access Control Overlay for Non-Inspectors trying to Create/Edit */}
                    {!viewingPlan && !isInspector && (
                         <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center rounded-xl">
                            <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-200 text-center max-w-md">
                                <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-800">Restricted Access</h3>
                                <p className="text-gray-500 mt-2 text-sm">Only <strong>Inspectors</strong> can create or edit Process Validation records.</p>
                                <button onClick={() => setView('LIST')} className="mt-4 text-blue-600 font-bold hover:underline">Return to List</button>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="p-6 border-b bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                             <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {viewingPlan ? 'Validation Plan Details' : 'New Validation Plan'}
                                </h3>
                                {viewingPlan && (
                                    <div className="flex gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${viewingPlan.status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-700' : viewingPlan.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                                            Status: {viewingPlan.status}
                                        </span>
                                        {viewingPlan.status === 'REJECTED' && <span className="text-xs text-red-600 font-medium">Reason: {viewingPlan.rejectionRemark}</span>}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {isHod && viewingPlan?.status === 'SUBMITTED' && (
                                    <>
                                        <button onClick={() => setActionModal({ isOpen: true, type: 'APPROVE', recordId: viewingPlan.id })} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1">
                                            <CheckCircle className="w-4 h-4" /> Approve
                                        </button>
                                        <button onClick={() => setActionModal({ isOpen: true, type: 'REJECT', recordId: viewingPlan.id })} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1">
                                            <XCircle className="w-4 h-4" /> Reject
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setView('LIST')} className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center">
                                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Part Number</label>
                                <input disabled={!!viewingPlan} className="w-full mt-1 border p-2 rounded text-sm disabled:bg-gray-100" value={currentPlan.partNumber} onChange={e => setCurrentPlan({...currentPlan, partNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Part Name</label>
                                <input disabled={!!viewingPlan} className="w-full mt-1 border p-2 rounded text-sm disabled:bg-gray-100" value={currentPlan.partName} onChange={e => setCurrentPlan({...currentPlan, partName: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Machine / Line</label>
                                <input disabled={!!viewingPlan} className="w-full mt-1 border p-2 rounded text-sm disabled:bg-gray-100" value={currentPlan.lineMachineNo} onChange={e => setCurrentPlan({...currentPlan, lineMachineNo: e.target.value})} />
                            </div>
                            <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Validation Type</label>
                                 <select disabled={!!viewingPlan} className="w-full mt-1 border p-2 rounded text-sm disabled:bg-gray-100" value={currentPlan.validationType} onChange={e => setCurrentPlan({...currentPlan, validationType: e.target.value as any})}>
                                     <option value="INITIAL">Initial</option>
                                     <option value="RE-VALIDATION">Re-Validation</option>
                                 </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Re-Validation Freq (Months)</label>
                                <input disabled={!!viewingPlan} type="number" className="w-full mt-1 border p-2 rounded text-sm disabled:bg-gray-100" value={currentPlan.frequencyMonths} onChange={e => setCurrentPlan({...currentPlan, frequencyMonths: parseInt(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        {currentPlan.processes?.map((proc, pIdx) => (
                            <div key={proc.id} className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                {/* Process Header (Accordion) */}
                                <div className="p-4 bg-gray-100 flex items-center justify-between cursor-pointer" onClick={() => toggleAccordion(proc.id)}>
                                    <div className="flex items-center gap-2 flex-1">
                                        {expandedProcesses.includes(proc.id) ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                                        <input 
                                            disabled={!!viewingPlan}
                                            className="bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none font-bold text-lg text-slate-800 w-1/2 disabled:border-none" 
                                            placeholder="Enter Process Name (e.g. 10.10 Ball Filling)"
                                            value={proc.processName}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => updateProcessName(proc.id, e.target.value)}
                                        />
                                    </div>
                                    {!viewingPlan && (
                                        <button onClick={(e) => {e.stopPropagation(); handleAddParameter(proc.id)}} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded border border-blue-200 font-bold hover:bg-blue-100">
                                            + Add Parameter
                                        </button>
                                    )}
                                </div>

                                {/* Parameters List */}
                                {expandedProcesses.includes(proc.id) && (
                                    <div className="p-4 space-y-6">
                                        {proc.parameters.length === 0 && <p className="text-gray-400 text-sm text-center italic">No parameters added yet.</p>}
                                        
                                        {proc.parameters.map((param, paramIdx) => (
                                            <div key={param.id} className="border rounded-md p-4 relative">
                                                {/* Parameter Def */}
                                                <div className="grid grid-cols-6 gap-3 mb-4 items-end">
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Parameter Name</label>
                                                        <input disabled={!!viewingPlan} className="w-full border-b font-medium text-sm outline-none disabled:bg-gray-50" placeholder="Name" value={param.name} onChange={e => updateParamField(proc.id, param.id, 'name', e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Specification</label>
                                                        <input disabled={!!viewingPlan} className="w-full border-b text-sm outline-none disabled:bg-gray-50" placeholder="Range/Spec" value={param.specification} onChange={e => updateParamField(proc.id, param.id, 'specification', e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Unit</label>
                                                        <input disabled={!!viewingPlan} className="w-full border-b text-sm outline-none disabled:bg-gray-50" placeholder="Unit" value={param.unit} onChange={e => updateParamField(proc.id, param.id, 'unit', e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Min (LSL)</label>
                                                        <input disabled={!!viewingPlan} type="number" className="w-full border-b text-sm outline-none disabled:bg-gray-50" placeholder="Num" value={param.lsl || ''} onChange={e => updateParamField(proc.id, param.id, 'lsl', parseFloat(e.target.value))} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-gray-400">Max (USL)</label>
                                                        <input disabled={!!viewingPlan} type="number" className="w-full border-b text-sm outline-none disabled:bg-gray-50" placeholder="Num" value={param.usl || ''} onChange={e => updateParamField(proc.id, param.id, 'usl', parseFloat(e.target.value))} />
                                                    </div>
                                                </div>

                                                {/* Trials Grid */}
                                                <div className="bg-gray-50 p-3 rounded">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Trial Data (M1 - M5)</span>
                                                        {!viewingPlan && (
                                                            <button onClick={() => handleAddTrial(proc.id, param.id)} className="text-[10px] text-blue-600 font-bold hover:underline">+ Add Trial</button>
                                                        )}
                                                    </div>
                                                    
                                                    {param.trials.length > 0 && (
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="text-gray-400 text-left">
                                                                    <th className="font-normal w-12">No.</th>
                                                                    <th className="font-normal text-center">M1</th>
                                                                    <th className="font-normal text-center">M2</th>
                                                                    <th className="font-normal text-center">M3</th>
                                                                    <th className="font-normal text-center">M4</th>
                                                                    <th className="font-normal text-center">M5</th>
                                                                    <th className="font-normal pl-2 w-32">Observation</th>
                                                                    <th className="font-normal pl-2 w-20">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-200">
                                                                {param.trials.map((trial, tIdx) => (
                                                                    <tr key={trial.id}>
                                                                        <td className="py-1 font-bold">{trial.trialNo}</td>
                                                                        {[0,1,2,3,4].map(idx => (
                                                                            <td key={idx} className="p-1">
                                                                                <input 
                                                                                    type="number" 
                                                                                    disabled={!!viewingPlan}
                                                                                    className="w-full text-center border rounded p-1 disabled:bg-gray-100"
                                                                                    value={trial.readings[idx] === null ? '' : trial.readings[idx]!}
                                                                                    onChange={e => updateTrialReading(proc.id, param.id, trial.id, idx, e.target.value)}
                                                                                />
                                                                            </td>
                                                                        ))}
                                                                        <td className="p-1">
                                                                            <input disabled={!!viewingPlan} className="w-full border rounded p-1 disabled:bg-gray-100" value={trial.observation} onChange={e => updateTrialField(proc.id, param.id, trial.id, 'observation', e.target.value)} placeholder="Remark" />
                                                                        </td>
                                                                        <td className="p-1">
                                                                             <div className={`flex items-center gap-1 font-bold ${trial.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
                                                                                 {trial.status === 'OK' ? <CheckCircle className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                                                                                 {trial.status}
                                                                             </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {!viewingPlan && (
                            <div className="space-y-4">
                                <button onClick={handleAddProcess} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:bg-white hover:border-blue-400 hover:text-blue-600 transition">
                                    + Add Assembly Process
                                </button>
                                <div className="flex justify-end pt-4 border-t">
                                     <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 shadow-sm inline-flex items-center">
                                         <Save className="w-4 h-4 mr-2" /> Submit Validation
                                     </button>
                                </div>
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

import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { generateInspectionPDF } from '../services/pdfGenerator';
import { ControlPlan, InspectionRecord, ControlPlanItem, InspectionStatus, UserRole } from '../types';
import { AlertCircle, CheckCircle, Save, Clock, History, Eye, X, FileDown, ArrowLeft, User, ShieldCheck, Loader2, Lock } from 'lucide-react';

const STANDARD_FAMILIES = [
    "Receiving",
    "Heat Treatment",
    "DG",
    "CG",
    "Grinding",
    "Assembly",
    "Pre-Dispatch"
];

export const InspectionModule: React.FC = () => {
    // Current User - Strictly from Session
    const currentUser = db.getCurrentUser();

    // Selection State
    const [partNo, setPartNo] = useState('');
    const [processFamily, setProcessFamily] = useState('Assembly');
    const [activePlan, setActivePlan] = useState<ControlPlan | null>(null);
    const [inspectionType, setInspectionType] = useState<'PATROL' | 'FIRST_PART' | 'PRE_DISPATCH'>('PATROL');

    // Execution State
    const [readings, setReadings] = useState<InspectionRecord['readings']>({});
    const [submittedRecord, setSubmittedRecord] = useState<InspectionRecord | null>(null);
    const [patrollingAlert, setPatrollingAlert] = useState<string | null>(null);
    const [filteredItems, setFilteredItems] = useState<ControlPlanItem[]>([]);

    // History State
    const [history, setHistory] = useState<InspectionRecord[]>([]);
    
    // View Details State
    const [viewingRecord, setViewingRecord] = useState<InspectionRecord | null>(null);

    // HOD Approval State
    const [pendingApprovals, setPendingApprovals] = useState<InspectionRecord[]>([]);
    
    // Action Modals State
    const [rejectionRemark, setRejectionRemark] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    
    const [approvalRemark, setApprovalRemark] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    
    const [selectedForAction, setSelectedForAction] = useState<InspectionRecord | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Initial Load
    useEffect(() => {
        const parts = db.getUniqueParts();
        if (parts.length > 0) setPartNo(parts[0]);
        refreshData();
    }, [currentUser]);

    const refreshData = () => {
        setHistory(db.getInspectionHistory());
        if (currentUser.role === 'HOD') {
            setPendingApprovals(db.getPendingInspections());
        }
    };

    // Check Patrolling Status
    useEffect(() => {
        if (partNo && processFamily && inspectionType === 'PATROL') {
            const lastTime = db.getLastInspectionTime(partNo, processFamily, 'PATROL');
            if (lastTime) {
                const diffMs = new Date().getTime() - lastTime.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                if (diffHours >= 2) {
                    setPatrollingAlert(`Patrolling Inspection Due! Last inspection was ${diffHours.toFixed(1)} hours ago.`);
                } else {
                    setPatrollingAlert(null);
                }
            } else {
                 setPatrollingAlert("First Patrolling Inspection Required.");
            }
        } else {
            setPatrollingAlert(null);
        }
    }, [partNo, processFamily, inspectionType]);

    const handleLoadPlan = () => {
        const plan = db.getActiveControlPlan(partNo, processFamily);
        if (plan) {
            setActivePlan(plan);
            
            // FULL LOAD: Filter only Active items and Sort by Step Number
            const activeItems = plan.items
                .filter(i => i.isActive)
                .sort((a, b) => a.stepNumber.localeCompare(b.stepNumber));

            setFilteredItems(activeItems);
            
            // Init Readings
            const initialReadings: InspectionRecord['readings'] = {};
            activeItems.forEach(item => {
                initialReadings[item.id] = {
                    values: [null, null, null, null, null],
                    result: 'OK',
                    specSnapshot: item.tolerance,
                    remark: ''
                };
            });
            setReadings(initialReadings);
            
            setSubmittedRecord(null);
            setViewingRecord(null);
        } else {
            alert("No Active Control Plan found for this Part/Process!");
            setActivePlan(null);
            setFilteredItems([]);
        }
    };

    const handleViewRecord = (record: InspectionRecord) => {
        const plan = db.getControlPlanById(record.controlPlanId);
        if (plan) {
            setActivePlan(plan);
            const activeItems = plan.items
                .filter(i => i.isActive)
                .sort((a, b) => a.stepNumber.localeCompare(b.stepNumber));
            setFilteredItems(activeItems);

            setReadings(JSON.parse(JSON.stringify(record.readings)));
            setViewingRecord(record);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Original Control Plan Version missing.");
        }
    };

    const handleDownloadReport = (record: InspectionRecord) => {
        const plan = db.getControlPlanById(record.controlPlanId);
        if (plan) {
            generateInspectionPDF(record, plan);
        } else {
             alert("Control Plan not found for PDF generation.");
        }
    };

    const handleCloseView = () => {
        setViewingRecord(null);
        setSubmittedRecord(null);
        setReadings({});
        setActivePlan(null);
        refreshData();
    };

    const calculateResult = (values: (number | null)[], item: ControlPlanItem): 'OK' | 'NG' => {
        if (item.lsl !== undefined && item.usl !== undefined) {
             const validValues = values.filter(v => v !== null) as number[];
             if (validValues.length === 0) return 'OK';
             const isNg = validValues.some(v => v < (item.lsl as number) || v > (item.usl as number));
             return isNg ? 'NG' : 'OK';
        }
        return 'OK';
    };

    const handleValueChange = (itemId: string, index: number, inputVal: string) => {
        if (viewingRecord || submittedRecord) return; 
        const newVal = inputVal === '' ? null : parseFloat(inputVal);

        setReadings(prev => {
            const current = prev[itemId] || { values: [null,null,null,null,null], result: 'OK', specSnapshot: '', remark: ''};
            const newValues = [...current.values];
            newValues[index] = newVal;
            
            const item = filteredItems.find(i => i.id === itemId);
            const newResult = item ? calculateResult(newValues, item) : current.result;

            return {
                ...prev,
                [itemId]: { ...current, values: newValues, result: newResult }
            };
        });
    };

    const toggleResult = (itemId: string) => {
        if (viewingRecord || submittedRecord) return; 
        const item = filteredItems.find(i => i.id === itemId);
        if (item && item.lsl === undefined && item.usl === undefined) {
            setReadings(prev => ({
                ...prev,
                [itemId]: { ...prev[itemId], result: prev[itemId].result === 'OK' ? 'NG' : 'OK' }
            }));
        } else {
            alert("Auto-judgment active for numeric characteristics.");
        }
    };

    const handleRemarkChange = (itemId: string, text: string) => {
         if (viewingRecord || submittedRecord) return;
         setReadings(prev => ({ ...prev, [itemId]: { ...prev[itemId], remark: text } }));
    };

    const handleSubmit = () => {
        if (viewingRecord) return;
        if (!activePlan) return;
        if (currentUser.role !== 'INSPECTOR') return; // Enforce Role

        for (const item of filteredItems) {
            const r = readings[item.id];
            if (r.values.some(v => v === null)) {
                alert(`Missing readings for Step ${item.stepNumber}. Please enter 0 or valid number.`);
                return;
            }
        }

        let overallResult: 'OK' | 'NG' = 'OK';
        filteredItems.forEach(item => {
            if (readings[item.id]?.result === 'NG') overallResult = 'NG';
        });

        const newId = crypto.randomUUID();
        const record: InspectionRecord = {
            id: newId,
            controlPlanId: activePlan.id,
            partNumber: activePlan.partNumber,
            processFamily: activePlan.processFamily,
            operationStep: "Full Process",
            type: inspectionType,
            inspectorName: currentUser.name,
            inspectorId: currentUser.id, // Traceability Binding
            timestamp: new Date().toISOString(),
            readings: readings,
            overallResult: overallResult,
            year: new Date().getFullYear(),
            status: InspectionStatus.SUBMITTED
        };

        try {
            db.saveInspection(record);
            setSubmittedRecord(record); 
            refreshData();
        } catch (e: any) {
            alert(e.message);
        }
    };

    // --- APPROVAL WORKFLOW HANDLERS ---

    const handleApproveClick = (record: InspectionRecord) => {
        // Prepare Modal
        setSelectedForAction(record);
        setApprovalRemark(''); // Clear previous
        setShowApproveModal(true);
    };

    const submitApproval = async () => {
        if (!selectedForAction) return;
        
        if (!approvalRemark.trim()) {
            alert("Approval Remark is mandatory.");
            return;
        }

        setIsProcessing(true);
        try {
            // Explicit call with Remark
            const updatedRecord = db.approveInspection(selectedForAction.id, InspectionStatus.APPROVED, approvalRemark);
            
            // Immediate feedback
            alert("✓ Success! Inspection Approved.");
            setShowApproveModal(false);
            
            // Refresh List (removes the item from Pending)
            refreshData();
            
            // If the user was viewing this record, update the view to show new status (Approved)
            if(viewingRecord?.id === selectedForAction.id) {
                setViewingRecord(updatedRecord);
            }
        } catch (error: any) {
            console.error("Approve Error:", error);
            alert(`Approval Failed: ${error.message}`);
        } finally {
            setIsProcessing(false);
            setSelectedForAction(null);
        }
    };

    const handleRejectClick = (record: InspectionRecord) => {
        setSelectedForAction(record);
        setRejectionRemark('');
        setShowRejectModal(true);
    };

    const submitRejection = () => {
        if (!selectedForAction) return;
        
        if (!rejectionRemark.trim()) {
            alert("Rejection Remark is mandatory.");
            return;
        }

        setIsProcessing(true);
        try {
            const updatedRecord = db.approveInspection(selectedForAction.id, InspectionStatus.REJECTED, rejectionRemark);
            alert("✓ Inspection Rejected.");
            setShowRejectModal(false);
            
            // Refresh lists
            refreshData();
            
            // Update view if open
            if(viewingRecord?.id === selectedForAction.id) {
                setViewingRecord(updatedRecord);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
            setSelectedForAction(null);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* HOD Pending Section */}
            {currentUser.role === 'HOD' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-5 h-5" /> Pending Approvals ({pendingApprovals.length})
                    </h3>
                    {pendingApprovals.length === 0 ? <p className="text-sm text-yellow-700">No inspections pending your approval.</p> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingApprovals.map(rec => (
                                <div key={rec.id} className="bg-white p-4 rounded border shadow-sm relative">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-800">{rec.partNumber}</div>
                                            <div className="text-xs text-gray-500">{rec.processFamily} | {new Date(rec.timestamp).toLocaleDateString()}</div>
                                            <div className="text-xs font-medium text-slate-600 mt-1">Inspector: {rec.inspectorName}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleViewRecord(rec)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></button>
                                            <button 
                                                onClick={() => handleApproveClick(rec)} 
                                                className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 flex items-center gap-1 disabled:opacity-50 transition shadow-sm" 
                                                title="Approve"
                                                disabled={isProcessing}
                                            >
                                                ✅ Approve
                                            </button>
                                            <button 
                                                onClick={() => handleRejectClick(rec)} 
                                                className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 transition shadow-sm" 
                                                title="Reject"
                                                disabled={isProcessing}
                                            >
                                                ❌ Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Main Inspection View */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
                
                {/* View-Only Overlay for Non-Inspectors (HOD & ADMIN) */}
                {!viewingRecord && !submittedRecord && currentUser.role !== 'INSPECTOR' && (
                    <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
                        <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-200 text-center max-w-md">
                            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">Inspection Creation Restricted</h3>
                            <p className="text-gray-500 mt-2">You are logged in as <strong>{currentUser.role}</strong>.</p>
                            <p className="text-gray-500 text-sm">Only <strong>Inspectors</strong> can create new inspection records. You have read-only access to view history and details.</p>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-700">
                        {viewingRecord ? "Record Details" : "New Inspection"}
                    </h3>
                    {(viewingRecord || submittedRecord) && (
                         <button onClick={handleCloseView} className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </button>
                    )}
                </div>

                {/* Viewing Mode Info Header */}
                {(viewingRecord || submittedRecord) ? (
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded border border-blue-100 mb-6">
                        <div>
                            <p className="text-sm font-bold text-slate-700">Record ID: {(viewingRecord || submittedRecord)?.id.substring(0,8)}</p>
                            <div className="flex gap-2 mt-1">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${(viewingRecord || submittedRecord)?.overallResult === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    Result: {(viewingRecord || submittedRecord)?.overallResult}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-bold 
                                    ${(viewingRecord || submittedRecord)?.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                      (viewingRecord || submittedRecord)?.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    Status: {(viewingRecord || submittedRecord)?.status}
                                </span>
                            </div>
                            {(viewingRecord || submittedRecord)?.status === 'REJECTED' && (
                                <p className="text-xs text-red-600 mt-1 font-bold">Reason: {(viewingRecord || submittedRecord)?.rejectionRemark}</p>
                            )}
                            {(viewingRecord || submittedRecord)?.status === 'APPROVED' && (viewingRecord || submittedRecord)?.approvalRemark && (
                                <p className="text-xs text-green-700 mt-1 font-bold">Remark: {(viewingRecord || submittedRecord)?.approvalRemark}</p>
                            )}
                        </div>
                        <button 
                            onClick={() => handleDownloadReport(viewingRecord || submittedRecord!)} 
                            className="bg-blue-600 text-white border border-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 flex items-center shadow-sm"
                        >
                            <FileDown className="w-4 h-4 mr-2" /> Download PDF
                        </button>
                    </div>
                ) : (
                    // Creation Mode Inputs
                    <div className="grid grid-cols-6 gap-4 items-end mb-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Inspection Type</label>
                            <select 
                                value={inspectionType} 
                                onChange={e => setInspectionType(e.target.value as any)} 
                                className="w-full mt-1 border p-2 rounded text-sm bg-blue-50 border-blue-200 text-blue-900 font-medium"
                            >
                                <option value="PATROL">In-Process / Patrolling</option>
                                <option value="FIRST_PART">First Part (FPI)</option>
                                <option value="PRE_DISPATCH">Pre-Dispatch</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Part Number</label>
                            <select value={partNo} onChange={e => setPartNo(e.target.value)} className="w-full mt-1 border p-2 rounded text-sm">
                                {db.getUniqueParts().map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase">Process Family</label>
                            <select value={processFamily} onChange={e => setProcessFamily(e.target.value)} className="w-full mt-1 border p-2 rounded text-sm">
                                {STANDARD_FAMILIES.map(family => <option key={family} value={family}>{family}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-semibold text-gray-500 uppercase">Inspector</label>
                             <input type="text" disabled value={currentUser.name} className="w-full mt-1 border p-2 rounded text-sm bg-gray-100 text-gray-600 cursor-not-allowed font-bold" />
                        </div>
                        <div>
                            <button onClick={handleLoadPlan} className="w-full bg-slate-800 text-white px-4 py-2 rounded font-medium hover:bg-slate-700 text-sm">
                                Load Plan
                            </button>
                        </div>
                    </div>
                )}

                {/* Inspection Table */}
                {activePlan && filteredItems.length > 0 && (
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                <tr>
                                    <th className="p-2 text-left w-16">Step</th>
                                    <th className="p-2 text-left w-1/4">Characteristic</th>
                                    <th className="p-2 text-center w-16 bg-gray-50">LCL</th>
                                    <th className="p-2 text-center w-16 bg-gray-50">UCL</th>
                                    <th className="p-2 text-center w-16">Unit</th>
                                    <th className="p-2 text-center" colSpan={5}>Readings (5 Samples)</th>
                                    <th className="p-2 text-center w-24">Result</th>
                                    <th className="p-2 text-left w-1/5">Remark</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map(item => {
                                    const reading = readings[item.id];
                                    if (!reading) return null;
                                    const isAutoCalc = item.lsl !== undefined && item.usl !== undefined;
                                    const isReadOnly = !!viewingRecord || !!submittedRecord || currentUser.role !== 'INSPECTOR';

                                    return (
                                        <tr key={item.id} className={reading.result === 'NG' ? 'bg-red-50' : ''}>
                                            <td className="p-2 align-middle font-mono text-gray-500 text-xs">{item.stepNumber}</td>
                                            <td className="p-2 align-middle">
                                                <div className="font-bold text-slate-800 text-xs">{item.productDesc || item.processName}</div>
                                                <div className="text-[10px] text-gray-500">{item.evaluationTechnique}</div>
                                            </td>
                                            <td className="p-2 align-middle text-center text-xs bg-gray-50 font-mono">
                                                {item.lsl ?? '-'}
                                            </td>
                                            <td className="p-2 align-middle text-center text-xs bg-gray-50 font-mono">
                                                {item.usl ?? '-'}
                                            </td>
                                            <td className="p-2 align-middle text-center text-xs text-gray-500">
                                                {item.unit ?? '-'}
                                            </td>
                                            {/* Reading Cells - Split individually for clarity */}
                                            {[0,1,2,3,4].map(idx => (
                                                <td key={idx} className="p-1 align-middle">
                                                    <input 
                                                        type="number"
                                                        step="0.001"
                                                        disabled={isReadOnly}
                                                        className={`w-12 p-1 border rounded text-center text-xs ${isReadOnly ? 'bg-gray-100 text-gray-700' : ''} ${reading.values[idx] === null ? 'bg-yellow-50 border-yellow-200' : ''}`}
                                                        placeholder="-"
                                                        value={reading.values[idx] === null ? '' : reading.values[idx]!}
                                                        onChange={e => handleValueChange(item.id, idx, e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-2 align-middle text-center">
                                                <button 
                                                    onClick={() => toggleResult(item.id)}
                                                    disabled={isAutoCalc || isReadOnly}
                                                    className={`px-2 py-1 rounded font-bold text-[10px] border ${reading.result === 'OK' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'} ${(isAutoCalc || isReadOnly) ? 'cursor-not-allowed opacity-80' : ''}`}
                                                >
                                                    {reading.result}
                                                </button>
                                            </td>
                                            <td className="p-2 align-middle">
                                                <textarea disabled={isReadOnly} className={`w-full text-xs p-1 border rounded resize-none ${isReadOnly ? 'bg-gray-100' : ''}`} rows={1} value={reading.remark} onChange={e => handleRemarkChange(item.id, e.target.value)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                 {!viewingRecord && !submittedRecord && activePlan && currentUser.role === 'INSPECTOR' && (
                     <div className="p-4 bg-gray-50 border-t flex justify-end">
                        <button onClick={handleSubmit} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-lg">
                            <Save className="w-5 h-5" /> Submit Inspection
                        </button>
                    </div>
                 )}
            </div>
            
            {/* History List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-500" />
                    <h3 className="font-bold text-gray-700">Recent Inspections</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Part</th>
                                <th className="p-3">Process</th>
                                <th className="p-3">Inspector</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.slice(0, 10).map(rec => (
                                <tr key={rec.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-500">{new Date(rec.timestamp).toLocaleString()}</td>
                                    <td className="p-3 font-medium">{rec.partNumber}</td>
                                    <td className="p-3">{rec.processFamily}</td>
                                    <td className="p-3">{rec.inspectorName}</td>
                                    <td className="p-3">
                                         <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${rec.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                              rec.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {rec.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right flex justify-end gap-2">
                                         <button onClick={() => handleDownloadReport(rec)} className="text-gray-500 hover:text-red-600 inline-flex items-center text-xs font-medium"><FileDown className="w-4 h-4" /></button>
                                        <button onClick={() => handleViewRecord(rec)} className="text-blue-600 hover:text-blue-800 inline-flex items-center text-xs font-medium"><Eye className="w-4 h-4 mr-1" /> View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-red-600">Reject Inspection</h3>
                        <p className="text-sm text-gray-600 mb-2">Please provide a reason for rejecting this inspection.</p>
                        <textarea className="w-full border p-2 rounded mb-4 focus:border-red-500 outline-none" rows={3} placeholder="Reason for rejection..." value={rejectionRemark} onChange={e => setRejectionRemark(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-gray-600" disabled={isProcessing}>Cancel</button>
                            <button onClick={submitRejection} className="px-4 py-2 bg-red-600 text-white rounded flex items-center gap-2 hover:bg-red-700" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Modal (Mirrors Reject Modal) */}
            {showApproveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-green-700 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> Approve Inspection
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">Please add approval remarks before proceeding.</p>
                        <textarea 
                            className="w-full border p-2 rounded mb-4 focus:border-green-500 outline-none" 
                            rows={3} 
                            placeholder="e.g. Verified OK, Checked Physically..." 
                            value={approvalRemark} 
                            onChange={e => setApprovalRemark(e.target.value)} 
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 text-gray-600" disabled={isProcessing}>Cancel</button>
                            <button onClick={submitApproval} className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2 hover:bg-green-700" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Submit Approval
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface WorkflowActionModalProps {
    type: 'APPROVE' | 'REJECT';
    onConfirm: (remark: string) => Promise<void>;
    onClose: () => void;
    title?: string;
}

export const WorkflowActionModal: React.FC<WorkflowActionModalProps> = ({ type, onConfirm, onClose, title }) => {
    const [remark, setRemark] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async () => {
        if (!remark.trim()) {
            alert(`${type === 'APPROVE' ? 'Approval Remark' : 'Rejection Reason'} is mandatory.`);
            return;
        }
        setIsProcessing(true);
        try {
            await onConfirm(remark);
            onClose();
        } catch (error: any) {
            alert(error.message || "Action Failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const isApprove = type === 'APPROVE';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className={`p-4 border-b flex items-center gap-3 ${isApprove ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    {isApprove ? (
                        <div className="p-2 bg-green-100 rounded-full text-green-600"><CheckCircle className="w-6 h-6" /></div>
                    ) : (
                        <div className="p-2 bg-red-100 rounded-full text-red-600"><XCircle className="w-6 h-6" /></div>
                    )}
                    <div>
                        <h3 className={`text-lg font-bold ${isApprove ? 'text-green-800' : 'text-red-800'}`}>
                            {title || (isApprove ? 'Approve Record' : 'Reject Record')}
                        </h3>
                        <p className="text-xs text-gray-500">This action will be audit logged.</p>
                    </div>
                </div>
                
                <div className="p-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {isApprove ? 'Approval Comments / Remarks' : 'Reason for Rejection'} <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                        className={`w-full border rounded-lg p-3 text-sm focus:ring-2 outline-none transition
                            ${isApprove ? 'focus:ring-green-500 border-green-200 focus:border-green-500' : 'focus:ring-red-500 border-red-200 focus:border-red-500'}`}
                        rows={4}
                        placeholder={isApprove ? "e.g. Verified and found OK..." : "e.g. Correction required in..."}
                        value={remark}
                        onChange={e => setRemark(e.target.value)}
                        autoFocus
                    />
                    
                    {isApprove && (
                        <div className="mt-3 flex items-start gap-2 bg-blue-50 p-3 rounded text-xs text-blue-700">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>By approving, you confirm that all data has been verified and meets the acceptance criteria defined in the Control Plan.</span>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition"
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isProcessing}
                        className={`px-6 py-2 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition transform active:scale-95
                            ${isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
                    </button>
                </div>
            </div>
        </div>
    );
};

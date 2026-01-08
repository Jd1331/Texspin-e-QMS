
import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { PartMaster, ProductionEntry } from '../types';
import { Save, Plus, BarChart2, Loader2 } from 'lucide-react';

export const ProductionEntryModule: React.FC = () => {
    const [view, setView] = useState<'LIST' | 'ENTRY'>('LIST');
    const [entries, setEntries] = useState<ProductionEntry[]>([]);
    const [parts, setParts] = useState<PartMaster[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<ProductionEntry>>({
        date: new Date().toISOString().split('T')[0],
        department: '',
        part_no: '',
        part_name: '',
        part_value: 0,
        quantity: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData, eData] = await Promise.all([
                db.getPartsMaster(),
                db.getProductionHistory()
            ]);
            setParts(pData);
            setEntries(eData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePartSelect = (partNo: string) => {
        const part = parts.find(p => p.part_no === partNo);
        if (part) {
            setFormData({
                ...formData,
                part_no: part.part_no,
                part_name: part.part_name,
                part_value: part.part_value
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.part_no || !formData.quantity || !formData.department) {
            alert("All fields are required");
            return;
        }

        try {
            await db.saveProductionEntry(formData as ProductionEntry);
            alert("Production Data Saved!");
            setView('LIST');
            loadData();
        } catch (err: any) {
            alert("Error saving: " + err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-blue-600" /> Production Log
                </h3>
                {view === 'LIST' && (
                    <button 
                        onClick={() => { setFormData({ date: new Date().toISOString().split('T')[0], quantity: 0, department: '' }); setView('ENTRY'); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 font-medium"
                    >
                        <Plus className="w-4 h-4" /> New Entry
                    </button>
                )}
            </div>

            {view === 'LIST' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Department</th>
                                    <th className="p-3">Part No</th>
                                    <th className="p-3">Part Name</th>
                                    <th className="p-3 text-right">Qty</th>
                                    <th className="p-3 text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {entries.map((entry, idx) => (
                                    <tr key={entry.id || idx} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-500">{entry.date}</td>
                                        <td className="p-3">{entry.department}</td>
                                        <td className="p-3 font-bold">{entry.part_no}</td>
                                        <td className="p-3">{entry.part_name}</td>
                                        <td className="p-3 text-right font-mono">{entry.quantity}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-700">
                                            {(entry.quantity * entry.part_value).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {entries.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No production entries yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {view === 'ENTRY' && (
                <div className="bg-white rounded-xl shadow-lg max-w-2xl mx-auto p-6">
                    <h4 className="text-lg font-bold mb-6 border-b pb-2">New Production Entry</h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    className="w-full border p-2 rounded"
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                                <select 
                                    required
                                    className="w-full border p-2 rounded"
                                    value={formData.department}
                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                >
                                    <option value="">Select Dept...</option>
                                    <option value="Assembly">Assembly</option>
                                    <option value="Machining">Machining</option>
                                    <option value="Grinding">Grinding</option>
                                    <option value="Packaging">Packaging</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Part Number</label>
                            <select 
                                required
                                className="w-full border p-2 rounded font-mono"
                                value={formData.part_no}
                                onChange={e => handlePartSelect(e.target.value)}
                            >
                                <option value="">Select Part...</option>
                                {parts.map(p => (
                                    <option key={p.part_no} value={p.part_no}>{p.part_no} - {p.part_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Part Name</label>
                                <input disabled className="w-full border p-2 rounded bg-gray-50" value={formData.part_name} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit Value</label>
                                <input disabled className="w-full border p-2 rounded bg-gray-50" value={formData.part_value} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Produced Quantity</label>
                            <input 
                                type="number" 
                                required
                                min="1"
                                className="w-full border p-2 rounded text-lg font-bold"
                                value={formData.quantity}
                                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setView('LIST')} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Entry
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

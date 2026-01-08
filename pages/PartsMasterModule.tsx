
import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { PartMaster } from '../types';
import { Upload, FileSpreadsheet, Search, Loader2, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

export const PartsMasterModule: React.FC = () => {
    const [parts, setParts] = useState<PartMaster[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await db.getPartsMaster();
            setParts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                // Map and Validate
                const mappedParts: PartMaster[] = data.map(row => ({
                    part_no: String(row['Part No'] || row['part_no'] || '').trim(),
                    part_name: String(row['Part Name'] || row['part_name'] || '').trim(),
                    part_value: parseFloat(row['Part Value'] || row['part_value'] || '0')
                })).filter(p => p.part_no);

                if (mappedParts.length === 0) throw new Error("No valid data found in columns 'Part No', 'Part Name', 'Part Value'");

                await db.uploadPartsMaster(mappedParts);
                alert(`Successfully uploaded ${mappedParts.length} parts!`);
                loadData();
            } catch (err: any) {
                alert("Upload Failed: " + err.message);
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const filteredParts = parts.filter(p => 
        p.part_no.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.part_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-blue-600" /> Parts Master
                </h3>
                <div className="flex gap-4">
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                            id="excel-upload" 
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <label 
                            htmlFor="excel-upload" 
                            className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Import Excel
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" 
                        placeholder="Search by Part Number or Name..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading master data...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="p-3">Part Number</th>
                                    <th className="p-3">Part Name</th>
                                    <th className="p-3 text-right">Value (Cost)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredParts.map(part => (
                                    <tr key={part.part_no} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono font-bold text-slate-700">{part.part_no}</td>
                                        <td className="p-3">{part.part_name}</td>
                                        <td className="p-3 text-right font-mono">{part.part_value.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {filteredParts.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-gray-400">
                                            No parts found. Upload an Excel file to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
                <strong>Excel Format Required:</strong> Columns should be named <code>Part No</code>, <code>Part Name</code>, <code>Part Value</code>.
            </div>
        </div>
    );
};

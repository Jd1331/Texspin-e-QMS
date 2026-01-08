import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import * as db from '../services/mockBackend';
import { Instrument } from '../types';
import { AlertTriangle, Shield, Settings } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const [ppmData, setPpmData] = useState<any[]>([]);
    const [instruments, setInstruments] = useState<Instrument[]>([]);

    useEffect(() => {
        const load = async () => {
            setPpmData(await db.getPPMData());
            setInstruments(await db.getInstruments());
        };
        load();
    }, []);

    const overdueInstruments = instruments.filter(i => i.status === 'OVERDUE');

    return (
        <div className="space-y-8">
            {/* Top Cards */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Avg PPM (Last 3 Mo)</p>
                            <h3 className="text-3xl font-bold text-slate-80
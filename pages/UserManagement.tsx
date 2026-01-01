import React, { useState, useEffect } from 'react';
import * as db from '../services/mockBackend';
import { User, UserRole } from '../types';
import { Plus, Edit2, UserX, UserCheck, Shield, Save, X } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [showModal, setShowModal] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState<Partial<User>>({
        userCode: '',
        name: '',
        email: '',
        password: '',
        role: 'INSPECTOR',
        department: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        refreshUsers();
    }, []);

    const refreshUsers = () => {
        setUsers(db.getUsers());
    };

    const handleCreateNew = () => {
        setFormData({
            id: '', // Empty means new
            userCode: '',
            name: '',
            email: '',
            password: '',
            role: 'INSPECTOR',
            department: '',
            status: 'ACTIVE'
        });
        setShowModal(true);
    };

    const handleEdit = (user: User) => {
        setFormData({ ...user });
        setShowModal(true);
    };

    const handleToggleStatus = (id: string) => {
        db.toggleUserStatus(id);
        refreshUsers();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const userToSave: User = {
                ...formData,
                id: formData.id || crypto.randomUUID(),
            } as User;

            db.saveUser(userToSave);
            setShowModal(false);
            refreshUsers();
        } catch (error: any) {
            alert(error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" /> User Master Management
                </h3>
                <button 
                    onClick={handleCreateNew} 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium"
                >
                    <Plus className="w-4 h-4" /> Add New User
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 border-b">
                        <tr>
                            <th className="px-6 py-4 font-medium">User Code</th>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium">Role</th>
                            <th className="px-6 py-4 font-medium">Department</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-mono text-xs">{user.userCode}</td>
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    {user.name}
                                    <div className="text-xs text-gray-400">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border 
                                        ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                          user.role === 'HOD' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                                          'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{user.department}</td>
                                <td className="px-6 py-4">
                                    {user.status === 'ACTIVE' ? (
                                        <span className="text-green-600 font-bold text-xs flex items-center gap-1"><UserCheck className="w-3 h-3" /> Active</span>
                                    ) : (
                                        <span className="text-red-500 font-bold text-xs flex items-center gap-1"><UserX className="w-3 h-3" /> Inactive</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={() => handleEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleToggleStatus(user.id)} 
                                        className={`p-2 rounded ${user.status === 'ACTIVE' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                        title={user.status === 'ACTIVE' ? "Deactivate" : "Activate"}
                                    >
                                        {user.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-slate-800">{formData.id ? 'Edit User' : 'Create New User'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User Code</label>
                                    <input type="text" required value={formData.userCode} onChange={e => setFormData({...formData, userCode: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="e.g. EMP005" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="John Doe" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email ID</label>
                                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="john@texspin.com" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full border rounded p-2 text-sm">
                                        <option value="INSPECTOR">Inspector</option>
                                        <option value="HOD">HOD / QA Manager</option>
                                        <option value="ADMIN">System Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                                    <input type="text" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="e.g. Assembly" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                                <input 
                                    type="text" 
                                    required={!formData.id} 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    className="w-full border rounded p-2 text-sm bg-yellow-50" 
                                    placeholder={formData.id ? "Leave blank to keep unchanged" : "Set Initial Password"} 
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Passwords are stored in plain text for this demo.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Save User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
import React, { useState, useEffect } from 'react';
import Shield from 'lucide-react/dist/esm/icons/shield';
import UserIcon from 'lucide-react/dist/esm/icons/user';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import type { User, Branch } from '../types';
import { subscribeToUsers, updateUser, createNewUser } from '../services/dataService';
import { UserModal } from './UserModal';
import { AddUserModal } from './AddUserModal';

interface UserManagementProps {
    currentUser: User;
    branches: Branch[];
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser: _currentUser, branches }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToUsers((data) => {
            setUsers(data);
        });
        return () => unsubscribe();
    }, []);

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const handleSave = async (uid: string, data: Partial<User>) => {
        await updateUser(uid, data);
        setShowModal(false);
    };

    const handleAddUser = async (data: {
        email: string;
        password: string;
        name: string;
        role: 'ADMIN' | 'USER';
        branchId: string | null;
    }) => {
        await createNewUser(data);
        setShowAddModal(false);
    };

    const getBranchName = (branchId?: string) => {
        if (!branchId || branchId === 'HQ') return 'สำนักงานใหญ่ (HQ)';
        const branch = branches.find(b => b.id === branchId);
        return branch ? branch.name : branchId;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="bg-violet-500/20 p-2 rounded-lg text-violet-400"><Shield size={24} /></span>
                        จัดการพนักงาน
                    </h2>
                    <p className="text-slate-400 mt-1">จัดการผู้ใช้งาน กำหนดสิทธิ์ และสาขา</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg"
                >
                    <UserPlus size={18} />
                    เพิ่มพนักงาน
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 text-slate-400 text-sm border-b border-slate-800">
                                <th className="p-4 font-medium pl-6">ชื่อผู้ใช้งาน</th>
                                <th className="p-4 font-medium">ตำแหน่ง</th>
                                <th className="p-4 font-medium">สาขา</th>
                                <th className="p-4 font-medium text-right pr-6">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                                                <UserIcon size={18} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-200">{user.name}</div>
                                                <div className="text-xs text-slate-500">{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.role === 'ADMIN' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                                <Shield size={12} /> Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                                <UserIcon size={12} /> User
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                                            <MapPin size={14} className="text-slate-500" />
                                            {getBranchName(user.branchId)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-violet-600 transition-all shadow-sm"
                                            title="แก้ไขข้อมูล"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        <p>ยังไม่มีข้อมูลผู้ใช้งาน</p>
                    </div>
                )}
            </div>

            <UserModal
                showModal={showModal}
                user={editingUser}
                branches={branches}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
            />

            <AddUserModal
                showModal={showAddModal}
                branches={branches}
                onClose={() => setShowAddModal(false)}
                onSave={handleAddUser}
            />
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import type { User, Branch } from '../types';
import { ConfirmModal } from './ui/ConfirmModal';

interface UserModalProps {
    showModal: boolean;
    user: User | null;
    branches: Branch[];
    onClose: () => void;
    onSave: (uid: string, data: Partial<User>) => Promise<void>;
}

export const UserModal: React.FC<UserModalProps> = ({ showModal, user, branches, onClose, onSave }) => {
    const [role, setRole] = useState<'ADMIN' | 'USER'>('USER');
    const [branchId, setBranchId] = useState('');
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);

    useEffect(() => {
        if (user) {
            setRole(user.role);
            setBranchId(user.branchId || '');
            setName(user.name);
            setIsSaving(false);
            setShowPromoteConfirm(false);
        }
    }, [user]);

    const doSave = async () => {
        if (!user || isSaving) return;
        setIsSaving(true);
        try {
            await onSave(user.id, {
                role,
                branchId: branchId || undefined, // Send undefined instead of null to match User type
                name
            });
        } finally {
            setIsSaving(false);
            setShowPromoteConfirm(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // เลื่อนขั้นเป็น Admin (เห็นเงินทุกสาขา) ต้องยืนยันก่อนเสมอ
        if (role === 'ADMIN' && user.role !== 'ADMIN') {
            setShowPromoteConfirm(true);
            return;
        }

        await doSave();
    };

    if (!showModal || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in relative overflow-hidden">

                <div className="flex justify-between items-center p-6 border-b border-slate-800/50 bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white">แก้ไขข้อมูลพนักงาน</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800/50 p-2 rounded-full hover:bg-slate-800">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">ชื่อพนักงาน</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-terracotta-500 outline-none transition-all"
                            placeholder="ชื่อพนักงาน"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">ตำแหน่ง (Role)</label>
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-700">
                            <button
                                type="button"
                                onClick={() => setRole('USER')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${role === 'USER' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                พนักงาน (User)
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('ADMIN')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${role === 'ADMIN' ? 'bg-terracotta-600 text-white shadow-lg shadow-terracotta-900/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                ผู้ดูแล (Admin)
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">สาขาที่สังกัด</label>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-terracotta-500 outline-none transition-all appearance-none"
                        >
                            <option value="">ไม่ระบุ (หรือ HQ)</option>
                            {branches.filter(b => b.id !== 'HQ').map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2 ml-1">* หากเป็น Admin แนะนำให้ไม่ต้องระบุสาขา เพื่อดูได้ทั้งหมด</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-terracotta-600 hover:bg-terracotta-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-terracotta-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </form>
            </div>

            <ConfirmModal
                show={showPromoteConfirm}
                title="ยืนยันเลื่อนเป็นผู้ดูแล (Admin)"
                message={`คุณต้องการให้ "${name}" เป็น Admin ใช่หรือไม่?\nAdmin จะสามารถเห็นและแก้ไขข้อมูลการเงินของทุกสาขาได้`}
                variant="warning"
                confirmText="ยืนยัน"
                onConfirm={doSave}
                onCancel={() => setShowPromoteConfirm(false)}
            />
        </div>
    );
};

import React, { useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import User from 'lucide-react/dist/esm/icons/user';
import Lock from 'lucide-react/dist/esm/icons/lock';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Shield from 'lucide-react/dist/esm/icons/shield';
import AtSign from 'lucide-react/dist/esm/icons/at-sign';
import type { Branch } from '../types';

interface AddUserModalProps {
    showModal: boolean;
    branches: Branch[];
    onClose: () => void;
    onSave: (data: {
        email: string;
        password: string;
        name: string;
        role: 'ADMIN' | 'USER';
        branchId: string | null;
    }) => Promise<void>;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
    showModal,
    branches,
    onClose,
    onSave
}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'USER'>('USER');
    const [branchId, setBranchId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!showModal) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        if (password.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setIsLoading(true);
        try {
            // Auto-append domain to construct email
            const email = username.includes('@') ? username : `${username}@tiercoffee.com`;

            await onSave({
                email,
                password,
                name,
                role,
                branchId: branchId || null
            });
            // Reset form
            setUsername('');
            setPassword('');
            setConfirmPassword('');
            setName('');
            setRole('USER');
            setBranchId('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-fade-in">
                <div className="bg-violet-600 p-4 flex justify-between items-center text-white shadow-lg shadow-violet-900/20">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <UserPlus size={20} />
                        เพิ่มพนักงานใหม่
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">
                            <AtSign size={14} className="inline mr-1.5" /> ชื่อผู้ใช้งาน (Username)
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-600"
                                placeholder="เช่น somchai (ไม่ต้องพิมพ์ @tiercoffee.com)"
                                disabled={isLoading}
                            />
                            <div className="absolute right-3 top-3.5 text-slate-600 text-xs font-mono pointer-events-none">
                                @tiercoffee.com
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 ml-1">ใช้สำหรับเข้าสู่ระบบ (ระบบจะเติม @tiercoffee.com ให้โดยอัตโนมัติ)</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">
                            <User size={14} className="inline mr-1.5" /> ชื่อ-นามสกุล
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-600"
                            placeholder="ชื่อที่จะแสดงในระบบ"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Password */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">
                                <Lock size={14} className="inline mr-1.5" /> รหัสผ่าน
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-600"
                                placeholder="••••••"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">
                                ยืนยันรหัสผ่าน
                            </label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-600"
                                placeholder="••••••"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            <Shield size={14} className="inline mr-1.5" /> ตำแหน่ง
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setRole('USER')}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${role === 'USER'
                                    ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-slate-300'
                                    }`}
                                disabled={isLoading}
                            >
                                พนักงาน (User)
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('ADMIN')}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${role === 'ADMIN'
                                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20'
                                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-slate-300'
                                    }`}
                                disabled={isLoading}
                            >
                                ผู้ดูแล (Admin)
                            </button>
                        </div>
                    </div>

                    {/* Branch */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">
                            <MapPin size={14} className="inline mr-1.5" /> สาขาที่สังกัด
                        </label>
                        <div className="relative">
                            <select
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all appearance-none cursor-pointer"
                                disabled={isLoading}
                            >
                                <option value="">ไม่ระบุ (หรือเข้าดูได้ทุกสาขา สำหรับ HQ/Admin)</option>
                                {branches.filter(b => b.id !== 'HQ').map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500">
                                <MapPin size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-rose-400 text-xs bg-rose-500/10 p-3 rounded-xl flex items-center gap-2 border border-rose-500/20">
                            <X size={14} /> {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-900/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        <UserPlus size={18} />
                        {isLoading ? 'กำลังสร้าง...' : 'สร้างบัญชีผู้ใช้ใหม่'}
                    </button>
                </form>
            </div>
        </div>
    );
};

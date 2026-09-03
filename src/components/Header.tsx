import React, { useState, useRef, useEffect } from 'react';
import Coffee from 'lucide-react/dist/esm/icons/coffee';
import Store from 'lucide-react/dist/esm/icons/store';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Check from 'lucide-react/dist/esm/icons/check';
import type { User, Branch } from '../types';

interface HeaderProps {
    currentUser: User;
    branches: Branch[];
    selectedBranchId: string;
    onSelectBranch: (id: string) => void;
    onLogout: () => void;
    onAddBranch: () => void;
    onEditBranch: () => void;
    onDeleteBranch: () => void;
    onSelectAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    currentUser,
    branches,
    selectedBranchId,
    onSelectBranch,
    onLogout,
    onAddBranch,
    onEditBranch,
    onDeleteBranch,
    onSelectAdmin
}) => {
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Filter branches based on user role
    const visibleBranches = currentUser.role === 'ADMIN' 
        ? branches 
        : branches.filter(b => b.id === currentUser.branchId);

    const currentBranchName = visibleBranches.find(b => b.id === selectedBranchId)?.name || 'ทุกสาขา (All Branches)';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowBranchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="bg-slate-950 text-white p-4 sticky top-0 z-50 border-b border-slate-800/50 backdrop-blur-md bg-opacity-80">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-terracotta-600 to-indigo-600 p-2 rounded-xl border border-terracotta-500/20 shadow-lg shadow-terracotta-900/20">
                            <Coffee size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white leading-none">Tier Coffee</h1>
                            <span className="text-[10px] text-terracotta-400 font-medium uppercase tracking-widest">Enterprise</span>
                        </div>
                    </div>

                    <div className="relative ml-4 flex items-center gap-2" ref={dropdownRef}>
                        <div className="relative">
                            <button
                                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                                className={`flex items-center gap-2 bg-zinc-900/50 border rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ${
                                    showBranchDropdown ? 'border-terracotta-500 ring-2 ring-terracotta-500/20' : 'border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                <Store size={14} className="text-terracotta-400" />
                                <span>{currentBranchName}</span>
                                <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${showBranchDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showBranchDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-fade-in py-2 backdrop-blur-xl bg-opacity-95">
                                    <div className="px-3 pb-2 mb-2 border-b border-zinc-800">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">รายชื่อสาขา</p>
                                    </div>
                                    <div className="max-h-[60vh] overflow-y-auto px-2 space-y-1">
                                        {visibleBranches.map(b => (
                                            <button
                                                key={b.id}
                                                onClick={() => {
                                                    onSelectBranch(b.id);
                                                    setShowBranchDropdown(false);
                                                }}
                                                className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center justify-between group ${
                                                    selectedBranchId === b.id 
                                                    ? 'bg-terracotta-600/10 text-terracotta-400 font-bold' 
                                                    : 'hover:bg-zinc-800/80 text-zinc-300 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${selectedBranchId === b.id ? 'bg-terracotta-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'bg-zinc-700'}`}></div>
                                                    <span className="text-sm">{b.name}</span>
                                                </div>
                                                {selectedBranchId === b.id && (
                                                    <Check size={16} className="text-terracotta-400 animate-in zoom-in-50 duration-300" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Add Branch Button inside dropdown for ADMIN ONLY */}
                                    {currentUser.role === 'ADMIN' && (
                                        <div className="px-2 pt-2 mt-2 border-t border-zinc-800">
                                            <button
                                                onClick={() => { onAddBranch(); setShowBranchDropdown(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all text-sm font-medium"
                                            >
                                                <div className="p-1 bg-zinc-800 rounded-lg group-hover:bg-emerald-500/20">
                                                    <Plus size={14} />
                                                </div>
                                                เพิ่มสาขาใหม่
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Actions for current branch - ADMIN ONLY */}
                        {currentUser.role === 'ADMIN' && (
                            <div className="flex gap-1">
                                {selectedBranchId !== 'HQ' && (
                                    <>
                                        <button
                                            onClick={onEditBranch}
                                            className="p-2 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-terracotta-400 rounded-lg transition-colors border border-zinc-800/50"
                                            title="แก้ไขชื่อสาขา"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={onDeleteBranch}
                                            className="p-2 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors border border-zinc-800/50"
                                            title="ลบสาขา"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900/50 p-1.5 rounded-lg transition-colors group"
                        onClick={() => {
                            if (currentUser.role === 'ADMIN') {
                                onSelectAdmin();
                            } else {
                                alert(`สำหรับผู้ดูแลระบบ (Admin) เท่านั้น\nสถานะของคุณคือ: ${currentUser.role}`);
                            }
                        }}
                        title="จัดการผู้ใช้งาน (Admin Only)"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${currentUser.role === 'ADMIN' ? 'bg-terracotta-600 border-terracotta-500 text-white group-hover:scale-110' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                            <span className="text-xs font-bold">{currentUser.name.charAt(0)}</span>
                        </div>
                        <div className="hidden sm:block text-right">
                            <p className="text-xs font-bold text-zinc-200 leading-tight">{currentUser.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-black">{currentUser.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all"
                        title="ออกจากระบบ"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header >
    );
};

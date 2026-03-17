import React from 'react';
import Coffee from 'lucide-react/dist/esm/icons/coffee';
import Store from 'lucide-react/dist/esm/icons/store';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
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
    const currentBranchName = branches.find(b => b.id === selectedBranchId)?.name || 'Unknown Branch';

    return (
        <header className="bg-slate-950 text-white p-4 sticky top-0 z-20 border-b border-slate-800/50 backdrop-blur-md bg-opacity-80">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-2 rounded-xl border border-violet-500/20 shadow-lg shadow-violet-900/20">
                            <Coffee size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white leading-none">Tier Coffee</h1>
                            <span className="text-[10px] text-violet-400 font-medium uppercase tracking-widest">Enterprise</span>
                        </div>
                    </div>

                    {currentUser.role === 'ADMIN' ? (
                        <div className="relative ml-4 flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-lg px-3 py-1.5 text-sm cursor-pointer group hover:border-violet-500 transition-colors relative z-10">
                                <Store size={14} className="text-violet-400" />
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => onSelectBranch(e.target.value)}
                                    className="bg-transparent text-white outline-none appearance-none font-medium cursor-pointer pr-4"
                                >
                                    {branches.map(b => <option key={b.id} value={b.id} className="bg-zinc-900">{b.name}</option>)}
                                </select>
                                <ChevronDown size={14} className="text-zinc-500 absolute right-2 pointer-events-none" />
                            </div>

                            <div className="flex gap-1">
                                <button
                                    onClick={onAddBranch}
                                    className="p-1.5 bg-black hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-800"
                                    title="เพิ่มสาขาใหม่"
                                >
                                    <Plus size={16} />
                                </button>
                                {selectedBranchId !== 'HQ' && (
                                    <>
                                        <button
                                            onClick={onEditBranch}
                                            className="p-1.5 bg-black hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-800"
                                            title="แก้ไขชื่อสาขา"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={onDeleteBranch}
                                            className="p-1.5 bg-black hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-800"
                                            title="ลบสาขา"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-black rounded-lg border border-zinc-800">
                            <Store size={14} className="text-white" />
                            <span className="text-sm font-medium text-zinc-300">{currentBranchName}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900/50 p-1.5 rounded-lg transition-colors"
                        onClick={() => {
                            if (currentUser.role === 'ADMIN') {
                                onSelectAdmin();
                            } else {
                                alert(`สำหรับผู้ดูแลระบบ (Admin) เท่านั้น\nสถานะของคุณคือ: ${currentUser.role}`);
                            }
                        }}
                        title="จัดการผู้ใช้งาน (Admin Only)"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${currentUser.role === 'ADMIN' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                            <span className="text-xs font-bold">{currentUser.name.charAt(0)}</span>
                        </div>
                        <div className="hidden sm:block text-right">
                            <p className="text-xs font-bold text-zinc-200 leading-tight">{currentUser.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">{currentUser.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        title="ออกจากระบบ"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header >
    );
};

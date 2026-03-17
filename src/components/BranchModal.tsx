import React, { useState, useEffect } from 'react';
import Store from 'lucide-react/dist/esm/icons/store';
import X from 'lucide-react/dist/esm/icons/x';

interface BranchModalProps {
    showBranchModal: boolean;
    isEditing: boolean;
    initialName: string;
    onClose: () => void;
    onSave: (name: string) => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
    showBranchModal,
    isEditing,
    initialName,
    onClose,
    onSave
}) => {
    const [branchNameInput, setBranchNameInput] = useState('');

    useEffect(() => {
        if (showBranchModal) {
            setBranchNameInput(initialName || '');
        }
    }, [showBranchModal, initialName]);

    if (!showBranchModal) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(branchNameInput);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-800 animate-zoom-in">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Store size={18} className="text-violet-400" />
                        {isEditing ? 'แก้ไขชื่อสาขา' : 'เพิ่มสาขาใหม่'}
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <label className="block text-sm font-medium text-slate-400 mb-2">ชื่อสาขา</label>
                    <input
                        type="text"
                        autoFocus
                        required
                        value={branchNameInput}
                        onChange={(e) => setBranchNameInput(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-violet-500 transition-all"
                        placeholder="เช่น สาขา ลาดพร้าว"
                    />
                    <button type="submit" className="w-full mt-6 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl transition-all">
                        บันทึก
                    </button>
                </form>
            </div>
        </div>
    );
};

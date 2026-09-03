import React, { useState, useEffect } from 'react';
import Store from 'lucide-react/dist/esm/icons/store';
import X from 'lucide-react/dist/esm/icons/x';
import Link from 'lucide-react/dist/esm/icons/link';

interface BranchModalProps {
    showBranchModal: boolean;
    isEditing: boolean;
    initialName: string;
    initialUrl?: string;
    initialTabs?: string;
    onClose: () => void;
    onSave: (name: string, url?: string, tabs?: string) => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
    showBranchModal,
    isEditing,
    initialName,
    initialUrl = '',
    initialTabs = '',
    onClose,
    onSave
}) => {
    const [branchNameInput, setBranchNameInput] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [tabsInput, setTabsInput] = useState('');

    useEffect(() => {
        if (showBranchModal) {
            setBranchNameInput(initialName || '');
            setUrlInput(initialUrl || '');
            setTabsInput(initialTabs || '');
        }
    }, [showBranchModal, initialName, initialUrl, initialTabs]);

    if (!showBranchModal) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(branchNameInput, urlInput, tabsInput);
    };

    const handleTestLink = () => {
        if (!urlInput) {
            alert('กรุณากรอกลิงก์ Google Sheets');
            return;
        }
        window.open(urlInput, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 animate-zoom-in my-8">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Store size={18} className="text-amber-400" />
                        {isEditing ? 'แก้ไขข้อมูลสาขา' : 'เพิ่มสาขาใหม่'}
                    </h3>
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">ชื่อสาขา <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            autoFocus
                            required
                            value={branchNameInput}
                            onChange={(e) => setBranchNameInput(e.target.value)}
                            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-500 transition-all"
                            placeholder="เช่น สาขา ลาดพร้าว"
                        />
                    </div>
                    
                    <div className="pt-2 border-t border-slate-800/50">
                        <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between">
                            <span>Google Sheets URL (สำหรับนำเข้า)</span>
                            {urlInput && (
                                <button type="button" onClick={handleTestLink} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                                    <Link size={12} /> ทดสอบลิงก์
                                </button>
                            )}
                        </label>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                        />
                        <p className="text-xs text-slate-500 mt-1">ต้องแชร์ชีทเป็น "Anyone with the link can view"</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">ชื่อ Tab (ถ้ามีหลาย Tab)</label>
                        <input
                            type="text"
                            value={tabsInput}
                            onChange={(e) => setTabsInput(e.target.value)}
                            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                            placeholder="เช่น ขอนแก่น หน้าบ้าน, ขอนแก่น โอน (คั่นด้วยลูกน้ำ)"
                        />
                        <p className="text-xs text-slate-500 mt-1">เว้นว่างไว้หากต้องการดึงจาก Tab แรกสุดของไฟล์เท่านั้น</p>
                    </div>

                    <button type="submit" className="w-full mt-6 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all">
                        บันทึก
                    </button>
                </form>
            </div>
        </div>
    );
};

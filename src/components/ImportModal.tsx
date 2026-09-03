import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Download from 'lucide-react/dist/esm/icons/download';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Loader from 'lucide-react/dist/esm/icons/loader';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import type { Transaction, Branch } from '../types';
import { ConfirmModal } from './ui/ConfirmModal';
import {
    fetchAllSheetsAndParse,
    type ParsedImportData,
} from '../services/googleSheetsService';
import { updateBranch } from '../services/dataService';
import Store from 'lucide-react/dist/esm/icons/store';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import LinkIcon from 'lucide-react/dist/esm/icons/link';

interface ImportModalProps {
    show: boolean;
    onClose: () => void;
    selectedBranchId: string;
    currentBranchName: string;
    branches?: Branch[];
    existingTransactions: Transaction[];
    currentUser: string;
    isAdmin?: boolean;
    onImport: (targetBranchId: string, transactions: Omit<Transaction, 'id'>[], datesToOverwrite: string[]) => Promise<void>;
    onBulkCleanup?: (targetBranchId: string, year: number, month?: number) => Promise<void>;
}

type ImportPhase = 'select_branch' | 'loading' | 'preview' | 'importing' | 'done' | 'error';

export const ImportModal: React.FC<ImportModalProps> = ({
    show,
    onClose,
    selectedBranchId,
    currentBranchName,
    branches = [],
    existingTransactions,
    currentUser,
    isAdmin = false,
    onImport,
    onBulkCleanup,
}) => {
    const [phase, setPhase] = useState<ImportPhase>('loading');
    const [localBranchId, setLocalBranchId] = useState('');
    const [importData, setImportData] = useState<ParsedImportData | null>(null);
    const [error, setError] = useState('');
    
    // Inline URL Editing States
    const [editingUrlBranchId, setEditingUrlBranchId] = useState('');
    const [tempUrlInput, setTempUrlInput] = useState('');

    // Duplicate Detection States
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [newTransactions, setNewTransactions] = useState<Omit<Transaction, 'id'>[]>([]);

    const [importedCount, setImportedCount] = useState(0);
    const [isCleaning, setIsCleaning] = useState(false);
    const [cleanupYear, setCleanupYear] = useState(new Date().getFullYear());
    const [cleanupMonth, setCleanupMonth] = useState(new Date().getMonth() + 1);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showImportConfirm, setShowImportConfirm] = useState(false);

    useEffect(() => {
        if (show) {
            let initialBranch = selectedBranchId;
            if (selectedBranchId === 'HQ') {
                // If HQ, let them pick from valid branches, or set to empty
                initialBranch = '';
                setPhase('select_branch');
            } else {
                setPhase('loading');
                setTimeout(() => {
                    loadData(initialBranch);
                }, 0);
            }
            setLocalBranchId(initialBranch);
        }
        return () => {
            setPhase('loading');
            setImportData(null);
            setError('');
            setDuplicateCount(0);
            setNewTransactions([]);
            setImportedCount(0);
            setLocalBranchId('');
            setEditingUrlBranchId('');
            setTempUrlInput('');
        };
    }, [show, selectedBranchId]);

    const handleSelectBranchAndLoad = (bId: string) => {
        if (!bId) return;
        setLocalBranchId(bId);
        loadData(bId);
    };

    const handleSaveUrl = async (bId: string, bName: string, bTabs?: string) => {
        try {
            await updateBranch(bId, bName, tempUrlInput, bTabs);
            setEditingUrlBranchId('');
        } catch (err) {
            console.error("Error updating branch URL:", err);
            alert("ไม่สามารถบันทึก URL ได้");
        }
    };

    const handleDeleteUrl = async (bId: string, bName: string, bTabs?: string) => {
        if (window.confirm("ต้องการลบลิงก์นี้หรือไม่?")) {
            try {
                await updateBranch(bId, bName, '', bTabs);
            } catch (err) {
                console.error("Error deleting branch URL:", err);
            }
        }
    };

    const loadData = async (bId: string) => {
        if (!bId || bId === 'HQ') {
            setPhase('select_branch');
            return;
        }

        const branchInfo = branches.find(b => b.id === bId);
        if (!branchInfo) {
            setError('ไม่พบข้อมูลสาขานี้');
            setPhase('error');
            return;
        }

        console.log('IMPORT MODAL: Starting loadData with branch:', branchInfo.name);
        setPhase('loading');
        setError('');
        try {
            const parsed = await fetchAllSheetsAndParse(
                bId, 
                currentUser, 
                branchInfo.name, 
                branchInfo.googleSheetsUrl, 
                branchInfo.googleSheetsTabs
            );

            if (parsed.transactions.length === 0) {
                setError('ไม่พบข้อมูลในชีทที่สามารถนำเข้าได้');
                setPhase('error');
                return;
            }

            setImportData(parsed);

            // Default cleanup month/year to the most recent transaction date from the sheet
            if (parsed.summary.dateRange.end) {
                const dateParts = parsed.summary.dateRange.end.split('-');
                if (dateParts.length === 3) {
                    setCleanupYear(parseInt(dateParts[0]));
                    setCleanupMonth(parseInt(dateParts[1]));
                }
            }

            // Exact Duplicate Detection
            const existingForBranch = existingTransactions.filter(t => t.branchId === bId);
            let dupCount = 0;
            const newT: Omit<Transaction, 'id'>[] = [];

            parsed.transactions.forEach(pt => {
                const isDup = existingForBranch.some(et => 
                    et.date === pt.date &&
                    et.type === pt.type &&
                    et.category === pt.category &&
                    et.amount === pt.amount &&
                    et.paymentMethod === pt.paymentMethod &&
                    et.name === pt.name
                );
                if (isDup) {
                    dupCount++;
                } else {
                    newT.push(pt);
                }
            });

            setDuplicateCount(dupCount);
            setNewTransactions(newT);

            setPhase('preview');
        } catch (err: any) {
            console.error('Sheet fetch error:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
            setPhase('error');
        }
    };

    const handleImport = () => {
        if (!importData || !localBranchId || newTransactions.length === 0) return;
        setShowImportConfirm(true);
    };

    const confirmImport = async () => {
        setShowImportConfirm(false);
        if (!importData || !localBranchId) return;

        setPhase('importing');

        try {
            // Append only new non-duplicate transactions. Empty datesToOverwrite to avoid deleting anything.
            await onImport(localBranchId, newTransactions, []);
            setImportedCount(newTransactions.length);
            setPhase('done');
        } catch (err: any) {
            console.error('Import error:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการนำเข้า');
            setPhase('error');
        }
    };
    
    const handleMonthlyCleanup = () => {
        setShowConfirmModal(true);
    };

    const confirmMonthlyCleanup = async () => {
        if (!onBulkCleanup || !localBranchId) return;
        
        setShowConfirmModal(false);
        setIsCleaning(true);
        const monthName = new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(new Date(cleanupYear, cleanupMonth - 1));
        
        try {
            await onBulkCleanup(localBranchId, cleanupYear, cleanupMonth);
            alert(`ล้างข้อมูลเดือน ${monthName} เรียบร้อยแล้ว`);
            onClose();
        } catch (err: any) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setIsCleaning(false);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);

    const formatDateThai = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

    if (!show) return null;

    const currentBranchDisplayName = branches.find(b => b.id === localBranchId)?.name || currentBranchName;

    return (
        <div className="fixed inset-0 bg-black/80 z-[50] flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-lg rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 flex-shrink-0">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <FileSpreadsheet size={18} className="text-emerald-400" />
                        นำเข้าจาก Google Sheets
                    </h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    
                    {/* Phase: Select Branch (For HQ) */}
                    {phase === 'select_branch' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                            <p className="text-zinc-300 text-sm">กรุณาเลือกสาขาที่ต้องการนำเข้าข้อมูล</p>
                            <div className="w-full space-y-2">
                                {branches.filter(b => b.id !== 'HQ').map(b => (
                                    <button 
                                        key={b.id}
                                        onClick={() => handleSelectBranchAndLoad(b.id)}
                                        className="w-full text-left p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all group flex justify-between items-center"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 transition-colors">
                                                <Store size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{b.name}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{b.googleSheetsUrl ? 'มี URL แล้ว' : 'ยังไม่ได้ตั้งค่า URL'}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-zinc-600 group-hover:text-zinc-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Global URL Setting Area (Shows when a branch is selected) */}
                    {localBranchId && phase !== 'select_branch' && phase !== 'importing' && phase !== 'done' && (
                        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400">
                                        <LinkIcon size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">Google Sheets URL</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">ตั้งค่าลิงก์สำหรับ {currentBranchDisplayName.replace(/^\d\.\s*/, '')}</p>
                                    </div>
                                </div>
                                
                                {isAdmin && branches.find(b => b.id === localBranchId)?.googleSheetsUrl && editingUrlBranchId !== localBranchId && (
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => { setTempUrlInput(branches.find(b => b.id === localBranchId)?.googleSheetsUrl || ''); setEditingUrlBranchId(localBranchId); }}
                                            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-400 rounded-md transition-colors"
                                        >
                                            แก้ไข
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUrl(localBranchId, currentBranchDisplayName, branches.find(b => b.id === localBranchId)?.googleSheetsTabs)}
                                            className="px-3 py-1 bg-zinc-800 hover:bg-rose-500/10 text-[10px] font-bold text-zinc-400 hover:text-rose-400 rounded-md transition-colors"
                                        >
                                            ลบ
                                        </button>
                                    </div>
                                )}
                            </div>

                            {(!branches.find(b => b.id === localBranchId)?.googleSheetsUrl || editingUrlBranchId === localBranchId) ? (
                                <div className="space-y-3">
                                    {isAdmin ? (
                                        <div className="flex gap-2">
                                            <input 
                                                type="url"
                                                autoFocus
                                                value={tempUrlInput}
                                                onChange={(e) => setTempUrlInput(e.target.value)}
                                                className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500 transition-all"
                                                placeholder="วาง Google Sheets URL ที่นี่..."
                                            />
                                            <button 
                                                onClick={async () => {
                                                    await handleSaveUrl(localBranchId, currentBranchDisplayName, branches.find(b => b.id === localBranchId)?.googleSheetsTabs);
                                                    loadData(localBranchId);
                                                }}
                                                disabled={!tempUrlInput}
                                                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all"
                                            >
                                                บันทึก
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-zinc-500 text-center py-2 bg-black/10 rounded-lg border border-dashed border-zinc-800">
                                            ยังไม่ได้ตั้งค่า Google Sheets URL สำหรับสาขานี้ กรุณาติดต่อผู้ดูแลระบบ (Admin)
                                        </p>
                                    )}
                                    {isAdmin && !branches.find(b => b.id === localBranchId)?.googleSheetsUrl && (
                                        <p className="text-[10px] text-amber-400/80 bg-amber-400/5 p-2 rounded-md border border-amber-400/10">
                                            * กรุณาใส่ URL ของ Google Sheets เพื่อดึงข้อมูลมาแสดงผลในตารางนำเข้า
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-zinc-800">
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] text-zinc-400 truncate pr-4 font-mono">{branches.find(b => b.id === localBranchId)?.googleSheetsUrl}</p>
                                    </div>
                                    <button 
                                        onClick={() => loadData(localBranchId)}
                                        className="text-[10px] bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-md font-bold transition-all whitespace-nowrap"
                                    >
                                        ดึงข้อมูลใหม่
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Phase: Loading */}
                    {phase === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader size={32} className="text-violet-400 animate-spin" />
                            <p className="text-zinc-400 text-sm text-center">
                                กำลังดึงข้อมูลจาก Google Sheets...<br/>
                                <span className="text-[10px] opacity-50 uppercase tracking-widest">{currentBranchDisplayName.replace(/^\d\.\s*/, '')}</span>
                            </p>
                        </div>
                    )}

                    {/* Phase: Error */}
                    {phase === 'error' && (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center">
                                <AlertCircle size={32} className="text-rose-400" />
                            </div>
                            <p className="text-rose-400 text-sm text-center px-4">{error}</p>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPhase('select_branch')}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm"
                                >
                                    เปลี่ยนสาขา
                                </button>
                                <button
                                    onClick={() => loadData(localBranchId)}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold"
                                >
                                    ลองใหม่
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Phase: Preview */}
                    {phase === 'preview' && importData && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(importData.summary.totalIncome)}</p>
                                    <p className="text-xs text-zinc-500">รายรับรวม (จากชีท)</p>
                                </div>
                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-rose-400">{formatCurrency(importData.summary.totalExpense)}</p>
                                    <p className="text-xs text-zinc-500">รายจ่ายรวม (จากชีท)</p>
                                </div>
                            </div>

                            <p className="text-xs text-zinc-500 text-center">
                                ช่วงวันที่: {formatDateThai(importData.summary.dateRange.start)} — {formatDateThai(importData.summary.dateRange.end)}
                            </p>

                            {/* Duplicate Info */}
                            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle2 size={16} className="text-violet-400" />
                                    <span className="text-sm font-bold text-violet-400">สรุปการซิงค์ข้อมูล</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">พบข้อมูลใหม่ (Append):</span>
                                    <span className="text-emerald-400 font-bold">{newTransactions.length} รายการ</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">ข้อมูลที่ซ้ำกับระบบ (Skip):</span>
                                    <span className="text-rose-400 font-bold">{duplicateCount} รายการ</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 pt-2 border-t border-violet-500/10 mt-2">
                                    * ระบบตรวจสอบความซ้ำซ้อนจาก วันที่, ประเภท, หมวดหมู่, ยอดเงิน, ช่องทาง และชื่อรายการ
                                </p>
                            </div>

                            {/* Cleanup Tool */}
                            {isAdmin && (
                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Trash2 size={16} className="text-rose-400" />
                                        <span className="text-sm font-bold text-rose-400">ล้างข้อมูลรายเดือน</span>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        เลือกเดือนที่ต้องการล้างข้อมูลทั้งหมดออก (กรณีนำเข้าผิด)
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select 
                                            value={cleanupMonth} 
                                            onChange={(e) => setCleanupMonth(parseInt(e.target.value))}
                                            className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-rose-500"
                                        >
                                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                                <option key={m} value={m}>
                                                    {new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(new Date(2024, m - 1))}
                                                </option>
                                            ))}
                                        </select>
                                        <select 
                                            value={cleanupYear} 
                                            onChange={(e) => setCleanupYear(parseInt(e.target.value))}
                                            className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-rose-500"
                                        >
                                            {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => (
                                                <option key={y} value={y}>พ.ศ. {y + 543}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleMonthlyCleanup}
                                        disabled={isCleaning}
                                        className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold border border-rose-500/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isCleaning ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        ล้างข้อมูลเดือนข้างต้น
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Phase: Importing */}
                    {phase === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader size={32} className="text-violet-400 animate-spin" />
                            <p className="text-zinc-400 text-sm">กำลังเพิ่มข้อมูล {newTransactions.length} รายการ...</p>
                        </div>
                    )}

                    {/* Phase: Done */}
                    {phase === 'done' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-emerald-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-white">นำเข้าสำเร็จ!</p>
                                <p className="text-sm text-zinc-400 mt-1">
                                    เพิ่มข้อมูลใหม่ทั้งหมด <span className="text-emerald-400 font-bold">{importedCount}</span> รายการ
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 flex-shrink-0">
                    {phase === 'preview' && (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => selectedBranchId === 'HQ' ? setPhase('select_branch') : onClose()}
                                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors font-medium text-sm"
                            >
                                {selectedBranchId === 'HQ' ? 'เปลี่ยนสาขา' : 'ยกเลิก'}
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={newTransactions.length === 0}
                                className={`flex-1 px-4 py-3 rounded-xl transition-colors font-bold text-sm shadow-lg flex items-center justify-center gap-2 ${
                                    newTransactions.length === 0 
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                                }`}
                            >
                                <Download size={16} />
                                ยืนยัน Import & Sync
                            </button>
                        </div>
                    )}
                    {(phase === 'done' || phase === 'select_branch') && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors font-medium text-sm"
                        >
                            ปิด
                        </button>
                    )}
                    {phase === 'error' && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors font-medium text-sm"
                        >
                            ปิด
                        </button>
                    )}
                </div>
            </div>

            <ConfirmModal
                show={showImportConfirm}
                title="ยืนยันการนำเข้าข้อมูล"
                message={`จะเพิ่มรายการใหม่ทั้งหมด ${newTransactions.length} รายการ เข้าสาขา ${currentBranchDisplayName}\nต้องการดำเนินการต่อหรือไม่?`}
                variant="info"
                confirmText="ยืนยัน Import"
                onConfirm={confirmImport}
                onCancel={() => setShowImportConfirm(false)}
            />

            <ConfirmModal
                show={showConfirmModal}
                title="ยืนยันล้างข้อมูลรายเดือน"
                message={`คุณต้องการล้างข้อมูลเดือน ${new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(new Date(cleanupYear, cleanupMonth - 1))} ปี ${cleanupYear + 543} ของสาขา ${currentBranchDisplayName} ใช่หรือไม่?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`}
                variant="danger"
                onConfirm={confirmMonthlyCleanup}
                onCancel={() => setShowConfirmModal(false)}
            />
        </div>
    );
};

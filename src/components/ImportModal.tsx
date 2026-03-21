import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Download from 'lucide-react/dist/esm/icons/download';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Loader from 'lucide-react/dist/esm/icons/loader';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import type { Transaction } from '../types';
import {
    fetchAllSheetsAndParse,
    type ParsedImportData,
} from '../services/googleSheetsService';

interface ImportModalProps {
    show: boolean;
    onClose: () => void;
    selectedBranchId: string;
    existingTransactions: Transaction[];
    currentUser: string;
    onImport: (transactions: Omit<Transaction, 'id'>[], datesToOverwrite: string[]) => Promise<void>;
    onBulkCleanup?: (year: number) => Promise<void>;
}

type ImportPhase = 'loading' | 'preview' | 'importing' | 'done' | 'error';

export const ImportModal: React.FC<ImportModalProps> = ({
    show,
    onClose,
    selectedBranchId,
    existingTransactions,
    currentUser,
    onImport,
    onBulkCleanup,
}) => {
    const [phase, setPhase] = useState<ImportPhase>('loading');
    const [importData, setImportData] = useState<ParsedImportData | null>(null);
    const [error, setError] = useState('');
    const [conflictDates, setConflictDates] = useState<string[]>([]);
    const [skippedDates, setSkippedDates] = useState<Set<string>>(new Set());
    const [importedCount, setImportedCount] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isCleaning, setIsCleaning] = useState(false);

    useEffect(() => {
        if (show) {
            loadData();
        }
        return () => {
            setPhase('loading');
            setImportData(null);
            setError('');
            setConflictDates([]);
            setSkippedDates(new Set());
            setImportedCount(0);
            setProgress(0);
        };
    }, [show]);

    const loadData = async () => {
        setPhase('loading');
        setError('');
        try {
            const parsed = await fetchAllSheetsAndParse(selectedBranchId, currentUser);

            if (parsed.transactions.length === 0) {
                setError('ไม่พบข้อมูลในชีทที่สามารถนำเข้าได้');
                setPhase('error');
                return;
            }

            setImportData(parsed);

            // Detect conflicting dates
            const existingDates = new Set(
                existingTransactions
                    .filter(t => t.branchId === selectedBranchId)
                    .map(t => t.date)
            );
            const importDates = new Set(parsed.transactions.map(t => t.date));
            const conflicts = Array.from(importDates).filter(d => existingDates.has(d)).sort();
            setConflictDates(conflicts);

            // Default: All conflicts will be overwritten (none skipped)
            setSkippedDates(new Set());

            setPhase('preview');
        } catch (err: any) {
            console.error('Sheet fetch error:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
            setPhase('error');
        }
    };

    const handleImport = async () => {
        if (!importData) return;

        setPhase('importing');
        setProgress(0);

        // Filter out skipped dates
        const transactionsToImport = importData.transactions.filter(
            t => !skippedDates.has(t.date)
        );

        // Dates that need overwriting (conflicting but NOT skipped)
        const datesToOverwrite = conflictDates.filter(d => !skippedDates.has(d));

        try {
            await onImport(transactionsToImport, datesToOverwrite);
            setImportedCount(transactionsToImport.length);
            setPhase('done');
        } catch (err: any) {
            console.error('Import error:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการนำเข้า');
            setPhase('error');
        }
    };
    
    const handleCleanup1969 = async () => {
        if (!onBulkCleanup) return;
        if (!window.confirm('ยืนยันล้างข้อมูลปี 2512 (1969) ที่ผิดทั้งหมดในสาขานี้?')) return;
        
        setIsCleaning(true);
        try {
            await onBulkCleanup(1969);
            alert('ล้างข้อมูลปี 2512 เรียบร้อยแล้ว');
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
                    {/* Phase: Loading */}
                    {phase === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader size={32} className="text-violet-400 animate-spin" />
                            <p className="text-zinc-400 text-sm">กำลังดึงข้อมูลจาก Google Sheets (ขอนแก่น หน้าบ้าน)...</p>
                        </div>
                    )}

                    {/* Phase: Error */}
                    {phase === 'error' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center">
                                <AlertCircle size={32} className="text-rose-400" />
                            </div>
                            <p className="text-rose-400 text-sm text-center">{error}</p>
                            <button
                                onClick={loadData}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    )}

                    {/* Phase: Preview */}
                    {phase === 'preview' && importData && (
                        <>
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 text-center">
                                <p className="text-sm text-zinc-300">
                                    พบรายรับ <span className="text-emerald-400 font-bold">{importData.summary.incomeCount}</span> รายการ / 
                                    รายจ่าย <span className="text-rose-400 font-bold">{importData.summary.expenseCount}</span> รายการ / 
                                    รวม <span className="text-white font-bold">{importData.summary.totalTransactions}</span> รายการ
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(importData.summary.totalIncome)}</p>
                                    <p className="text-xs text-zinc-500">รายรับรวม</p>
                                </div>
                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-rose-400">{formatCurrency(importData.summary.totalExpense)}</p>
                                    <p className="text-xs text-zinc-500">รายจ่ายรวม</p>
                                </div>
                            </div>

                            <p className="text-xs text-zinc-500 text-center">
                                ช่วงวันที่: {formatDateThai(importData.summary.dateRange.start)} — {formatDateThai(importData.summary.dateRange.end)}
                            </p>

                            {/* Cleanup Tool */}
                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Trash2 size={16} className="text-rose-400" />
                                    <span className="text-sm font-bold text-rose-400">เครื่องมือจัดการข้อมูล</span>
                                </div>
                                <p className="text-xs text-zinc-400">
                                    หากต้องการล้างข้อมูลเก่าที่นำเข้าผิด (ปี พ.ศ. 2512) ให้กดปุ่มด้านล่างนี้
                                </p>
                                <button
                                    onClick={handleCleanup1969}
                                    disabled={isCleaning}
                                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold border border-rose-500/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isCleaning ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    ล้างข้อมูลปี 2512 (1969) ทั้งหมด
                                </button>
                            </div>

                            {/* Conflict Info */}
                            {conflictDates.length > 0 && (
                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={16} className="text-rose-400" />
                                        <span className="text-sm font-bold text-rose-400">
                                            พบข้อมูลซ้ำ {conflictDates.length} วัน
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        มีข้อมูลเดิมอยู่ในระบบแล้ว กรุณาเลือกว่าจะ "ข้าม" หรือ "เขียนทับ" สำหรับแต่ละวัน:
                                    </p>
                                    
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {conflictDates.map(date => {
                                            const isSkipped = skippedDates.has(date);
                                            return (
                                                <div key={date} className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5">
                                                    <span className="text-[11px] text-zinc-300 font-mono">{formatDateThai(date)}</span>
                                                    <div className="flex bg-zinc-800 rounded-md p-0.5">
                                                        <button
                                                            onClick={() => {
                                                                const next = new Set(skippedDates);
                                                                next.add(date);
                                                                setSkippedDates(next);
                                                            }}
                                                            className={`px-2 py-1 text-[10px] rounded transition-colors ${isSkipped ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            ข้าม
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const next = new Set(skippedDates);
                                                                next.delete(date);
                                                                setSkippedDates(next);
                                                            }}
                                                            className={`px-2 py-1 text-[10px] rounded transition-colors ${!isSkipped ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            เขียนทับ
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Action summary */}
                            <div className="text-sm text-center text-zinc-400 pt-2">
                                จะอัปเดตข้อมูลทั้งหมด <span className="text-white font-bold">{importData.transactions.length}</span> รายการ
                            </div>
                        </>
                    )}

                    {/* Phase: Importing */}
                    {phase === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader size={32} className="text-violet-400 animate-spin" />
                            <p className="text-zinc-400 text-sm">กำลังนำเข้าข้อมูล...</p>
                            <div className="w-full bg-zinc-800 rounded-full h-2">
                                <div
                                    className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
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
                                    นำเข้าทั้งหมด <span className="text-emerald-400 font-bold">{importedCount}</span> รายการ
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
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors font-medium text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold text-sm shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                            >
                                <Download size={16} />
                                ยืนยัน Import & Sync
                            </button>
                        </div>
                    )}
                    {phase === 'done' && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors font-bold text-sm"
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
        </div>
    );
};

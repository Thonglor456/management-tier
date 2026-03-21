import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Calculator from 'lucide-react/dist/esm/icons/calculator';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Save from 'lucide-react/dist/esm/icons/save';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { ACCOUNTS } from '../constants';
import type { AccountBalance } from '../types';
import { addReconciliation, addTransaction } from '../services/dataService';

interface ReconciliationModalProps {
    show: boolean;
    onClose: () => void;
    balances: AccountBalance;
    formatCurrency: (num: number) => string;
    currentUser: any;
    selectedBranchId: string;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
    show,
    onClose,
    balances,
    formatCurrency,
    currentUser,
    selectedBranchId
}) => {
    // Local state to store actual values input by user
    // Initialize with 0 or string empty
    const [actuals, setActuals] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isAdjusting, setIsAdjusting] = useState(false);

    // Reset when opening
    useEffect(() => {
        if (show) {
            setActuals({});
        }
    }, [show]);

    if (!show) return null;

    const handleInputChange = (id: string, value: string) => {
        setActuals(prev => ({ ...prev, [id]: value }));
    };

    const calculateDiff = (system: number, actualStr: string) => {
        if (!actualStr) return null;
        const actual = parseFloat(actualStr);
        return actual - system;
    };

    const handleSave = async () => {
        if (!window.confirm('ยืนยันการบันทึกการตรวจสอบยอดเงิน?')) return;

        setIsSaving(true);
        try {
            const items = ACCOUNTS.map(acc => {
                const systemAmount = balances[acc.id as keyof AccountBalance] || 0;
                const actualInput = actuals[acc.id] || '0';
                const actualAmount = parseFloat(actualInput);
                const diff = actualAmount - systemAmount;

                return {
                    accountId: acc.id,
                    systemAmount,
                    actualAmount,
                    diff
                };
            });

            const totalDiff = items.reduce((sum, item) => sum + item.diff, 0);

            await addReconciliation({
                branchId: selectedBranchId,
                date: new Date().toISOString(),
                items,
                totalDiff,
                createdBy: currentUser?.username || 'unknown',
                note: ''
            });

            alert('บันทึกข้อมูลเรียบร้อยแล้ว');
            onClose();
        } catch (error) {
            console.error('Error saving reconciliation:', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdjust = async () => {
        // 1. Identify what needs to be adjusted
        const adjustments: { accId: string, diff: number, accName: string }[] = [];

        ACCOUNTS.forEach(acc => {
            // Only adjust if user changed the input
            // If empty, we ignore it (safer than assuming 0)
            if (actuals[acc.id] !== undefined && actuals[acc.id] !== '') {
                const systemAmount = balances[acc.id as keyof AccountBalance] || 0;
                const actualAmount = parseFloat(actuals[acc.id]);
                const diff = actualAmount - systemAmount;
                if (diff !== 0) {
                    adjustments.push({ accId: acc.id, diff, accName: acc.name });
                }
            }
        });

        if (adjustments.length === 0) {
            alert('ไม่มียอดที่ต้องปรับ (กรุณากรอกยอดจริง และยอดต้องไม่เท่ากับระบบ)');
            return;
        }

        // 2. Confirm with user
        const message = adjustments.map(a =>
            `- ${a.accName}: ${a.diff > 0 ? '+' : ''}${formatCurrency(a.diff)}`
        ).join('\n');

        if (!window.confirm(`ระบบจะทำการปรับยอดบัญชีดังนี้:\n\n${message}\n\nยืนยันหรือไม่?`)) return;

        setIsAdjusting(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const promises = adjustments.map(async adj => {
                await addTransaction({
                    branchId: selectedBranchId,
                    date: today,
                    type: 'ADJUSTMENT',
                    name: `ตัวปรับยอด (${adj.accName})`,
                    amount: adj.diff, // Signed amount
                    category: 'Balance Adjustment (ยกยอด)',
                    paymentMethod: adj.accId,
                    note: 'Auto-adjustment from Reconciliation',
                    createdBy: currentUser?.username || 'system'
                });
            });

            await Promise.all(promises);

            alert('ปรับยอดบัญชีเรียบร้อยแล้ว');
            onClose();
        } catch (error) {
            console.error('Error adjusting balance:', error);
            alert('เกิดข้อผิดพลาดในการปรับยอด');
        } finally {
            setIsAdjusting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                <div className="p-4 flex justify-between items-center bg-zinc-800 border-b border-zinc-700">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calculator className="text-violet-400" /> ตรวจสอบยอดเงิน (Reconciliation)
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 text-sm font-bold text-zinc-500 mb-2 px-2">
                            <div className="col-span-4">บัญชี</div>
                            <div className="col-span-3 text-right">ในระบบ</div>
                            <div className="col-span-3 text-right">นับจริง</div>
                            <div className="col-span-2 text-center">ผลต่าง</div>
                        </div>

                        {ACCOUNTS.map(acc => {
                            const systemAmount = balances[acc.id as keyof AccountBalance] || 0;
                            const actualInput = actuals[acc.id] || '';
                            const diff = calculateDiff(systemAmount, actualInput);

                            let statusColor = 'text-zinc-500';
                            let statusIcon = null;

                            if (actualInput !== '') {
                                if (diff === 0) {
                                    statusColor = 'text-emerald-400';
                                    statusIcon = <CheckCircle size={16} />;
                                } else if (diff && diff < 0) {
                                    statusColor = 'text-rose-400'; // Missing money
                                    statusIcon = <AlertCircle size={16} />;
                                } else {
                                    statusColor = 'text-blue-400'; // Extra money
                                    statusIcon = <AlertCircle size={16} />;
                                }
                            }

                            return (
                                <div key={acc.id} className="grid grid-cols-12 gap-4 items-center bg-black/40 p-3 rounded-xl border border-zinc-800 hover:border-violet-500/30 transition-colors">
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                                            {acc.icon}
                                        </div>
                                        <span className="font-medium text-zinc-200">{acc.name}</span>
                                    </div>

                                    <div className="col-span-3 text-right font-mono text-zinc-300">
                                        {formatCurrency(systemAmount)}
                                    </div>

                                    <div className="col-span-3">
                                        <input
                                            type="number"
                                            value={actualInput}
                                            onChange={(e) => handleInputChange(acc.id, e.target.value)}
                                            placeholder="ระบุยอดจริง"
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-right text-white outline-none focus:ring-2 focus:ring-violet-500 transition-all font-bold placeholder-zinc-700"
                                        />
                                    </div>

                                    <div className={`col-span-2 flex justify-center items-center gap-1 font-bold ${statusColor}`}>
                                        {diff !== null ? (
                                            <>
                                                {diff > 0 ? '+' : ''}{diff.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                                                {statusIcon}
                                            </>
                                        ) : (
                                            <span className="text-zinc-700">-</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl">
                        <h4 className="text-violet-300 font-bold mb-2 text-sm">💡 คำแนะนำ</h4>
                        <ul className="text-xs text-zinc-400 list-disc list-inside space-y-1">
                            <li>กรอกยอดเงินที่นับได้จริงในช่อง "นับจริง"</li>
                            <li>หากผลต่างเป็น <span className="text-emerald-400">0</span> แสดงว่ายอดเงินตรงกับระบบ (ถูกต้อง)</li>
                            <li>หากผลต่างเป็น <span className="text-rose-400">ติดลบ</span> แสดงว่าเงินขาด (Short)</li>
                            <li>หากผลต่างเป็น <span className="text-blue-400">บวก</span> แสดงว่าเงินเกิน (Over)</li>
                        </ul>
                    </div>

                    <div className="mt-6 flex justify-between">
                        <button
                            onClick={handleAdjust}
                            disabled={isSaving || isAdjusting}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl font-medium transition-all text-sm disabled:opacity-50 border border-zinc-700 hover:text-white"
                        >
                            <RefreshCw size={16} />
                            {isAdjusting ? 'กำลังปรับยอด...' : 'ปรับยอดให้ตรง (Adjust)'}
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || isAdjusting}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-violet-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตรวจสอบ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

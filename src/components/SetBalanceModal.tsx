import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { ACCOUNTS } from '../constants';
import type { AccountBalance } from '../types';
import { addTransaction } from '../services/dataService';

interface SetBalanceModalProps {
    show: boolean;
    onClose: () => void;
    balances: AccountBalance;
    formatCurrency: (num: number) => string;
    currentUser: any;
    selectedBranchId: string;
}

export const SetBalanceModal: React.FC<SetBalanceModalProps> = ({
    show,
    onClose,
    balances,
    formatCurrency,
    currentUser,
    selectedBranchId
}) => {
    const [selectedAccount, setSelectedAccount] = useState<string>(ACCOUNTS[0].id);
    const [amount, setAmount] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setAmount('');
            setSelectedAccount(ACCOUNTS[0].id);
        }
    }, [show]);

    if (!show) return null;

    const handleSave = async () => {
        if (!amount) return;
        const targetAmount = parseFloat(amount);
        const currentAmount = balances[selectedAccount as keyof AccountBalance] || 0;
        const diff = targetAmount - currentAmount;

        if (diff === 0) {
            alert('ยอดเงินเท่าเดิม ไม่มีการเปลี่ยนแปลง');
            return;
        }

        const accountName = ACCOUNTS.find(a => a.id === selectedAccount)?.name;

        if (!window.confirm(`ยืนยันการปรับยอด (Opening/Set Balance)\nบัญชี: ${accountName}\nจาก: ${formatCurrency(currentAmount)}\nเป็น: ${formatCurrency(targetAmount)}\n(ผลต่าง: ${diff > 0 ? '+' : ''}${formatCurrency(diff)})`)) {
            return;
        }

        setIsSaving(true);
        try {
            await addTransaction({
                branchId: selectedBranchId,
                date: new Date().toISOString().split('T')[0],
                type: 'ADJUSTMENT',
                name: `ยกยอด/ตั้งต้น (${accountName})`,
                amount: diff,
                category: 'Set Balance (ยกยอด)',
                paymentMethod: selectedAccount,
                note: `Manual Set Balance from ${currentAmount} to ${targetAmount}`,
                createdBy: currentUser?.username || 'system'
            });

            alert('บันทึกยอดตั้งต้นเรียบร้อยแล้ว');
            onClose();
        } catch (error) {
            console.error('Error setting balance:', error);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden animate-slide-up">
                <div className="p-4 flex justify-between items-center bg-zinc-800 border-b border-zinc-700">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <RefreshCw className="text-zinc-400" /> ยกยอด / ตั้งต้น (Set Balance)
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-zinc-400 text-sm font-bold mb-2">เลือกบัญชี</label>
                        <div className="grid grid-cols-1 gap-2">
                            {ACCOUNTS.map(acc => (
                                <button
                                    key={acc.id}
                                    onClick={() => setSelectedAccount(acc.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedAccount === acc.id
                                        ? 'bg-violet-600/20 border-violet-500 text-white'
                                        : 'bg-black/20 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {acc.icon}
                                        <span>{acc.name}</span>
                                    </div>
                                    <span className="font-mono text-sm opacity-60">
                                        ปัจจุบัน: {formatCurrency(balances[acc.id as keyof AccountBalance] || 0)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-zinc-400 text-sm font-bold mb-2">ระบุยอดเงินที่ถูกต้อง (ยอดสุทธิ)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="เช่น 10000"
                            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-2xl font-bold text-white outline-none focus:ring-2 focus:ring-violet-500 text-center placeholder-zinc-800"
                            autoFocus
                        />
                        <p className="text-xs text-zinc-500 mt-2 text-center">
                            ระบบจะทำการสร้างรายการปรับปรุง (Adjustment) ให้อัตโนมัติ <br />
                            โดยไม่นับรวมเป็นรายรับ/รายจ่าย
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !amount}
                        className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกยอด (Save Balance)'}
                    </button>
                </div>
            </div>
        </div>
    );
};

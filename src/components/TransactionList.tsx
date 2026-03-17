import React, { useState } from 'react';
import Filter from 'lucide-react/dist/esm/icons/filter';
import List from 'lucide-react/dist/esm/icons/list';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import ArrowRightLeft from 'lucide-react/dist/esm/icons/arrow-right-left';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Coins from 'lucide-react/dist/esm/icons/coins';
import Download from 'lucide-react/dist/esm/icons/download';
import type { Transaction, Branch, User } from '../types';

interface TransactionListProps {
    groupedTransactions: { date: string, items: Transaction[] }[];
    selectedBranchId: string;
    currentBranchName: string;
    branches: Branch[];
    currentUser: User;
    formatCurrency: (num: number) => string;
    formatDateThai: (dateStr: string) => string;
    onEdit: (t: Transaction) => void;
    onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
    groupedTransactions,
    selectedBranchId,
    currentBranchName,
    branches,
    currentUser,
    formatCurrency,
    formatDateThai,
    onEdit,
    onDelete
}) => {
    const canEdit = (t: Transaction) =>
        currentUser.role === 'ADMIN' || t.createdBy === currentUser.username;
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterType, setFilterType] = useState<Transaction['type'] | 'ALL'>('ALL');

    const handleExport = () => {
        // Flatten transactions from groups
        const allTransactions = groupedTransactions.flatMap(g => g.items);

        if (allTransactions.length === 0) {
            alert('ไม่มีข้อมูลให้ส่งออก');
            return;
        }

        // CSV Header
        const headers = ['วันที่', 'เวลา', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน', 'ช่องทาง', 'บัญชีปลายทาง', 'บันทึกช่วยจำ', 'สาขา', 'ผู้บันทึก'];

        // CSV Rows
        const rows = allTransactions.map(t => {

            const branchName = branches.find(b => b.id === t.branchId)?.name || t.branchId;

            return [
                t.date,
                '-', // Time is not currently stored in date string (YYYY-MM-DD), placeholder
                t.type === 'INCOME' ? 'รายรับ' : t.type === 'EXPENSE' ? 'รายจ่าย' : t.type === 'TRANSFER' ? 'โอนย้าย' : t.type === 'DIVIDEND' ? 'ปันผล' : 'ปรับยอด',
                `"${t.category}"`, // Quote to handle commas
                t.amount,
                t.paymentMethod,
                t.toAccount || '-',
                `"${t.note || ''}"`,
                `"${branchName}"`,
                t.createdBy
            ].join(',');
        });

        // Combine with BOM for Excel Thai support
        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-zinc-200">ประวัติรายการ {selectedBranchId !== 'HQ' && <span className="text-violet-400 text-sm font-normal">({currentBranchName})</span>}</h3>
                <div className="flex gap-2 relative">
                    <button onClick={handleExport} className="text-emerald-400 flex items-center gap-1 text-sm bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full hover:bg-zinc-800 transition-colors">
                        <Download size={14} /> Export CSV
                    </button>
                    <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`flex items-center gap-1 text-sm bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full transition-colors ${filterType !== 'ALL' ? 'text-violet-400 border-violet-500/50' : 'text-zinc-400'}`}>
                        <Filter size={14} />
                        {filterType === 'ALL' ? 'ตัวกรอง' :
                            filterType === 'INCOME' ? 'รายรับ' :
                                filterType === 'EXPENSE' ? 'รายจ่าย' :
                                    filterType === 'TRANSFER' ? 'โอนย้าย' :
                                        filterType === 'DIVIDEND' ? 'ปันผล' : 'ปรับยอด'}
                    </button>

                    {/* Filter Menu */}
                    {showFilterMenu && (
                        <div className="absolute top-full right-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20 animate-fade-in">
                            <button onClick={() => { setFilterType('ALL'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 ${filterType === 'ALL' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-300'}`}>ทั้งหมด</button>
                            <button onClick={() => { setFilterType('INCOME'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 ${filterType === 'INCOME' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300'}`}>รายรับ</button>
                            <button onClick={() => { setFilterType('EXPENSE'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 ${filterType === 'EXPENSE' ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-300'}`}>รายจ่าย</button>
                            <button onClick={() => { setFilterType('DIVIDEND'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 ${filterType === 'DIVIDEND' ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-300'}`}>ปันผล</button>
                            <button onClick={() => { setFilterType('TRANSFER'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 ${filterType === 'TRANSFER' ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-300'}`}>โอนย้าย</button>
                            <button onClick={() => { setFilterType('ADJUSTMENT'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 ${filterType === 'ADJUSTMENT' ? 'text-zinc-400 bg-zinc-500/10' : 'text-zinc-300'}`}>ปรับยอด</button>
                        </div>
                    )}
                </div>
            </div>

            {groupedTransactions.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed">
                    <List size={48} className="mx-auto mb-2 opacity-20" />
                    <p>ไม่พบรายการในสาขานี้</p>
                </div>
            ) : (
                groupedTransactions.map(group => {
                    // Filter items within the group
                    const filteredItems = filterType === 'ALL' ? group.items : group.items.filter(t => t.type === filterType);

                    if (filteredItems.length === 0) return null;

                    const dailyIncome = filteredItems.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
                    const dailyExpense = filteredItems.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                    const dailyNet = dailyIncome - dailyExpense;

                    return (
                        <div key={group.date} className="bg-zinc-900 rounded-xl shadow-sm overflow-hidden border border-zinc-800">
                            <div className="bg-black p-4 flex justify-between items-center border-b border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-zinc-200 text-sm">{formatDateThai(group.date)}</h4>
                                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{filteredItems.length} รายการ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500">สุทธิ:</span>
                                    <span className={`text-sm font-bold ${dailyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {dailyNet > 0 ? '+' : ''}{formatCurrency(dailyNet)}
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y divide-zinc-800">
                                {filteredItems.map(t => (
                                    <div key={t.id} className="p-4 hover:bg-zinc-800/50 flex justify-between items-center transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : t.type === 'EXPENSE' ? 'bg-rose-500/10 text-rose-400' : t.type === 'TRANSFER' ? 'bg-blue-500/10 text-blue-400' : t.type === 'DIVIDEND' ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                                                {t.type === 'INCOME' ? <TrendingUp size={16} /> : t.type === 'EXPENSE' ? <TrendingDown size={16} /> : t.type === 'TRANSFER' ? <ArrowRightLeft size={16} /> : t.type === 'DIVIDEND' ? <Coins size={16} /> : <RefreshCw size={16} />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-zinc-200 text-sm">{t.category}</div>
                                                <div className="text-xs text-zinc-500 flex items-center gap-2">
                                                    {selectedBranchId === 'HQ' && <span className="text-violet-300 bg-violet-900/20 px-1 rounded">{branches.find(b => b.id === t.branchId)?.name.split(' ')[1]}</span>}
                                                    {t.note && <span>• {t.note}</span>}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                                        t.type === 'EXPENSE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                                            t.type === 'TRANSFER' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                                t.type === 'DIVIDEND' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                                                    'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'
                                                        }`}>
                                                        {t.type === 'INCOME' ? 'รายรับ' : t.type === 'EXPENSE' ? 'รายจ่าย' : t.type === 'TRANSFER' ? 'โอนย้าย' : t.type === 'DIVIDEND' ? 'ปันผล' : 'ปรับยอด'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-emerald-400' :
                                                t.type === 'EXPENSE' ? 'text-rose-400' :
                                                    t.type === 'DIVIDEND' ? 'text-purple-400' :
                                                        t.type === 'ADJUSTMENT' ? (t.amount >= 0 ? 'text-emerald-400' : 'text-rose-400') :
                                                            'text-blue-400'
                                                }`}>
                                                {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : t.type === 'DIVIDEND' ? '-' : t.type === 'ADJUSTMENT' ? (t.amount >= 0 ? '+' : '') : ''}
                                                {formatCurrency(Math.abs(t.amount))}
                                            </span>
                                            <div className="flex gap-1">
                                                {canEdit(t) && (
                                                    <>
                                                        <button onClick={() => onEdit(t)} className="text-zinc-600 hover:text-violet-400 p-1"><Edit2 size={14} /></button>
                                                        <button onClick={() => onDelete(t.id)} className="text-zinc-600 hover:text-rose-400 p-1"><Trash2 size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

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
import Upload from 'lucide-react/dist/esm/icons/upload';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import X from 'lucide-react/dist/esm/icons/x';
import type { Transaction, Branch, User } from '../types';
import { ImportModal } from './ImportModal';

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
    // Import props
    allTransactions?: Transaction[];
    onImportTransactions?: (transactions: Omit<Transaction, 'id'>[], datesToOverwrite: string[]) => Promise<void>;
    onBulkCleanup?: (year: number) => Promise<void>;
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
    onDelete,
    allTransactions = [],
    onImportTransactions,
    onBulkCleanup,
}) => {
    const [showImportModal, setShowImportModal] = useState(false);
    const canEdit = (t: Transaction) =>
        currentUser.role === 'ADMIN' || t.createdBy === currentUser.username;
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterType, setFilterType] = useState<Transaction['type'] | 'ALL'>('ALL');
    
    // Date Filtering State
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');
    const [showDateMenu, setShowDateMenu] = useState(false);

    // Helpers for Date Filtering
    const setToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDateFilter(today);
        setEndDateFilter(today);
        setShowDateMenu(false);
    };

    const setYesterday = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        setStartDateFilter(yStr);
        setEndDateFilter(yStr);
        setShowDateMenu(false);
    };

    const setThisWeek = () => {
        const now = new Date();
        const first = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1); // Monday
        const monday = new Date(now.setDate(first)).toISOString().split('T')[0];
        setStartDateFilter(monday);
        setEndDateFilter(new Date().toISOString().split('T')[0]);
        setShowDateMenu(false);
    };

    const setThisMonth = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        setStartDateFilter(firstDay);
        setEndDateFilter(new Date().toISOString().split('T')[0]);
        setShowDateMenu(false);
    };

    const clearDateFilter = () => {
        setStartDateFilter('');
        setEndDateFilter('');
        setShowDateMenu(false);
    };

    // Filter Logic
    const filteredGroupedTransactions = groupedTransactions.map(group => {
        const filteredItems = group.items.filter(t => {
            const matchesType = filterType === 'ALL' || t.type === filterType;
            const matchesDate = (!startDateFilter || t.date >= startDateFilter) && 
                                (!endDateFilter || t.date <= endDateFilter);
            return matchesType && matchesDate;
        });

        return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);

    const handleExport = () => {
        // Flatten transactions from filtered groups
        const allTransactions = filteredGroupedTransactions.flatMap(g => g.items);

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
                    {onImportTransactions && (
                        <button onClick={() => setShowImportModal(true)} className="text-violet-400 flex items-center gap-1 text-sm bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full hover:bg-zinc-800 transition-colors">
                            <Upload size={14} /> 📥 นำเข้า Sheet
                        </button>
                    )}
                    <button onClick={handleExport} className="text-emerald-400 flex items-center gap-1 text-sm bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full hover:bg-zinc-800 transition-colors">
                        <Download size={14} /> Export CSV
                    </button>
                    {/* Filter Mode - Type */}
                    <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`flex items-center gap-1 text-sm bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full transition-colors ${filterType !== 'ALL' ? 'text-violet-400 border-violet-500/50' : 'text-zinc-400'}`}>
                        <Filter size={14} />
                        {filterType === 'ALL' ? 'ตัวกรอง' :
                            filterType === 'INCOME' ? 'รายรับ' :
                                filterType === 'EXPENSE' ? 'รายจ่าย' :
                                    filterType === 'TRANSFER' ? 'โอนย้าย' :
                                        filterType === 'DIVIDEND' ? 'ปันผล' : 'ปรับยอด'}
                    </button>

                    {/* Date Filter */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDateMenu(!showDateMenu)}
                            className={`flex items-center gap-1 text-sm bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full transition-colors ${startDateFilter || endDateFilter ? 'text-violet-400 border-violet-500/50' : 'text-zinc-400'}`}
                        >
                            <Calendar size={14} />
                            {!startDateFilter && !endDateFilter ? 'ปฏิทิน' :
                                startDateFilter === endDateFilter ? startDateFilter :
                                    `${startDateFilter} - ${endDateFilter}`}
                        </button>

                        {showDateMenu && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-20 animate-fade-in p-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={setToday} className="text-xs py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg">วันนี้</button>
                                        <button type="button" onClick={setYesterday} className="text-xs py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg">เมื่อวาน</button>
                                        <button type="button" onClick={setThisWeek} className="text-xs py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg">สัปดาห์นี้</button>
                                        <button type="button" onClick={setThisMonth} className="text-xs py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg">เดือนนี้</button>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">จากวันที่</span>
                                            <input
                                                type="date"
                                                value={startDateFilter}
                                                onChange={(e) => setStartDateFilter(e.target.value)}
                                                className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">ถึงวันที่</span>
                                            <input
                                                type="date"
                                                value={endDateFilter}
                                                onChange={(e) => setEndDateFilter(e.target.value)}
                                                className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={clearDateFilter}
                                            className="flex-1 text-xs py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg flex items-center justify-center gap-1"
                                        >
                                            <X size={12} /> ล้างตาราง
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDateMenu(false)}
                                            className="flex-1 text-xs py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold"
                                        >
                                            ตกลง
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filter Type Menu */}
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

            {filteredGroupedTransactions.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed">
                    <List size={48} className="mx-auto mb-2 opacity-20" />
                    <p>{startDateFilter || endDateFilter || filterType !== 'ALL' ? 'ไม่พบรายการที่ตรงตามเงื่อนไข' : 'ไม่พบรายการในสาขานี้'}</p>
                    {(startDateFilter || endDateFilter || filterType !== 'ALL') && (
                        <button onClick={() => { clearDateFilter(); setFilterType('ALL'); }} className="mt-4 text-violet-400 text-sm hover:underline">ล้างการเลือกทั้งหมด</button>
                    )}
                </div>
            ) : (
                filteredGroupedTransactions.map(group => {
                    const filteredItems = group.items;

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
                                                <div className="font-medium text-zinc-200 text-sm">
                                                    {t.name || t.note || t.category}
                                                </div>
                                                <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-2 mt-1">
                                                    {selectedBranchId === 'HQ' && <span className="text-violet-300 bg-violet-900/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-violet-500/20">{branches.find(b => b.id === t.branchId)?.name.split(' ')[1]}</span>}
                                                    
                                                    {/* 1. Payment Method / Channel */}
                                                    <span className="flex items-center gap-1 bg-zinc-800/50 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/50">
                                                        {t.paymentMethod === 'cash' ? <TrendingUp size={10} className="text-emerald-400" /> : 
                                                         t.paymentMethod === 'bank' ? <ArrowRightLeft size={10} className="text-blue-400" /> : 
                                                         <TrendingUp size={10} className="text-orange-400" />}
                                                        {t.paymentMethod === 'cash' ? 'เงินสด' : t.paymentMethod === 'bank' ? 'ธนาคาร' : 'Delivery'}
                                                    </span>

                                                    {/* 2. Type Badge */}
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        t.type === 'EXPENSE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                            t.type === 'TRANSFER' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                                t.type === 'DIVIDEND' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                                                    'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                                                        }`}>
                                                        {t.type === 'INCOME' ? 'รายรับ' : t.type === 'EXPENSE' ? 'รายจ่าย' : t.type === 'TRANSFER' ? 'โอนย้าย' : t.type === 'DIVIDEND' ? 'ปันผล' : 'ปรับยอด'}
                                                    </span>

                                                    {/* 3. Category Badge */}
                                                    <span className="bg-zinc-800/50 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/50">
                                                        {t.category}
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
            {/* Import Modal */}
            {onImportTransactions && (
                <ImportModal
                    show={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    selectedBranchId={selectedBranchId}
                    existingTransactions={allTransactions}
                    currentUser={currentUser.username}
                    onImport={onImportTransactions}
                    onBulkCleanup={onBulkCleanup}
                />
            )}
        </div>
    );
};

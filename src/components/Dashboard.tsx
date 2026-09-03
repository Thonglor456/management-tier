import React, { useState } from 'react';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Edit3 from 'lucide-react/dist/esm/icons/edit-3';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Brush
} from 'recharts';
import { Card } from './ui/Card';
import type { AccountBalance, Transaction } from '../types';
import { ACCOUNTS } from '../constants';

interface DashboardProps {
    stats: {
        dailyIncome: number;
        dailyExpense: number;
        monthlyIncome: number;
        monthlyExpense: number;
    };
    balances: AccountBalance;
    chartData: { name: string; income: number; expense: number; fullDate: string }[];
    dailyTransactions: Transaction[];
    chartView: '7d' | '1m' | '3m';
    setChartView: (view: '7d' | '1m' | '3m') => void;
    formatCurrency: (num: number) => string;
    startDate: string;
    endDate: string;
    onRangeChange: (start: string, end: string) => void;
    selectedBranchId: string;
    currentBranch?: { id: string; name: string; actualBankBalance?: number; actualCashBalance?: number; actualDeliveryBalance?: number };
    onUpdateActualBalance?: (branchId: string, amount: number, accountId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    stats,
    balances,
    chartData,
    chartView,
    setChartView,
    formatCurrency,
    startDate,
    endDate,
    onRangeChange,
    selectedBranchId,
    currentBranch,
    dailyTransactions,
    onUpdateActualBalance
}) => {
    const [editingAccount, setEditingAccount] = useState<string | null>(null);
    const [actualBalanceInput, setActualBalanceInput] = useState('');
    const [touchStart, setTouchStart] = useState<number | null>(null);

    // Brush State
    const [brushState, setBrushState] = useState({ startIndex: 0, endIndex: 6 });

    // Sync Brush with Chart View Buttons
    React.useEffect(() => {
        const total = chartData.length;
        if (total === 0) return;

        let days = 7;
        if (chartView === '1m') days = 30;
        if (chartView === '3m') days = 90;

        // Ensure we don't go out of bounds
        const start = Math.max(0, total - days);
        const end = Math.max(0, total - 1);

        setBrushState({ startIndex: start, endIndex: end });
    }, [chartView, chartData.length]);

    const changeDate = (days: number) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setDate(start.getDate() + days);
        end.setDate(end.getDate() + days);
        onRangeChange(
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0]
        );
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;

        if (Math.abs(diff) > 50) { // Threshold for swipe
            if (diff > 0) changeDate(1); // Swipe left -> Next day
            else changeDate(-1); // Swipe right -> Prev day
        }
        setTouchStart(null);
    };

    const handleEditBalance = (accountId: string, currentValue?: number) => {
        setActualBalanceInput(currentValue?.toString() || balances[accountId as keyof AccountBalance]?.toString() || '0');
        setEditingAccount(accountId);
    };

    const handleSaveBalance = () => {
        const amount = parseFloat(actualBalanceInput);
        if (!isNaN(amount) && onUpdateActualBalance && selectedBranchId !== 'HQ' && editingAccount) {
            onUpdateActualBalance(selectedBranchId, amount, editingAccount);
        }
        setEditingAccount(null);
    };

    const handleCancelEdit = () => {
        setEditingAccount(null);
        setActualBalanceInput('');
    };

    // Category breakdown, sorted highest amount first, with each item's share of its own total
    const buildBreakdown = (type: 'INCOME' | 'EXPENSE') => {
        const grouped = dailyTransactions
            .filter(t => t.type === type)
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);
        const entries = Object.entries(grouped).sort(([, a], [, b]) => b - a);
        const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
        return entries.map(([category, amount]) => ({
            category,
            amount,
            pct: total > 0 ? (amount / total) * 100 : 0,
        }));
    };
    const incomeBreakdown = buildBreakdown('INCOME');
    const expenseBreakdown = buildBreakdown('EXPENSE');

    return (
        <div
            className="space-y-6 animate-fade-in"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* New Dashboard Header with Date Picker */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="text-terracotta-400" /> {startDate === endDate ? 'ภาพรวมรายวัน' : 'ภาพรวมตามช่วงเวลา'}
                        </h2>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${selectedBranchId === 'HQ' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-terracotta-500/10 border-terracotta-500/30 text-terracotta-400'}`}>
                            {currentBranch?.name || 'ทุกสาขา'}
                        </span>
                    </div>
                    <p className="text-zinc-400 text-xs">
                        {startDate === endDate
                            ? `ข้อมูลประจำวันที่ ${new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`
                            : `ตั้งแต่วันที่ ${new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ถึง ${new Date(endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-1 w-full sm:w-auto">
                    <button
                        onClick={() => changeDate(-1)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="วันก่อนหน้า"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => onRangeChange(e.target.value, endDate)}
                            className="bg-transparent text-white outline-none w-full text-base cursor-pointer"
                        />
                        <span className="text-zinc-500 font-medium">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => onRangeChange(startDate, e.target.value)}
                            className="bg-transparent text-white outline-none w-full text-base cursor-pointer"
                        />
                    </div>
                    <button
                        onClick={() => changeDate(1)}
                        className="p-3 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="วันถัดไป"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Revenue Card */}
                <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border-l-4 border-l-emerald-400 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={100} className="text-emerald-400" /></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-emerald-400/80 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                                    Total Revenue
                                    <span className="text-xs bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded-full">
                                        {startDate === endDate ? 'วันนี้' : 'ช่วงเวลา'}
                                    </span>
                                </p>
                                <h3 className="text-4xl font-bold text-white tracking-tight">{formatCurrency(stats.dailyIncome)}</h3>
                            </div>
                            <div className="p-3 bg-emerald-400/10 rounded-2xl backdrop-blur-sm border border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                                <TrendingUp className="text-emerald-400" size={24} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Total Expenses Card */}
                <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border-l-4 border-l-rose-400 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingDown size={100} className="text-rose-400" /></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-rose-400/80 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                                    Total Expenses
                                    <span className="text-xs bg-rose-400/10 text-rose-400 px-2 py-0.5 rounded-full">
                                        {startDate === endDate ? 'วันนี้' : 'ช่วงเวลา'}
                                    </span>
                                </p>
                                <h3 className="text-4xl font-bold text-white tracking-tight">{formatCurrency(stats.dailyExpense)}</h3>
                            </div>
                            <div className="p-3 bg-rose-400/10 rounded-2xl backdrop-blur-sm border border-rose-400/20 shadow-[0_0_15px_rgba(251,113,133,0.15)]">
                                <TrendingDown className="text-rose-400" size={24} />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold text-d-200 flex items-center gap-2">
                            <Calendar size={20} className="text-terracotta-400" /> แนวโน้มการเงิน
                        </h3>
                        <div className="px-3 py-1.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl text-sm font-semibold whitespace-nowrap shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                            <span className="text-zinc-400 mr-2">Net Profit:</span>
                            <span className={stats.monthlyIncome - stats.monthlyExpense >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                {stats.monthlyIncome - stats.monthlyExpense > 0 ? '+' : ''}{formatCurrency(stats.monthlyIncome - stats.monthlyExpense)}
                            </span>
                        </div>
                    </div>
                    <div className="flex bg-black p-1 rounded-lg border border-zinc-800">
                        {['7d', '1m', '3m'].map((view) => (
                            <button key={view} onClick={() => setChartView(view as any)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartView === view ? 'bg-terracotta-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                {view === '7d' ? '7 วัน' : view === '1m' ? '1 เดือน' : '3 เดือน'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                            onClick={(data: any) => {
                                if (data && data.activePayload && data.activePayload[0]) {
                                    const date = data.activePayload[0].payload.fullDate;
                                    onRangeChange(date, date);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#1e293b' }} formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
                            <Bar
                                dataKey="income"
                                name="รายรับ"
                                radius={[4, 4, 0, 0]}
                                barSize={15}
                                className="cursor-pointer"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-income-${index}`}
                                        fill={(entry.fullDate >= startDate && entry.fullDate <= endDate) ? '#10b981' : '#10b98166'}
                                    />
                                ))}
                            </Bar>
                            <Bar
                                dataKey="expense"
                                name="รายจ่าย"
                                radius={[4, 4, 0, 0]}
                                barSize={15}
                                className="cursor-pointer"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-expense-${index}`}
                                        fill={(entry.fullDate >= startDate && entry.fullDate <= endDate) ? '#f43f5e' : '#f43f5e66'}
                                    />
                                ))}
                            </Bar>
                            <Brush
                                dataKey="name"
                                height={30}
                                stroke="#c67240"
                                fill="#18181b"
                                tickFormatter={() => ''}
                                startIndex={brushState.startIndex}
                                endIndex={brushState.endIndex}
                                onChange={(e: any) => {
                                    if (e.startIndex !== undefined && e.endIndex !== undefined) {
                                        setBrushState({ startIndex: e.startIndex, endIndex: e.endIndex });
                                    }
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Day Category Breakdown Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 bg-zinc-900/40 border-zinc-800">
                    <div className="flex items-center justify-between mb-5">
                        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-400/10 rounded-lg border border-emerald-400/20">
                                <TrendingUp size={14} />
                            </div>
                            รายละเอียดรายรับ ({startDate === endDate ? 'รายวัน' : 'ช่วงเวลา'})
                        </h4>
                        <span className="text-xs text-zinc-500 font-medium">{incomeBreakdown.length} รายการ</span>
                    </div>
                    {incomeBreakdown.length === 0 ? (
                        <p className="text-zinc-500 text-xs italic py-2">ไม่มีข้อมูลรายรับ</p>
                    ) : (
                        <div className="space-y-4">
                            {incomeBreakdown.map(({ category, amount, pct }) => (
                                <div key={category} className="group">
                                    <div className="flex justify-between items-baseline gap-3 mb-1.5">
                                        <span className="text-zinc-300 text-sm font-medium truncate">{category}</span>
                                        <div className="flex items-baseline gap-2 flex-shrink-0">
                                            <span className="text-white text-sm font-bold tabular-nums">{formatCurrency(amount)}</span>
                                            <span className="text-emerald-400/70 text-[11px] font-medium tabular-nums w-9 text-right">{pct.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 group-hover:brightness-125"
                                            style={{ width: `${Math.max(pct, 2)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-5 bg-zinc-900/40 border-zinc-800">
                    <div className="flex items-center justify-between mb-5">
                        <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                            <div className="p-1.5 bg-rose-400/10 rounded-lg border border-rose-400/20">
                                <TrendingDown size={14} />
                            </div>
                            รายละเอียดรายจ่าย ({startDate === endDate ? 'รายวัน' : 'ช่วงเวลา'})
                        </h4>
                        <span className="text-xs text-zinc-500 font-medium">{expenseBreakdown.length} รายการ</span>
                    </div>
                    {expenseBreakdown.length === 0 ? (
                        <p className="text-zinc-500 text-xs italic py-2">ไม่มีข้อมูลรายจ่าย</p>
                    ) : (
                        <div className="space-y-4">
                            {expenseBreakdown.map(({ category, amount, pct }) => (
                                <div key={category} className="group">
                                    <div className="flex justify-between items-baseline gap-3 mb-1.5">
                                        <span className="text-zinc-300 text-sm font-medium truncate">{category}</span>
                                        <div className="flex items-baseline gap-2 flex-shrink-0">
                                            <span className="text-white text-sm font-bold tabular-nums">{formatCurrency(amount)}</span>
                                            <span className="text-rose-400/70 text-[11px] font-medium tabular-nums w-9 text-right">{pct.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500 group-hover:brightness-125"
                                            style={{ width: `${Math.max(pct, 2)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ACCOUNTS.map(acc => {
                    const isSystemView = selectedBranchId === 'HQ';
                    const calculatedBalance = balances[acc.id as keyof AccountBalance] || 0;
                    const isEditing = editingAccount === acc.id;

                    // Get actual balance based on account type
                    const actualBalance = acc.id === 'bank'
                        ? currentBranch?.actualBankBalance
                        : acc.id === 'cash'
                            ? currentBranch?.actualCashBalance
                            : acc.id === 'delivery'
                                ? currentBranch?.actualDeliveryBalance
                                : undefined;

                    // Support for non-HQ (branch specific) comparison
                    const canCompare = !isSystemView && (acc.id === 'bank' || acc.id === 'cash' || acc.id === 'delivery');
                    const difference = actualBalance !== undefined ? actualBalance - calculatedBalance : null;
                    const liveDifference = isEditing ? (parseFloat(actualBalanceInput) || 0) - calculatedBalance : null;

                    return (
                        <Card key={acc.id} className={`p-5 transition-all overflow-hidden relative group ${isEditing ? 'ring-2 ring-terracotta-500 shadow-2xl' : 'hover:border-zinc-700 shadow-lg'}`}>
                            {/* Abstract glow effect */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-terracotta-600/5 rounded-full blur-2xl group-hover:bg-terracotta-600/10 transition-colors pointer-events-none" />



                            {isEditing ? (
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-terracotta-600 text-white rounded-2xl shadow-lg border border-terracotta-500">{acc.icon}</div>
                                        <span className="font-bold text-lg text-white">แก้ไขยอด {acc.name}</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end border-b border-zinc-800/50 pb-2 mb-2">
                                            <div>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">ยอดในระบบ</p>
                                                <p className="text-sm font-bold text-zinc-300">{formatCurrency(calculatedBalance)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">ผลต่าง</p>
                                                <p className={`text-sm font-bold ${liveDifference === null || liveDifference === 0 ? 'text-zinc-500' : liveDifference > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {liveDifference !== null && liveDifference > 0 ? '+' : ''}{formatCurrency(liveDifference ?? 0)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-terracotta-400 uppercase tracking-widest block">เงินที่มีอยู่จริง (ACTUAL)</label>
                                            <div className="space-y-2">
                                                <input
                                                    type="number"
                                                    value={actualBalanceInput}
                                                    onChange={(e) => setActualBalanceInput(e.target.value)}
                                                    className="w-full bg-zinc-950/50 border border-terracotta-500/30 rounded-xl px-4 py-3 text-white text-xl font-black outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-transparent transition-all placeholder:text-zinc-800"
                                                    placeholder="0.00"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={handleSaveBalance} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-all shadow-lg border border-emerald-500/50 flex items-center justify-center gap-2">
                                                        <Check size={20} /> บันทึกยอด
                                                    </button>
                                                    <button onClick={handleCancelEdit} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all border border-zinc-700 flex items-center justify-center">
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : canCompare ? (
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-zinc-800 text-terracotta-400 rounded-2xl border border-zinc-700/50 shadow-inner">{acc.icon}</div>
                                        <span className="font-bold text-sm text-zinc-400 uppercase tracking-wider">{acc.name}</span>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">เงินที่มีอยู่จริง (Actual)</p>
                                        <p className={`text-3xl font-black tracking-tight ${actualBalance === undefined ? 'text-zinc-800 italic text-xl' : (actualBalance || 0) < 0 ? 'text-rose-400' : 'text-white'}`}>
                                            {actualBalance !== undefined ? formatCurrency(actualBalance).replace('-', '') : 'ยังไม่ระบุ'}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">ยอดในระบบ</p>
                                            <p className="text-sm font-mono font-bold text-zinc-400">{formatCurrency(calculatedBalance).replace('-', '')}</p>
                                        </div>

                                        {difference !== null && (
                                            <div className="text-right">
                                                {difference === 0 ? (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                                                        <Check size={12} strokeWidth={3} />
                                                        <span className="text-[10px] font-black uppercase">ยอดตรงกัน</span>
                                                    </div>
                                                ) : (
                                                    <div className={`px-2.5 py-1 rounded-full border flex flex-col items-end ${difference > 0 ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]' : 'bg-rose-500/5 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.05)]'}`}>
                                                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-70 leading-none mb-0.5">{difference > 0 ? 'เงินเกิน' : 'เงินขาด'}</span>
                                                        <span className="text-xs font-black font-mono leading-none">{formatCurrency(Math.abs(difference))}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-zinc-800 text-terracotta-400 rounded-2xl border border-zinc-700/50 shadow-inner">{acc.icon}</div>
                                        <span className="font-bold text-sm text-zinc-400 uppercase tracking-wider">{acc.name}</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">ยอดรวมระบบ (ทุกสาขา)</p>
                                        <p className={`text-2xl font-black tracking-tight ${calculatedBalance < 0 ? 'text-rose-400' : 'text-white'}`}>
                                            {formatCurrency(calculatedBalance).replace('-', '')}
                                        </p>
                                        <p className="text-[9px] text-zinc-600 mt-2 uppercase tracking-tighter">เลือกรายสาขาเพื่อเปรียบเทียบยอดจริง</p>
                                    </div>
                                </div>
                            )}

                            {canCompare && !isEditing && (
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleEditBalance(acc.id, actualBalance);
                                        }}
                                        className="p-3 bg-terracotta-600 text-white rounded-xl shadow-lg border border-terracotta-500 hover:bg-terracotta-500 hover:scale-110 active:scale-95 transition-all"
                                        aria-label="แก้ไขยอด"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Recent Transactions Section */}
            <Card className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-terracotta-400" /> รายการล่าสุด (Recent Transactions)
                </h3>
                <div className="space-y-3">
                    {dailyTransactions.slice(0, 5).map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 hover:border-terracotta-500/30 transition-colors">
                             <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-xl transition-colors ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}>
                                    {t.type === 'INCOME' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                 </div>
                                 <div>
                                     <p className="text-sm font-medium text-white">{t.category || t.note || 'ไม่ระบุหมวดหมู่'}</p>
                                     <p className="text-xs text-zinc-500">{new Date(t.date).toLocaleDateString('th-TH')} • {ACCOUNTS.find(a => a.id === t.paymentMethod)?.name || t.paymentMethod}</p>
                                 </div>
                             </div>
                             <span className={`font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                             </span>
                        </div>
                    ))}
                    {dailyTransactions.length === 0 && (
                        <p className="text-zinc-500 text-sm py-4 italic text-center w-full bg-zinc-900/30 rounded-xl border border-zinc-800">ไม่มีรายการในช่วงเวลานี้</p>
                    )}
                </div>
            </Card>

        </div>
    );
};

import React, { useState, useMemo } from 'react';
import PieChart from 'lucide-react/dist/esm/icons/pie-chart';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from './ui/Card';
import type { Transaction } from '../types';

interface ReportsProps {
    filteredTransactions: Transaction[];
    selectedBranchId: string;
    currentBranchName: string;
    expenseCategories: string[];
    formatCurrency: (num: number) => string;
}

export const Reports: React.FC<ReportsProps> = ({
    filteredTransactions,
    selectedBranchId,
    currentBranchName,
    expenseCategories,
    formatCurrency
}) => {
    const [reportView, setReportView] = useState<'7d' | '1m' | '3m'>('1m');

    const filteredByDate = useMemo(() => {
        const now = new Date();
        let startDate = new Date();

        if (reportView === '7d') {
            startDate.setDate(now.getDate() - 7);
        } else if (reportView === '1m') {
            startDate.setDate(now.getDate() - 30);
        } else {
            startDate.setMonth(now.getMonth() - 3);
        }

        const startStr = startDate.toISOString().split('T')[0];
        return filteredTransactions.filter(t => t.date >= startStr);
    }, [filteredTransactions, reportView]);

    const expenseData = useMemo(() => {
        return expenseCategories.map(cat => ({
            name: cat,
            value: filteredByDate.filter(t => t.type === 'EXPENSE' && t.category === cat).reduce((sum, t) => sum + t.amount, 0)
        })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [filteredByDate, expenseCategories]);

    const incomeData = useMemo(() => {
        // Collect all unique income categories from data
        const cats = Array.from(new Set(filteredByDate.filter(t => t.type === 'INCOME').map(t => t.category)));
        return cats.map(cat => ({
            name: cat,
            value: filteredByDate.filter(t => t.type === 'INCOME' && t.category === cat).reduce((sum, t) => sum + t.amount, 0)
        })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [filteredByDate]);

    const totalExpense = expenseData.reduce((acc, curr) => acc + curr.value, 0);
    const totalIncome = incomeData.reduce((acc, curr) => acc + curr.value, 0);
    const netProfit = totalIncome - totalExpense;

    const EXPENSE_COLORS = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#78716c'
    ];
    
    const INCOME_COLORS = [
        '#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46',
        '#a7f3d0', '#d1fae5', '#ecfdf5', '#064e3b', '#3b82f6', '#1d4ed8'
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <PieChart size={20} className="text-violet-400" />
                    วิเคราะห์ผลกำไร
                    {selectedBranchId !== 'HQ' && <span className="text-violet-400 text-sm font-normal">({currentBranchName})</span>}
                </h3>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {['7d', '1m', '3m'].map((view) => (
                        <button
                            key={view}
                            onClick={() => setReportView(view as any)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${reportView === view ? 'bg-slate-800 text-violet-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {view === '7d' ? '7 วัน' : view === '1m' ? '1 เดือน' : '3 เดือน'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Net Profit Summary Card */}
            <Card className="p-8 border border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="text-center relative z-10">
                    <h4 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-2">
                        กำไรสุทธิ (Net Profit)
                    </h4>
                    <h2 className={`text-4xl md:text-5xl font-bold tracking-tight mb-2 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {netProfit > 0 ? '+' : ''}{formatCurrency(netProfit)}
                    </h2>
                    <p className="text-slate-500 text-xs">
                        {reportView === '7d' ? '7 วันย้อนหลัง' : reportView === '1m' ? '1 เดือนย้อนหลัง' : '3 เดือนย้อนหลัง'}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-800/50">
                    <div className="text-center">
                        <p className="text-emerald-400/80 text-xs font-medium uppercase mb-1">รายรับรวม</p>
                        <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="text-center border-l border-slate-800/50">
                        <p className="text-rose-400/80 text-xs font-medium uppercase mb-1">รายจ่ายรวม</p>
                        <p className="text-xl font-bold text-rose-400">{formatCurrency(totalExpense)}</p>
                    </div>
                </div>
            </Card>

            {/* Side by Side Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Income Details */}
                <Card className="p-5 sm:p-6 border border-slate-800 bg-slate-900/50">
                    <h4 className="font-bold text-lg mb-6 text-emerald-400 flex items-center gap-2 border-b border-emerald-500/20 pb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        รายละเอียดรายรับ
                    </h4>
                    
                    {incomeData.length > 0 ? (
                        <div className="space-y-4">
                            {/* Income Pie Chart (Smaller) */}
                            <div className="h-48 mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={incomeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="#0f172a"
                                            strokeWidth={2}
                                        >
                                            {incomeData.map((_entry, index) => <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatCurrency(value as number)}
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                                            itemStyle={{ color: '#e2e8f0' }}
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Income List */}
                            <div className="space-y-3">
                                {incomeData.map((item, index) => (
                                    <div key={item.name} className="relative overflow-hidden rounded-lg bg-slate-800/30 p-3">
                                        <div 
                                            className="absolute top-0 left-0 bottom-0 bg-emerald-500/10" 
                                            style={{ width: `${(item.value / totalIncome) * 100}%` }}
                                        />
                                        <div className="relative flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length] }} />
                                                <span className="text-slate-300 font-medium">{item.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-emerald-400 font-bold block">{formatCurrency(item.value)}</span>
                                                <span className="text-slate-500 text-xs">{((item.value / totalIncome) * 100).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-500 border border-slate-800/50 border-dashed rounded-xl bg-slate-900/20">
                            <PieChart size={32} className="mb-2 opacity-20" />
                            <p className="text-sm">ไม่มีข้อมูลรายรับ</p>
                        </div>
                    )}
                </Card>

                {/* Expense Details */}
                <Card className="p-5 sm:p-6 border border-slate-800 bg-slate-900/50">
                    <h4 className="font-bold text-lg mb-6 text-rose-400 flex items-center gap-2 border-b border-rose-500/20 pb-4">
                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                        รายละเอียดรายจ่าย
                    </h4>
                    
                    {expenseData.length > 0 ? (
                        <div className="space-y-4">
                            {/* Expense Pie Chart (Smaller) */}
                            <div className="h-48 mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={expenseData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="#0f172a"
                                            strokeWidth={2}
                                        >
                                            {expenseData.map((_entry, index) => <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatCurrency(value as number)}
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                                            itemStyle={{ color: '#e2e8f0' }}
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Expense List */}
                            <div className="space-y-3">
                                {expenseData.map((item, index) => (
                                    <div key={item.name} className="relative overflow-hidden rounded-lg bg-slate-800/30 p-3">
                                        <div 
                                            className="absolute top-0 left-0 bottom-0 bg-rose-500/10" 
                                            style={{ width: `${(item.value / totalExpense) * 100}%` }}
                                        />
                                        <div className="relative flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }} />
                                                <span className="text-slate-300 font-medium">{item.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-rose-400 font-bold block">{formatCurrency(item.value)}</span>
                                                <span className="text-slate-500 text-xs">{((item.value / totalExpense) * 100).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-500 border border-slate-800/50 border-dashed rounded-xl bg-slate-900/20">
                            <PieChart size={32} className="mb-2 opacity-20" />
                            <p className="text-sm">ไม่มีข้อมูลรายจ่าย</p>
                        </div>
                    )}
                </Card>

            </div>
        </div>
    );
};

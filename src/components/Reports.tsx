import React, { useState, useMemo } from 'react';
import PieChart from 'lucide-react/dist/esm/icons/pie-chart';
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    const [analysisType, setAnalysisType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

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

    const activeData = analysisType === 'EXPENSE' ? expenseData : incomeData;
    const totalAmount = activeData.reduce((acc, curr) => acc + curr.value, 0);

    const COLORS = analysisType === 'EXPENSE' ? [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#78716c'
    ] : [
        '#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46',
        '#a7f3d0', '#d1fae5', '#ecfdf5', '#064e3b', '#3b82f6', '#1d4ed8'
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <PieChart size={20} className={analysisType === 'EXPENSE' ? "text-rose-400" : "text-emerald-400"} />
                    วิเคราะห์{analysisType === 'EXPENSE' ? 'รายจ่าย' : 'รายรับ'}
                    {selectedBranchId !== 'HQ' && <span className="text-violet-400 text-sm font-normal">({currentBranchName})</span>}
                </h3>
                <div className="flex gap-2">
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setAnalysisType('EXPENSE')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${analysisType === 'EXPENSE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            รายจ่าย
                        </button>
                        <button
                            onClick={() => setAnalysisType('INCOME')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${analysisType === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            รายรับ
                        </button>
                    </div>
                </div>
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

            <Card className="p-8 border border-slate-800">
                <h4 className={`font-bold text-center mb-2 text-xl ${analysisType === 'EXPENSE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {analysisType === 'EXPENSE' ? 'รายจ่ายรวม' : 'รายรับรวม'} {formatCurrency(totalAmount)}
                </h4>
                <p className="text-center text-slate-500 text-sm mb-6">ช่วงเวลา: {reportView === '7d' ? '7 วันย้อนหลัง' : reportView === '1m' ? '1 เดือนย้อนหลัง' : '3 เดือนย้อนหลัง'}</p>

                {activeData.length > 0 ? (
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={activeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={100}
                                    outerRadius={140}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                    stroke="#0f172a"
                                    strokeWidth={4}
                                >
                                    {activeData.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => formatCurrency(value as number)}
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-slate-800 border-dashed rounded-xl">
                        <PieChart size={48} className="mb-2 opacity-20" />
                        <p>ไม่มีข้อมูล{analysisType === 'EXPENSE' ? 'รายจ่าย' : 'รายรับ'}ในช่วงเวลานี้</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

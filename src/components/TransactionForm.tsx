import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Store from 'lucide-react/dist/esm/icons/store';
import Settings from 'lucide-react/dist/esm/icons/settings';
import PenLine from 'lucide-react/dist/esm/icons/pen-line';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Save from 'lucide-react/dist/esm/icons/save';
import PlusCircle from 'lucide-react/dist/esm/icons/plus-circle';
import MinusCircle from 'lucide-react/dist/esm/icons/minus-circle';
import ArrowRightLeft from 'lucide-react/dist/esm/icons/arrow-right-left';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import Coins from 'lucide-react/dist/esm/icons/coins';
import type { TransactionType, User, Branch } from '../types';
import { ACCOUNTS } from '../constants';

interface TransactionFormProps {
    showForm: boolean;
    formType: TransactionType;
    editingId: string | null;
    selectedBranchId: string;
    currentBranchName: string;
    branches: Branch[]; // Add branches prop
    currentUser: User | null;
    incomeCategories: string[];
    expenseCategories: string[];
    initialData?: {
        amount: string;
        date: string;
        category: string;
        paymentMethod: string;
        toAccount: string;
        name: string; // Add name field
        note: string;
        branchId?: string; // Add optional branchId to initialData
    };
    onClose: () => void;
    onSubmit: (data: any) => void;
    onDelete: (id: string) => void;
    onAddCategory: (type: TransactionType) => void;
    onEditCategory: (type: TransactionType, oldName: string) => void;
    onDeleteCategory: (type: TransactionType, name: string) => void;
    setTransactionData: (data: any) => void;
    lastTransactionDate: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
    showForm,
    formType,
    editingId,
    selectedBranchId,
    currentBranchName: _currentBranchName, // eslint-disable-line @typescript-eslint/no-unused-vars
    branches,
    incomeCategories,
    expenseCategories,
    initialData,
    onClose,
    onSubmit,
    onDelete,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    lastTransactionDate
}) => {
    // Local state for form fields
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(lastTransactionDate);
    const [category, setCategory] = useState(
        formType === 'TRANSFER' ? 'โอนย้าย' :
            formType === 'DIVIDEND' ? 'ปันผลกำไร (Profit Sharing)' :
                incomeCategories[0] || ''
    );
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [toAccount, setToAccount] = useState('bank');
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [isManagingCats, setIsManagingCats] = useState(false);

    // Local branch selection state
    const [formBranchId, setFormBranchId] = useState(selectedBranchId);

    // Filter out HQ from selectable branches
    const effectiveBranches = branches.filter(b => b.id !== 'HQ');

    useEffect(() => {
        if (showForm) {
            if (initialData && editingId) {
                setAmount(initialData.amount);
                setDate(initialData.date);
                setCategory(initialData.category);
                setPaymentMethod(initialData.paymentMethod);
                setToAccount(initialData.toAccount || 'bank');
                setName(initialData.name || '');
                setNote(initialData.note);
                // Use the transaction's branch, or fallback to selected
                setFormBranchId(initialData.branchId || selectedBranchId);
            } else {
                // Reset form
                setAmount('');
                setDate(lastTransactionDate);

                const defaultCat = formType === 'INCOME' ? incomeCategories[0] :
                    formType === 'EXPENSE' ? expenseCategories[0] :
                        formType === 'DIVIDEND' ? 'ปันผลกำไร (Profit Sharing)' :
                            'โอนย้าย';
                setCategory(defaultCat || '');

                setPaymentMethod('cash');
                setToAccount('bank');
                setName('');
                setNote('');

                // Keep the currently selected branch if it's valid (not HQ)
                // Only default to first branch if user is viewing "All Branches"
                if (selectedBranchId !== 'HQ') {
                    setFormBranchId(selectedBranchId);
                } else if (effectiveBranches.length > 0) {
                    setFormBranchId(effectiveBranches[0].id);
                } else {
                    setFormBranchId('');
                }
            }
            setIsManagingCats(false);
        }
    }, [showForm, editingId, initialData, formType, incomeCategories, expenseCategories, selectedBranchId, branches]);

    // If we are managing categories, we should start with a valid one if current becomes invalid
    useEffect(() => {
        const cats = formType === 'INCOME' ? incomeCategories : expenseCategories;
        if (!cats.includes(category) && cats.length > 0) {
            setCategory(cats[0]);
        }
    }, [incomeCategories, expenseCategories, formType]);

    if (!showForm) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            amount,
            date,
            category,
            paymentMethod,
            toAccount,
            name,
            note,
            branchId: formBranchId // Pass the selected branch ID
        });
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                <div className={`p-4 flex justify-between items-center text-white flex-shrink-0 ${formType === 'INCOME' ? 'bg-emerald-600' : formType === 'EXPENSE' ? 'bg-rose-600' : 'bg-blue-600'}`}>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        {editingId ? <Edit2 size={20} /> : formType === 'INCOME' ? <PlusCircle /> : formType === 'EXPENSE' ? <MinusCircle /> : formType === 'DIVIDEND' ? <Coins /> : <ArrowRightLeft />}
                        {editingId ? 'แก้ไขรายการ' : `บันทึก${formType === 'INCOME' ? 'รายรับ' : formType === 'EXPENSE' ? 'รายจ่าย' : formType === 'DIVIDEND' ? 'การปันผล' : 'การโอนเงิน'}`}
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
                    {/* Branch Selector in Form */}
                    <div className="flex items-center gap-2 text-sm text-zinc-400 bg-black p-2 rounded-lg border border-zinc-800">
                        <Store size={14} className="flex-shrink-0" />
                        <span className="whitespace-nowrap">บันทึกเข้าสาขา:</span>
                        <select
                            value={formBranchId}
                            onChange={(e) => setFormBranchId(e.target.value)}
                            required
                            className="bg-transparent text-white font-bold outline-none flex-grow"
                        >
                            <option value="" disabled>กรุณาเลือกสาขา</option>
                            {effectiveBranches.map(b => (
                                <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-200">
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">วันที่</label>
                        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">รายการ (ชื่อ)</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500 transition-all font-bold" placeholder="เช่น น้ำแข็ง, ยอดขายหน้าร้าน..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">จำนวนเงิน (บาท)</label>
                        <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full text-4xl font-bold text-white bg-transparent border-b-2 border-zinc-800 focus:border-violet-500 outline-none py-2 placeholder-zinc-800 transition-colors" placeholder="0.00" />
                    </div>

                    {formType !== 'TRANSFER' && formType !== 'DIVIDEND' && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-zinc-400">หมวดหมู่</label>
                                <button
                                    type="button"
                                    onClick={() => setIsManagingCats(!isManagingCats)}
                                    className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition-colors bg-zinc-800 px-2 py-1 rounded-lg"
                                >
                                    {isManagingCats ? 'เสร็จสิ้น' : <><Settings size={12} /> จัดการ</>}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {(formType === 'INCOME' ? incomeCategories : expenseCategories).map(c => (
                                    <div key={c} className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => isManagingCats ? onEditCategory(formType, c) : setCategory(c)}
                                            className={`w-full p-2 text-sm rounded-lg border transition-colors text-left truncate relative ${category === c && !isManagingCats ? 'bg-violet-600 border-violet-500 text-white font-bold shadow-lg shadow-violet-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'} ${isManagingCats ? 'border-dashed border-zinc-600' : ''}`}
                                        >
                                            {c}
                                            {isManagingCats && <PenLine size={12} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50" />}
                                        </button>
                                        {isManagingCats && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteCategory(formType, c)}
                                                className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 z-10"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {isManagingCats && (
                                    <button
                                        type="button"
                                        onClick={() => onAddCategory(formType)}
                                        className="p-2 text-sm rounded-lg border border-dashed border-zinc-600 text-zinc-500 flex items-center justify-center gap-1 hover:bg-zinc-800 hover:text-white transition-colors"
                                    >
                                        <Plus size={16} /> เพิ่ม
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">ช่องทาง</label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500">
                            {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    {formType === 'TRANSFER' && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">ไปยังบัญชี</label>
                            <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500">
                                {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">รายละเอียดเพิ่มเติม</label>
                        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500" placeholder="ระบุรายละเอียด..." />
                    </div>

                    <div className="pt-2 flex gap-3">
                        {editingId && (
                            <button
                                type="button"
                                onClick={() => onDelete(editingId)}
                                className="flex-none bg-rose-500/10 text-rose-500 p-4 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button type="submit" disabled={!formBranchId} className="flex-1 bg-violet-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-violet-500 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-900/20">
                            <Save size={20} /> {editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

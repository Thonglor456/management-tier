import { useState, useMemo, useEffect } from 'react';
import PlusCircle from 'lucide-react/dist/esm/icons/plus-circle';
import MinusCircle from 'lucide-react/dist/esm/icons/minus-circle';
import ArrowRightLeft from 'lucide-react/dist/esm/icons/arrow-right-left';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Coins from 'lucide-react/dist/esm/icons/coins';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import type {
  User,
  Branch,
  Transaction,
  TransactionType,
  AccountBalance
} from './types';
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES
} from './constants';
import {
  subscribeToBranches,
  subscribeToTransactions,
  addTransaction,
  updateTransaction,
  deleteTransactionReal,
  addBranch,
  updateBranch,
  deleteBranch,
  updateBranchBalance,
  getCategories,
  saveCategories
} from './services/dataService';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { Schedule } from './components/Schedule';
import { TransactionList } from './components/TransactionList';
import { Reports } from './components/Reports';
import { TransactionForm } from './components/TransactionForm';
import { BranchModal } from './components/BranchModal';

import { UserManagement } from './components/UserManagement';
import { ReconciliationModal } from './components/ReconciliationModal';
import { SetBalanceModal } from './components/SetBalanceModal';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from './services/dataService';

// Custom hook for localStorage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  return [storedValue, setValue];
}

export default function TierCoffeeApp() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'report' | 'admin' | 'schedule'>('dashboard');
  const [chartView, setChartView] = useState<'7d' | '1m' | '3m'>('7d');
  const [selectedBranchId, setSelectedBranchId] = useLocalStorage<string>('tier-coffee-selected-branch', 'HQ');
  // Date State for Dashboard
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Category State
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [showSetBalance, setShowSetBalance] = useState(false);

  // Form State
  const [formType, setFormType] = useState<TransactionType>('INCOME');
  const [showForm, setShowForm] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Passed to form for editing:
  const editingTransaction = useMemo(() => {
    return transactions.find(t => t.id === editingId);
  }, [editingId, transactions]);

  // Branch Management State
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchNameInput, setBranchNameInput] = useState('');
  const [isEditingBranch, setIsEditingBranch] = useState(false);


  // --- Branch Name Logic (Must be at top level) ---
  const currentBranchName = useMemo(() => {
    if (selectedBranchId === 'HQ') return 'ทุกสาขา (All Branches)';
    return branches.find(b => b.id === selectedBranchId)?.name || 'สาขาไม่ระบุ/ถูกลบ';
  }, [selectedBranchId, branches]);

  // Validate selectedBranchId when branches change
  useEffect(() => {
    if (branches.length > 0 && selectedBranchId !== 'HQ') {
      const exists = branches.find(b => b.id === selectedBranchId);
      if (!exists) {
        setSelectedBranchId('HQ');
      }
    }
  }, [branches, selectedBranchId]);


  // --- Auth Listening ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Default user data from Auth
        let userData: User = {
          id: user.uid,
          username: user.email?.split('@')[0] || 'unknown',
          name: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'USER', // Default to USER until profile is loaded
        };

        try {
          // Try to fetch profile from Firestore
          const profile = await getUserProfile(user.uid);
          if (profile) {
            userData = { ...userData, ...profile };
          }

          // FORCE ADMIN for master account
          if (user.email === 'admin@tiercoffee.com') {
            userData.role = 'ADMIN';
            userData.name = 'Admin';
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          // STILL FORCE ADMIN even if profile fetch fails
          if (user.email === 'admin@tiercoffee.com') {
            userData.role = 'ADMIN';
            userData.name = 'Admin';
          }
        }

        setCurrentUser(userData);

        if (userData.branchId) {
          setSelectedBranchId(userData.branchId);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Load Categories from Firestore ---
  useEffect(() => {
    if (!currentUser) return;
    getCategories().then((cats) => {
      if (cats) {
        setIncomeCategories(cats.income);
        setExpenseCategories(cats.expense);
      }
    });
  }, [currentUser]);

  // --- Data Subscriptions ---

  // 1. Branches
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToBranches((data) => {
      // Ensure HQ is always an option even if not in DB
      const hasHQ = data.find(b => b.id === 'HQ');
      const allBranches = hasHQ ? data : [{ id: 'HQ', name: 'ทุกสาขา (All Branches)', color: 'bg-slate-700' }, ...data];
      setBranches(allBranches);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 2. Transactions
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToTransactions(selectedBranchId, setTransactions);
    return () => unsubscribe();
  }, [currentUser, selectedBranchId]);


  // --- Handlers ---

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Manually clear state to ensure immediate UI update
      setCurrentUser(null);
      setActiveTab('dashboard');
      // Optional: Clear any local storage if needed, but keeping branch selection is fine
    } catch (error) {
      console.error("Logout Error:", error);
      alert("ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  // --- Branch Management Logic ---
  const openAddBranch = () => {
    setBranchNameInput('');
    setIsEditingBranch(false);
    setShowBranchModal(true);
  };

  const openEditBranch = () => {
    if (selectedBranchId === 'HQ') return;
    const branch = branches.find(b => b.id === selectedBranchId);
    if (branch) {
      setBranchNameInput(branch.name);
      setIsEditingBranch(true);
      setShowBranchModal(true);
    }
  };

  const handleSaveBranch = async (name: string) => {
    if (!name.trim()) return;

    if (isEditingBranch) {
      await updateBranch(selectedBranchId, name);
    } else {
      await addBranch(name);
    }
    setShowBranchModal(false);
  };

  const handleDeleteBranch = async () => {
    if (selectedBranchId === 'HQ') return;

    const branchName = branches.find(b => b.id === selectedBranchId)?.name;
    if (window.confirm(`คุณต้องการลบ "${branchName}" หรือไม่?\nข้อมูลธุรกรรมทั้งหมดในสาขานี้จะถูกลบไปด้วย!`)) {
      await deleteBranch(selectedBranchId);
      setSelectedBranchId('HQ');
    }
  };

  // --- Category Management Logic ---
  const handleAddCategory = (type: TransactionType) => {
    const name = window.prompt("ชื่อหมวดหมู่ใหม่:");
    if (name && name.trim()) {
      if (type === 'INCOME') {
        const updated = [...incomeCategories, name.trim()];
        setIncomeCategories(updated);
        saveCategories(updated, expenseCategories);
      } else {
        const updated = [...expenseCategories, name.trim()];
        setExpenseCategories(updated);
        saveCategories(incomeCategories, updated);
      }
    }
  };

  const handleDeleteCategory = (type: TransactionType, catName: string) => {
    if (window.confirm(`ต้องการลบหมวดหมู่ "${catName}" หรือไม่?`)) {
      if (type === 'INCOME') {
        const updated = incomeCategories.filter(c => c !== catName);
        setIncomeCategories(updated);
        saveCategories(updated, expenseCategories);
      } else {
        const updated = expenseCategories.filter(c => c !== catName);
        setExpenseCategories(updated);
        saveCategories(incomeCategories, updated);
      }
    }
  };

  const handleEditCategory = (type: TransactionType, oldName: string) => {
    const newName = window.prompt("แก้ไขชื่อหมวดหมู่:", oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
      if (type === 'INCOME') {
        const updated = incomeCategories.map(c => c === oldName ? newName : c);
        setIncomeCategories(updated);
        saveCategories(updated, expenseCategories);
      } else {
        const updated = expenseCategories.map(c => c === oldName ? newName : c);
        setExpenseCategories(updated);
        saveCategories(incomeCategories, updated);
      }
    }
  };


  // --- Filter Logic ---
  const filteredTransactions = useMemo(() => {
    // Already filtered by subscription unless we want strict client-side filter double check
    return transactions;
  }, [transactions]);

  // --- Calculations (Based on Filtered Data) ---

  const balances = useMemo(() => {
    const bals: AccountBalance = { cash: 0, bank: 0, delivery: 0 };
    // Initialize with 0 for real data. Seed logic removed.

    filteredTransactions.forEach(t => {
      const amt = t.amount;
      if (t.type === 'INCOME') {
        bals[t.paymentMethod as keyof AccountBalance] += amt;
      } else if (t.type === 'EXPENSE') {
        bals[t.paymentMethod as keyof AccountBalance] -= amt;
      } else if (t.type === 'TRANSFER' && t.toAccount) {
        bals[t.paymentMethod as keyof AccountBalance] -= amt;
        bals[t.toAccount as keyof AccountBalance] += amt;
      } else if (t.type === 'ADJUSTMENT') {
        // ADJUSTMENT can be positive (add) or negative (subtract)
        // We will store signed amount in Transaction for ADJUSTMENT
        bals[t.paymentMethod as keyof AccountBalance] += amt;
      } else if (t.type === 'DIVIDEND') {
        bals[t.paymentMethod as keyof AccountBalance] -= amt;
      }
    });
    return bals;
  }, [filteredTransactions]);

  const stats = useMemo(() => {
    const daily = filteredTransactions.filter(t => t.date >= startDate && t.date <= endDate);
    let monthlyIncome = 0, monthlyExpense = 0;

    // Calculate monthly stats based on the month of the endDate
    const endMonth = endDate.substring(0, 7); // YYYY-MM
    filteredTransactions.forEach(t => {
      const isTargetMonth = t.date.startsWith(endMonth);
      if (isTargetMonth) {
        if (t.type === 'INCOME') monthlyIncome += t.amount;
        else if (t.type === 'EXPENSE') monthlyExpense += t.amount;
      }
    });

    return {
      dailyIncome: daily.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0),
      dailyExpense: daily.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0),
      monthlyIncome,
      monthlyExpense
    };
  }, [filteredTransactions, startDate, endDate]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({
      date,
      items: groups[date]
    }));
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const data: { name: string, income: number, expense: number, fullDate: string }[] = [];

    // FIXED: Generate 365 days of history regardless of current view
    // This allows scrolling back in the dashboard
    const historyDays = 365;

    for (let i = historyDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayTrans = filteredTransactions.filter(t => t.date === dateStr);
      data.push({
        name: new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        income: dayTrans.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
        expense: dayTrans.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
        fullDate: dateStr
      });
    }
    return data;
  }, [filteredTransactions]);

  // --- Handlers ---

  const handleTransactionSubmit = async (data: any) => {
    const transactionData: Record<string, any> = {
      branchId: data.branchId || selectedBranchId,
      date: data.date,
      type: formType,
      amount: parseFloat(data.amount),
      category: data.category,
      paymentMethod: data.paymentMethod,
      note: data.note || '',
      createdBy: currentUser?.username || 'unknown'
    };

    // Only add toAccount for TRANSFER transactions
    if (formType === 'TRANSFER') {
      transactionData.toAccount = data.toAccount;
    }

    if (transactionData.branchId === 'HQ') {
      alert("กรุณาเลือกสาขาที่ถูกต้อง (ไม่สามารถบันทึกเข้าสาขาหลักได้)");
      return;
    }

    try {
      if (editingId) {
        await updateTransaction(editingId, transactionData);
        setEditingId(null);
      } else {
        await addTransaction(transactionData as any);
      }
      handleCloseForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
    }
  };

  const deleteTransaction = async (id: string) => {
    if (window.confirm('ยืนยันการลบรายการนี้?')) {
      await deleteTransactionReal(id);
      handleCloseForm();
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setFormType(t.type);
    setShowForm(true);
    setShowFabMenu(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setShowFabMenu(false);
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
  const formatDateThai = (dateStr: string) => new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // --- Loading Screen ---
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-pulse text-violet-400">Loading Application...</div>
      </div>
    );
  }

  // --- Login Screen ---
  if (!currentUser) {
    // Pass void function for now as LoginScreen handles logic internally
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans relative selection:bg-violet-500/30 selection:text-violet-200">

      <Header
        currentUser={currentUser}
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelectBranch={setSelectedBranchId}
        onLogout={handleLogout}
        onAddBranch={openAddBranch}
        onEditBranch={openEditBranch}
        onDeleteBranch={handleDeleteBranch}
        onSelectAdmin={() => setActiveTab('admin')}
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 pb-24">
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            balances={balances}
            chartData={chartData}
            chartView={chartView}
            setChartView={setChartView}
            formatCurrency={formatCurrency}
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start: string, end: string) => {
              setStartDate(start);
              setEndDate(end);
            }}
            selectedBranchId={selectedBranchId}
            currentBranch={branches.find(b => b.id === selectedBranchId)}
            dailyTransactions={filteredTransactions.filter(t => t.date >= startDate && t.date <= endDate)}
            onUpdateActualBalance={async (branchId, amount, accountId) => {
              const updates = accountId === 'bank'
                ? { actualBankBalance: amount }
                : accountId === 'cash'
                  ? { actualCashBalance: amount }
                  : { actualDeliveryBalance: amount };
              await updateBranchBalance(branchId, updates);
            }}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionList
            groupedTransactions={groupedTransactions}
            selectedBranchId={selectedBranchId}
            currentBranchName={currentBranchName}
            branches={branches}
            currentUser={currentUser}
            formatCurrency={formatCurrency}
            formatDateThai={formatDateThai}
            onEdit={handleEdit}
            onDelete={deleteTransaction}
          />
        )}

        {activeTab === 'report' && (
          <Reports
            filteredTransactions={filteredTransactions}
            selectedBranchId={selectedBranchId}
            currentBranchName={currentBranchName}
            expenseCategories={expenseCategories}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'schedule' && (
          <Schedule
            selectedBranchId={selectedBranchId}
            currentUser={currentUser}
            branches={branches}
          />
        )}

        {activeTab === 'admin' && (
          <UserManagement
            currentUser={currentUser}
            branches={branches}
          />
        )}

        {/* FAB Menu */}
        <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-3 pointer-events-none">
          {showFabMenu && (
            <div className="flex flex-col gap-3 pointer-events-auto animate-slide-up">
              <button onClick={() => { setFormType('DIVIDEND'); setShowForm(true); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-200 px-4 py-2 rounded-full shadow-xl border border-zinc-700 font-medium hover:bg-zinc-700 hover:text-white transition-all">
                ปันผล <span className="bg-purple-500/20 text-purple-400 p-2 rounded-full"><Coins size={20} /></span>
              </button>
              <button onClick={() => setShowSetBalance(true)} className="flex items-center gap-3 bg-zinc-800 text-zinc-200 px-4 py-2 rounded-full shadow-xl border border-zinc-700 font-medium hover:bg-zinc-700 hover:text-white transition-all">
                ยกยอด <span className="bg-zinc-500/20 text-zinc-400 p-2 rounded-full"><PlusCircle size={20} className="rotate-45" /></span>
              </button>
              <button onClick={() => { setFormType('TRANSFER'); setShowForm(true); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-200 px-4 py-2 rounded-full shadow-xl border border-zinc-700 font-medium hover:bg-zinc-700 hover:text-white transition-all">
                โยกย้าย <span className="bg-blue-500/20 text-blue-400 p-2 rounded-full"><ArrowRightLeft size={20} /></span>
              </button>
              <button onClick={() => { setFormType('EXPENSE'); setShowForm(true); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-200 px-4 py-2 rounded-full shadow-xl border border-zinc-700 font-medium hover:bg-zinc-700 hover:text-white transition-all">
                รายจ่าย <span className="bg-rose-500/20 text-rose-400 p-2 rounded-full"><MinusCircle size={20} /></span>
              </button>
              <button onClick={() => { setFormType('INCOME'); setShowForm(true); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-200 px-4 py-2 rounded-full shadow-xl border border-zinc-700 font-medium hover:bg-zinc-700 hover:text-white transition-all">
                รายรับ <span className="bg-emerald-500/20 text-emerald-400 p-2 rounded-full"><PlusCircle size={20} /></span>
              </button>
            </div>
          )}
          {activeTab !== 'admin' && (
            <button onClick={() => setShowFabMenu(!showFabMenu)} className={`pointer-events-auto p-4 rounded-full shadow-2xl shadow-violet-900/40 transition-all duration-300 border border-white/10 ${showFabMenu ? 'bg-zinc-800 text-zinc-400 rotate-45' : 'bg-violet-600 border-violet-500 text-white hover:bg-violet-500 hover:scale-105'}`}>
              <Plus size={28} />
            </button>
          )}
        </div>

        {/* Modals */}
        <BranchModal
          showBranchModal={showBranchModal}
          isEditing={isEditingBranch}
          initialName={branchNameInput}
          onClose={() => setShowBranchModal(false)}
          onSave={handleSaveBranch}
        />

        <ReconciliationModal
          show={showReconciliation}
          onClose={() => setShowReconciliation(false)}
          balances={balances}
          formatCurrency={formatCurrency}
          currentUser={currentUser}
          selectedBranchId={selectedBranchId}
        />

        <SetBalanceModal
          show={showSetBalance}
          onClose={() => setShowSetBalance(false)}
          balances={balances}
          formatCurrency={formatCurrency}
          currentUser={currentUser}
          selectedBranchId={selectedBranchId}
        />

        <TransactionForm
          showForm={showForm}
          formType={formType}
          editingId={editingId}
          selectedBranchId={selectedBranchId}
          currentBranchName={currentBranchName}
          branches={branches} // Pass branches here
          currentUser={currentUser}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          initialData={editingTransaction ? {
            amount: editingTransaction.amount.toString(),
            date: editingTransaction.date,
            category: editingTransaction.category,
            paymentMethod: editingTransaction.paymentMethod,
            toAccount: editingTransaction.toAccount || 'bank',
            note: editingTransaction.note,
            branchId: editingTransaction.branchId // Pass existing branchId for editing
          } : undefined}
          onClose={handleCloseForm}
          onSubmit={handleTransactionSubmit}
          onDelete={deleteTransaction}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          setTransactionData={() => { }}
        />

      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%) scale(0.9); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

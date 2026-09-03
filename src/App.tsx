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
  DEFAULT_EXPENSE_CATEGORIES,
  getLocalDateString
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
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
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
import { ConfirmModal } from './components/ui/ConfirmModal';
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
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());

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
  const [lastTransactionDate, setLastTransactionDate] = useState(getLocalDateString());

  // Passed to form for editing:
  const editingTransaction = useMemo(() => {
    return transactions.find(t => t.id === editingId);
  }, [editingId, transactions]);

  // Branch Management State
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchNameInput, setBranchNameInput] = useState('');
  const [branchUrlInput, setBranchUrlInput] = useState('');
  const [branchTabsInput, setBranchTabsInput] = useState('');
  const [isEditingBranch, setIsEditingBranch] = useState(false);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });


  // --- Branch Name Logic (Must be at top level) ---
  const currentBranchName = useMemo(() => {
    if (selectedBranchId === 'HQ') return 'ทุกสาขา (All Branches)';
    return branches.find(b => b.id === selectedBranchId)?.name || 'สาขาไม่ระบุ/ถูกลบ';
  }, [selectedBranchId, branches]);

  // --- Auth Listening ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        try {
          // Robust local fallback in case of Firestore query hangs or offline
          const fallbackUserData: User = {
            id: user.uid,
            username: user.email?.split('@')[0] || 'unknown',
            name: user.displayName || user.email?.split('@')[0] || 'User',
            role: 'USER',
          };

          // FORCE ADMIN for master accounts
          if (user.email === 'admin@tiercoffee.com' || user.email === 'admin@tier.com') {
            fallbackUserData.role = 'ADMIN';
            fallbackUserData.name = 'Admin';
          }

          // Fetch profile with a 2.5-second timeout race pattern to guarantee the loading screen clears
          const profilePromise = getUserProfile(user.uid);
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
          
          const profile = await Promise.race([profilePromise, timeoutPromise]).catch(err => {
            console.error("Profile fetch promise failed, using fallback:", err);
            return null;
          });

          const userData: User = profile ? { ...profile } : fallbackUserData;

          setCurrentUser(userData);

          // Non-admin: Force their assigned branch immediately
          if (userData.role !== 'ADMIN' && userData.branchId) {
            setSelectedBranchId(userData.branchId);
          }
        } catch (err) {
          console.error("Auth error:", err);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------
  // Auth loading timeout fallback – prevents app from staying on the
  // "Loading Application..." screen forever if the auth listener is stuck.
  // After 5 seconds we clear the loading flag and show a warning.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!authLoading) return;
    const timer = setTimeout(() => {
      console.warn('Auth loading timeout – proceeding with no user');
      setAuthLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [authLoading]);

  // Sync with URL param on initial load (ADMIN only)
  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && branches.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const branchParam = params.get('branch');
      if (branchParam && branchParam !== selectedBranchId && branches.some(b => b.id === branchParam)) {
        setSelectedBranchId(branchParam);
      }
    }
  }, [branches, currentUser]);

  // Update URL when branch changes (ADMIN only)
  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      const url = new URL(window.location.href);
      if (selectedBranchId === 'HQ') {
        url.searchParams.delete('branch');
      } else {
        url.searchParams.set('branch', selectedBranchId);
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedBranchId, currentUser]);

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
    setBranchUrlInput('');
    setBranchTabsInput('');
    setIsEditingBranch(false);
    setShowBranchModal(true);
  };

  const openEditBranch = () => {
    if (selectedBranchId === 'HQ') return;
    const branch = branches.find(b => b.id === selectedBranchId);
    if (branch) {
      setBranchNameInput(branch.name);
      setBranchUrlInput(branch.googleSheetsUrl || '');
      setBranchTabsInput(branch.googleSheetsTabs || '');
      setIsEditingBranch(true);
      setShowBranchModal(true);
    }
  };

  const handleSaveBranch = async (name: string, url?: string, tabs?: string) => {
    if (!name.trim()) return;

    if (isEditingBranch) {
      await updateBranch(selectedBranchId, name, url, tabs);
    } else {
      await addBranch(name, url, tabs);
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
    const bals: AccountBalance = { cash: 0, bank: 0, delivery: 0, thaiChuaiThai: 0 };
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
      name: data.name || '',
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
        // Update the sticky date for the next entry
        setLastTransactionDate(transactionData.date);
      }
      handleCloseForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
    }
  };

  const deleteTransaction = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'ลบรายการ',
      message: 'คุณต้องการลบรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteTransactionReal(id);
          handleCloseForm();
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (error) {
          console.error('Error deleting transaction:', error);
          alert('เกิดข้อผิดพลาดในการลบรายการ');
        }
      }
    });
  };

  // --- Batch Import from Google Sheets ---
  const handleBatchImport = async (
    targetBranchId: string,
    newTransactions: Omit<Transaction, 'id'>[],
    datesToOverwrite: string[]
  ) => {
    // 1. Fetch transactions for this branch to avoid composite index requirements
    const q = query(
      collection(db, 'transactions'),
      where('branchId', '==', targetBranchId)
    );
    const snap = await getDocs(q);
    
    // 2. Delete existing transactions for overwrite dates (filter in memory)
    const overwriteSet = new Set(datesToOverwrite);
    for (const d of snap.docs) {
      const txnData = d.data();
      if (overwriteSet.has(txnData.date)) {
        await deleteDoc(doc(db, 'transactions', d.id));
      }
    }

    // 3. Add all new transactions
    for (const t of newTransactions) {
      await addTransaction(t as any);
    }
  };

  const handleBulkCleanup = async (targetBranchId: string, year: number, month?: number) => {
    // 1. Fetch transactions for this branch
    const q = query(
      collection(db, 'transactions'),
      where('branchId', '==', targetBranchId)
    );
    const snap = await getDocs(q);
    
    // 2. Filter by year/month in memory and delete
    const prefix = month 
      ? `${year}-${String(month).padStart(2, '0')}-` 
      : `${year}-`;

    for (const d of snap.docs) {
      const date = d.data().date;
      if (date && date.startsWith(prefix)) {
        await deleteDoc(doc(db, 'transactions', d.id));
      }
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
        <div className="animate-pulse text-violet-400">
          Loading Application...
          {/* Show extra hint after timeout */}
          { /* The timeout effect will clear authLoading after 5s, but if it remains we can show a note */ }
        </div>
      </div>
    );
  }

  // --- Login Screen ---
  if (!currentUser) {
    // Pass void function for now as LoginScreen handles logic internally
    return <LoginScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-zinc-100 font-sans">

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
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 pb-24">
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
            allTransactions={transactions}
            onImportTransactions={handleBatchImport}
            onBulkCleanup={handleBulkCleanup}
          />
        )}

        {activeTab === 'report' && (
          <Reports
            filteredTransactions={filteredTransactions}
            selectedBranchId={selectedBranchId}
            currentBranchName={currentBranchName}
            expenseCategories={expenseCategories}
            formatCurrency={formatCurrency}
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start: string, end: string) => {
              setStartDate(start);
              setEndDate(end);
            }}
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

        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        />
      </main>

      {/* FIXED FAB PORTAL - Using high-impact visibility */}
      {activeTab !== 'admin' && !showForm && (
        <div className="fixed bottom-24 right-6 z-[99999] flex flex-col items-end gap-3">
          {showFabMenu && (
            <div className="flex flex-col gap-3 animate-slide-up mb-3 items-end">
                 <button onClick={() => { setFormType('DIVIDEND'); setShowForm(true); setShowFabMenu(false); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-100 px-4 py-2.5 rounded-full shadow-2xl border border-zinc-700 font-semibold hover:bg-zinc-700 transition-all active:scale-95">
                  ปันผล <span className="bg-purple-500/20 text-purple-400 p-2 rounded-full"><Coins size={20} /></span>
                </button>
                
                <button onClick={() => { setShowSetBalance(true); setShowFabMenu(false); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-100 px-4 py-2.5 rounded-full shadow-2xl border border-zinc-700 font-semibold hover:bg-zinc-700 transition-all active:scale-95">
                  ยกยอด <span className="bg-zinc-500/20 text-zinc-400 p-2 rounded-full"><PlusCircle size={20} className="rotate-45" /></span>
                </button>
                <button onClick={() => { setFormType('TRANSFER'); setShowForm(true); setShowFabMenu(false); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-100 px-4 py-2.5 rounded-full shadow-2xl border border-zinc-700 font-semibold hover:bg-zinc-700 transition-all active:scale-95">
                  โยกย้าย <span className="bg-blue-500/20 text-blue-400 p-2 rounded-full"><ArrowRightLeft size={20} /></span>
                </button>
                <button onClick={() => { setFormType('EXPENSE'); setShowForm(true); setShowFabMenu(false); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-100 px-4 py-2.5 rounded-full shadow-2xl border border-zinc-700 font-semibold hover:bg-zinc-700 transition-all active:scale-95">
                  รายจ่าย <span className="bg-rose-500/20 text-rose-400 p-2 rounded-full"><MinusCircle size={20} /></span>
                </button>
                <button onClick={() => { setFormType('INCOME'); setShowForm(true); setShowFabMenu(false); }} className="flex items-center gap-3 bg-zinc-800 text-zinc-100 px-4 py-2.5 rounded-full shadow-2xl border border-zinc-700 font-semibold hover:bg-zinc-700 transition-all active:scale-95">
                  รายรับ <span className="bg-emerald-500/20 text-emerald-400 p-2 rounded-full"><PlusCircle size={20} /></span>
                </button>
              </div>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setShowFabMenu(!showFabMenu); }}
              className={`p-5 rounded-full shadow-[0_0_50px_rgba(124,58,237,0.6)] transition-all duration-300 border border-white/10 ${showFabMenu ? 'bg-zinc-800 text-zinc-400 rotate-45' : 'bg-violet-600 text-white hover:bg-violet-500 hover:scale-110 active:scale-90'}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={32} />
            </button>
          </div>
        
      )}

      {/* Modals & Forms */}
      <BranchModal
        showBranchModal={showBranchModal}
        isEditing={isEditingBranch}
        initialName={branchNameInput}
        initialUrl={branchUrlInput}
        initialTabs={branchTabsInput}
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
        endDate={endDate}
      />

      <TransactionForm
        showForm={showForm}
        formType={formType}
        editingId={editingId}
        selectedBranchId={selectedBranchId}
        currentBranchName={currentBranchName}
        branches={branches}
        currentUser={currentUser}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        lastTransactionDate={lastTransactionDate}
        initialData={editingTransaction ? {
          amount: editingTransaction.amount.toString(),
          date: editingTransaction.date,
          category: editingTransaction.category,
          paymentMethod: editingTransaction.paymentMethod,
          toAccount: editingTransaction.toAccount || 'bank',
          note: editingTransaction.note || '',
          branchId: editingTransaction.branchId
        } : undefined}
        onClose={handleCloseForm}
        onSubmit={handleTransactionSubmit}
        onDelete={deleteTransaction}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        setTransactionData={() => { }}
      />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        @keyframes slide-up { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Plus from 'lucide-react/dist/esm/icons/plus';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import Clock from 'lucide-react/dist/esm/icons/clock';
import UserIcon from 'lucide-react/dist/esm/icons/user';
import X from 'lucide-react/dist/esm/icons/x';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import LayoutList from 'lucide-react/dist/esm/icons/layout-list';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import { Card } from './ui/Card';
import {
    doc,
    updateDoc,
    serverTimestamp,
    deleteField
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Shift, Branch, User, Staff, Withdrawal } from '../types';
import { subscribeToShifts, addShift, deleteShift, updateShift } from '../services/scheduleService';
import { subscribeToStaff, addStaff } from '../services/staffService';
import { subscribeToWithdrawals, addWithdrawal, deleteWithdrawal } from '../services/withdrawalService';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import History from 'lucide-react/dist/esm/icons/history';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Users from 'lucide-react/dist/esm/icons/users';
import Wallet from 'lucide-react/dist/esm/icons/wallet';

interface ScheduleProps {
    selectedBranchId: string;
    currentUser: User | null;
    branches: Branch[];
}

export const Schedule: React.FC<ScheduleProps> = ({ selectedBranchId, currentUser, branches }) => {
    // State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState<{show: boolean, staff?: Staff}>({show: false});
    const [showHistoryModal, setShowHistoryModal] = useState<{show: boolean, staff?: Staff}>({show: false});
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

    // Form State
    const [staffName, setStaffName] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [wage, setWage] = useState<string>('');
    const [status, setStatus] = useState<'PRESENT' | 'ABSENT'>('PRESENT');
    const [role, setRole] = useState<'Barista' | 'Cashier' | 'Manager' | 'General'>('Barista');
    const [shiftTime, setShiftTime] = useState<'Morning' | 'Afternoon' | 'FullDay' | 'Night'>('Morning');
    const [note, setNote] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    // Load shifts
    useEffect(() => {
        const unsubscribeShifts = subscribeToShifts(selectedBranchId, (data) => {
            setShifts(data);
        });
        
        const unsubscribeStaff = subscribeToStaff(selectedBranchId, (data) => {
            setStaffList(data);
        });

        const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const unsubscribeWithdrawals = subscribeToWithdrawals(selectedBranchId, monthPrefix, (data) => {
            setWithdrawals(data);
        });

        return () => {
            unsubscribeShifts();
            unsubscribeStaff();
            unsubscribeWithdrawals();
        };
    }, [selectedBranchId, currentDate.getFullYear(), currentDate.getMonth()]); // Re-subscribe when month changes

    // Handle staff selection to pre-fill wage
    useEffect(() => {
        if (selectedStaffId && selectedStaffId !== 'new') {
            const staff = staffList.find(s => s.id === selectedStaffId);
            if (staff) {
                setWage(staff.defaultWage.toString());
                setStaffName(staff.name);
            }
        } else if (selectedStaffId === 'new') {
            setStaffName('');
            setWage('');
        }
    }, [selectedStaffId, staffList]);

    // Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
        // Also update selected date to first of that month for better UX
        // setSelectedDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    };

    const handleAddShift = async () => {
        if (!staffName.trim() || !wage) return;

        const dateStr = formatDateForStorage(selectedDate);

        try {
            // If it's a new staff name not in the list, we could optionally add them to staffList
            if (selectedStaffId === 'new' || !selectedStaffId) {
                const existing = staffList.find(s => s.name.toLowerCase() === staffName.trim().toLowerCase());
                if (!existing) {
                    await addStaff({
                        name: staffName.trim(),
                        defaultWage: Number(wage),
                        branchId: selectedBranchId
                    });
                }
            }

            if (editingShiftId) {
                await updateShift(editingShiftId, {
                    staffName: staffName.trim(),
                    role,
                    shiftTime,
                    wage: Number(wage),
                    status,
                    note: note.trim()
                });
            } else {
                await addShift({
                    branchId: selectedBranchId,
                    date: dateStr,
                    staffName: staffName.trim(),
                    role,
                    shiftTime,
                    wage: Number(wage),
                    status,
                    paid: false,
                    note: note.trim(),
                    createdBy: currentUser?.username || 'unknown'
                });
            }
            
            setShowAddModal(false);
            setEditingShiftId(null);
            setStaffName('');
            setSelectedStaffId('');
            setWage('');
            setNote('');
        } catch (error) {
            console.error("Error saving shift:", error);
            alert("บันทึกไม่สำเร็จ");
        }
    };

    const handleTogglePayment = async (shift: Shift, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const newPaidStatus = !shift.paid;
        
        try {
            const docRef = doc(db, 'shifts', shift.id);
            await updateDoc(docRef, {
                paid: newPaidStatus,
                paidAt: newPaidStatus ? new Date().toISOString() : deleteField(),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error toggling payment:", error);
            alert("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        }
    };

    const handleToggleStatus = async (shift: Shift) => {
        const newStatus = shift.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
        await updateShift(shift.id, { status: newStatus });
    };

    const handleWithdraw = async () => {
        if (!showWithdrawModal.staff || !withdrawAmount) return;
        const amount = Number(withdrawAmount);
        if (isNaN(amount) || amount <= 0) return;

        const staff = showWithdrawModal.staff;
        const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        try {
            await addWithdrawal({
                staffId: staff.id,
                staffName: staff.name,
                branchId: selectedBranchId,
                date: new Date().toISOString(),
                amount: amount,
                month: monthPrefix,
                createdBy: currentUser?.username || 'unknown'
            });
            setShowWithdrawModal({show: false});
            setWithdrawAmount('');
        } catch (error) {
            console.error("Error adding withdrawal:", error);
            alert("เบิกเงินไม่สำเร็จ");
        }
    };

    const handleDeleteWithdrawal = async (id: string) => {
        if (window.confirm('ต้องการยกเลิกประวัติการเบิกเงินนี้ใช่หรือไม่?')) {
            await deleteWithdrawal(id);
        }
    };

    const handleDeleteShift = async (id: string) => {
        if (window.confirm('ต้องการลบตารางงานนี้ใช่หรือไม่?')) {
            await deleteShift(id);
        }
    };

    // Date Helper
    const formatDateForStorage = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Derived Data
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    // Use helper for consistently formatted date string
    const selectedDateStr = formatDateForStorage(selectedDate);

    const shiftsOnSelectedDate = shifts.filter(s => s.date === selectedDateStr);

    const renderCalendar = () => {
        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 sm:h-14"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            // Construct date for this specific grid cell
            const cellDate = new Date(year, month, day);
            const dateStr = formatDateForStorage(cellDate);
            const dayShifts = shifts.filter(s => s.date === dateStr);
            const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

            days.push(
                <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`h-10 sm:h-14 rounded-lg flex flex-col items-center justify-center relative transition-all border ${isSelected
                        ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40'
                        : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        } ${isToday ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-zinc-950' : ''}`}
                >
                    <span className={`text-sm ${isSelected ? 'font-bold' : ''}`}>{day}</span>
                    <div className="flex gap-0.5 mt-1">
                        {dayShifts.map((s, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : s.status === 'PRESENT' ? 'bg-emerald-400' : 'bg-rose-400/50'}`}></div>
                        ))}
                    </div>
                </button>
            );
        }
        return days;
    };

    // Monthly Calculation
    const currentMonthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthlyShifts = shifts.filter(s => s.date.startsWith(currentMonthPrefix) && s.status === 'PRESENT');
    
    const staffStats = staffList.map(staff => {
        const shiftsForStaff = monthlyShifts.filter(s => s.staffName === staff.name);
        const withdrawalsForStaff = withdrawals.filter(w => w.staffName === staff.name);
        
        const totalIncome = shiftsForStaff.reduce((sum, s) => sum + s.wage, 0);
        const totalWithdrawn = withdrawalsForStaff.reduce((sum, w) => sum + w.amount, 0);
        const pending = totalIncome - totalWithdrawn;
        
        return {
            ...staff,
            daysWorked: shiftsForStaff.length,
            totalIncome,
            totalWithdrawn,
            pending,
            withdrawals: withdrawalsForStaff
        };
    }).filter(s => s.daysWorked > 0 || s.totalWithdrawn > 0);

    const teamOverview = staffStats.reduce((acc, s) => {
        acc.totalStaff++;
        acc.totalIncome += s.totalIncome;
        acc.totalWithdrawn += s.totalWithdrawn;
        acc.totalPending += s.pending;
        return acc;
    }, { totalStaff: 0, totalIncome: 0, totalWithdrawn: 0, totalPending: 0 });

    const currentBranchName = branches.find(b => b.id === selectedBranchId)?.name || 'สาขาทั่วไป';

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CalendarIcon className="text-violet-400" /> ตารางงาน
                    </h2>
                    <p className="text-zinc-500 text-xs mt-1">{currentBranchName}</p>
                </div>

                <div className="flex gap-2">
                    <div className="flex items-center bg-zinc-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
                        >
                            <Calendar size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
                        >
                            <LayoutList size={18} />
                        </button>
                    </div>

                    <div className={`flex items-center gap-2 bg-zinc-800 rounded-lg p-1 ${viewMode === 'table' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-medium text-white px-2 w-24 text-center hidden sm:block">
                            {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-sm font-medium text-white px-2 w-16 text-center sm:hidden">
                            {currentDate.toLocaleDateString('th-TH', { month: 'short' })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <>
                    {/* Calendar Grid */}
                    <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
                        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                                <div key={d} className="text-zinc-500 text-xs py-2">{d}</div>
                            ))}
                        </div>


                        <div className="grid grid-cols-7 gap-2">
                            {renderCalendar()}
                        </div>
                    </div>

                    {/* Monthly Summary Section */}
                    <div className="pt-4 border-t border-zinc-800/50">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <TrendingUp className="text-violet-400" size={20} />
                            <h3 className="text-lg font-bold text-white">สรุปประจำเดือน {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</h3>
                        </div>

                        {/* Team Overview Card */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <Card className="p-4 bg-zinc-900/40 border-zinc-800/50">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={18} /></div>
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">พนักงานทั้งหมด</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{teamOverview.totalStaff} <span className="text-sm font-normal text-zinc-500">คน</span></div>
                            </Card>
                            <Card className="p-4 bg-zinc-900/40 border-zinc-800/50">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400"><Banknote size={18} /></div>
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">รายได้รวมทีม</span>
                                </div>
                                <div className="text-2xl font-bold text-white">฿{teamOverview.totalIncome.toLocaleString()}</div>
                            </Card>
                            <Card className="p-4 bg-zinc-900/40 border-zinc-800/50">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle2 size={18} /></div>
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">เบิกรวมแล้ว</span>
                                </div>
                                <div className="text-2xl font-bold text-emerald-400">฿{teamOverview.totalWithdrawn.toLocaleString()}</div>
                            </Card>
                            <Card className="p-4 bg-zinc-900/40 border-zinc-800/50">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400"><Wallet size={18} /></div>
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">ค้างจ่ายรวม</span>
                                </div>
                                <div className="text-2xl font-bold text-rose-400">฿{teamOverview.totalPending.toLocaleString()}</div>
                            </Card>
                        </div>

                        {/* Individual Staff Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {staffStats.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-zinc-600 italic">ยังไม่มีข้อมูลในเดือนนี้</div>
                            ) : (
                                staffStats.map(staff => (
                                    <Card key={staff.id} className="p-5 bg-zinc-900/60 border-zinc-800 transition-all hover:bg-zinc-800/40">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center text-xl font-bold text-violet-400">
                                                    {staff.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-lg">{staff.name}</h4>
                                                    <p className="text-xs text-zinc-500">฿{staff.defaultWage.toLocaleString()}/วัน</p>
                                                </div>
                                            </div>
                                            {staff.pending === 0 && staff.totalIncome > 0 ? (
                                                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500/20 animate-pulse">จ่ายครบแล้ว ✅</span>
                                            ) : staff.pending > 0 ? (
                                                <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-1 rounded-full border border-rose-500/20">ยังค้างจ่าย 🔴</span>
                                            ) : null}
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 border-t border-b border-zinc-800/50 py-4 mb-4">
                                            <div>
                                                <span className="text-xs text-zinc-500 block">ทำงาน</span>
                                                <span className="text-sm font-bold text-white">{staff.daysWorked} วัน</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-zinc-500 block">รายได้รวม</span>
                                                <span className="text-sm font-bold text-white">฿{staff.totalIncome.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-zinc-500 block">เบิกแล้ว</span>
                                                <span className="text-sm font-bold text-emerald-400">฿{staff.totalWithdrawn.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-zinc-500 block">ยังค้างจ่าย</span>
                                                <span className={`text-sm font-bold ${staff.pending > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>฿{staff.pending.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setShowHistoryModal({show: true, staff})}
                                                className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-xs font-bold transition-all border border-zinc-700"
                                            >
                                                <History size={14} /> ดูประวัติ
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const currentStaffInList = staffList.find(s => s.id === staff.id);
                                                    setShowWithdrawModal({show: true, staff: currentStaffInList});
                                                }}
                                                disabled={staff.pending <= 0}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all
                                                    ${staff.pending > 0 
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                                                        : 'bg-zinc-800 text-zinc-600 border border-zinc-700 pointer-events-none opacity-50'}`}
                                            >
                                                <Banknote size={14} /> เบิกเงิน
                                            </button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Daily Details (Selected Date) */}
                    <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-lg font-bold text-white">
                                {selectedDate.toLocaleDateString('th-TH', { dateStyle: 'full' })}
                            </h3>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-violet-900/20"
                            >
                                <Plus size={18} /> เพิ่มคนเข้างาน
                            </button>
                        </div>

                        {shiftsOnSelectedDate.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800 border-dashed">
                                <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>ยังไม่มีตารางงานในวันนี้</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {shiftsOnSelectedDate.map(shift => (
                                    <Card key={shift.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all hover:bg-zinc-800/80">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                                                    ${shift.role === 'Barista' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        shift.role === 'Cashier' ? 'bg-amber-500/20 text-amber-400' :
                                                            shift.role === 'Manager' ? 'bg-rose-500/20 text-rose-400' :
                                                                'bg-blue-500/20 text-blue-400'}
                                                `}>
                                                    {shift.staffName.charAt(0)}
                                                </div>
                                                <button 
                                                    onClick={() => handleToggleStatus(shift)}
                                                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px]
                                                        ${shift.status === 'PRESENT' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}
                                                >
                                                    {shift.status === 'PRESENT' ? '✅' : '❌'}
                                                </button>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-white text-base">{shift.staffName}</h4>
                                                    <span className="text-zinc-500 text-sm">—</span>
                                                    <span className="text-violet-400 font-bold text-sm">฿{shift.wage.toLocaleString()}/วัน</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] border
                                                        ${shift.role === 'Barista' ? 'border-emerald-500/30 text-emerald-400' :
                                                            shift.role === 'Cashier' ? 'border-amber-500/30 text-amber-400' :
                                                                shift.role === 'Manager' ? 'border-rose-500/30 text-rose-400' :
                                                                    'border-blue-500/30 text-blue-400'}
                                                    `}>{shift.role}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {shift.shiftTime === 'Morning' ? 'กะเช้า' :
                                                            shift.shiftTime === 'Afternoon' ? 'กะบ่าย' :
                                                                shift.shiftTime === 'Night' ? 'กะดึก' : 'ทั้งวัน'}
                                                    </span>
                                                    <span className={`flex items-center gap-1 font-medium ${shift.status === 'PRESENT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {shift.status === 'PRESENT' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                        {shift.status === 'PRESENT' ? 'มาทำงาน' : 'ไม่มา'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                                            {/* Withdrawal Status */}
                                            {shift.paid ? (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => handleTogglePayment(shift, e)}
                                                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all text-xs font-bold"
                                                >
                                                    <Banknote size={14} /> เบิกแล้ว {shift.paidAt && <span className="text-[10px] font-normal opacity-60">({new Date(shift.paidAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})</span>}
                                                </button>
                                            ) : (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => handleTogglePayment(shift, e)}
                                                    className={`flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 transition-all text-xs font-bold ${shift.status !== 'PRESENT' ? 'opacity-30 pointer-events-none' : ''}`}
                                                >
                                                    <Banknote size={14} /> ยังไม่เบิก
                                                </button>
                                            )}

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedStaffId(staffList.find(s => s.name === shift.staffName)?.id || 'new');
                                                        setStaffName(shift.staffName);
                                                        setWage(shift.wage.toString());
                                                        setRole(shift.role);
                                                        setShiftTime(shift.shiftTime);
                                                        setNote(shift.note || '');
                                                        // We'd need an update function or a way to replace the existing shift
                                                        // For now, let's keep it simple as deleting and re-adding, or I can implement updateShift logic.
                                                        setShowAddModal(true);
                                                    }}
                                                    className="p-2 text-zinc-500 hover:text-violet-400 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteShift(shift.id)}
                                                    className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}

                                {/* Daily Summary */}
                                {shiftsOnSelectedDate.some(s => s.status === 'PRESENT') && (
                                    <div className="mt-6 p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <LayoutList size={16} className="text-violet-400" />
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">สรุปท้ายวัน</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/50">
                                                <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold">คนมาทำงาน</span>
                                                <span className="text-lg font-bold text-white">{shiftsOnSelectedDate.filter(s => s.status === 'PRESENT').length} คน</span>
                                            </div>
                                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/50">
                                                <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold">ค่าจ้างรวม</span>
                                                <span className="text-lg font-bold text-white">฿{shiftsOnSelectedDate.filter(s => s.status === 'PRESENT').reduce((sum, s) => sum + s.wage, 0).toLocaleString()}</span>
                                            </div>
                                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/50">
                                                <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold text-emerald-400">เบิกแล้ว</span>
                                                <span className="text-lg font-bold text-emerald-400">฿{shiftsOnSelectedDate.filter(s => s.status === 'PRESENT' && s.paid).reduce((sum, s) => sum + s.wage, 0).toLocaleString()}</span>
                                            </div>
                                            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/50">
                                                <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold text-rose-400">ค้างจ่าย</span>
                                                <span className="text-lg font-bold text-rose-400">฿{shiftsOnSelectedDate.filter(s => s.status === 'PRESENT' && !s.paid).reduce((sum, s) => sum + s.wage, 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                // TABLE VIEW
                <div className="space-y-4">
                    {/* Table Summary Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold">ทำงานรวม</span>
                            <span className="text-xl font-bold text-white">{shifts.filter(s => s.status === 'PRESENT').length} วัน</span>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold">ค่าจ้างรวม</span>
                            <span className="text-xl font-bold text-white">฿{shifts.filter(s => s.status === 'PRESENT').reduce((sum, s) => sum + s.wage, 0).toLocaleString()}</span>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold text-emerald-400">เบิกแล้ว</span>
                            <span className="text-xl font-bold text-emerald-400">฿{shifts.filter(s => s.status === 'PRESENT' && s.paid).reduce((sum, s) => sum + s.wage, 0).toLocaleString()}</span>
                        </div>
                        {(() => {
                            const totalPending = shifts.filter(s => s.status === 'PRESENT' && !s.paid).reduce((sum, s) => sum + s.wage, 0);
                            return (
                                <div className={`p-4 rounded-xl border transition-all ${totalPending === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                    <span className={`text-[10px] block mb-1 uppercase font-bold ${totalPending === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {totalPending === 0 ? 'จ่ายครบแล้ว ✅' : 'ค้างจ่าย'}
                                    </span>
                                    <span className={`text-xl font-bold ${totalPending === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        ฿{totalPending.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden">
                        {/* Summary Header */}
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-white text-sm">สรุปตารางงานทั้งหมด ({shifts.length})</h3>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                            >
                                <Plus size={14} /> เพิ่ม
                            </button>
                        </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-400">
                            <thead className="bg-zinc-900/80 text-xs uppercase font-medium text-zinc-500 border-b border-zinc-800">
                                <tr>
                                    <th className="px-4 py-3">วันที่</th>
                                    <th className="px-4 py-3">สาขา</th>
                                    <th className="px-4 py-3">พนักงาน</th>
                                    <th className="px-4 py-3">ตำแหน่ง</th>
                                    <th className="px-4 py-3">ค่าจ้าง</th>
                                    <th className="px-4 py-3">สถานะ</th>
                                    <th className="px-4 py-3">เบิกเงิน</th>
                                    <th className="px-4 py-3 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {shifts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-zinc-600 italic">
                                            ไม่พบข้อมูลตารางงาน
                                        </td>
                                    </tr>
                                ) : (
                                    shifts.map((shift) => {
                                        const shiftBranchName = branches.find(b => b.id === shift.branchId)?.name || 'Unknown';
                                        return (
                                            <tr key={shift.id} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                                                    {new Date(shift.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] border border-zinc-700">{shiftBranchName}</span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-white">{shift.staffName}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-zinc-500 text-[10px] bg-zinc-800/50 px-1.5 py-0.5 rounded italic">{shift.role}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${shift.status === 'PRESENT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {shift.status === 'PRESENT' ? '฿' + shift.wage.toLocaleString() : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleToggleStatus(shift)}
                                                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors
                                                            ${shift.status === 'PRESENT' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/30 text-rose-400 bg-rose-500/5'}
                                                        `}
                                                    >
                                                        {shift.status === 'PRESENT' ? 'มาทำงาน' : 'ไม่มา'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {shift.status === 'PRESENT' ? (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleTogglePayment(shift, e)}
                                                            className={`group flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-all border justify-center min-w-[85px]
                                                                ${shift.paid 
                                                                    ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20' 
                                                                    : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'}`}
                                                        >
                                                            <Banknote size={12} />
                                                            <span>
                                                                {shift.paid ? 'เบิกแล้ว (คลิกเพื่อยกเลิก)' : 'ยังไม่เบิก'}
                                                            </span>
                                                        </button>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingShiftId(shift.id);
                                                                setSelectedStaffId(staffList.find(s => s.name === shift.staffName)?.id || 'new');
                                                                setStaffName(shift.staffName);
                                                                setWage(shift.wage.toString());
                                                                setRole(shift.role);
                                                                setShiftTime(shift.shiftTime);
                                                                setNote(shift.note || '');
                                                                setShowAddModal(true);
                                                            }}
                                                            className="p-1.5 text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteShift(shift.id)}
                                                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 z-[50] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-white">{editingShiftId ? 'แก้ไขตารางงาน' : 'ลงเวลาเพิ่ม'}</h3>
                            <button onClick={() => { setShowAddModal(false); setEditingShiftId(null); }} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-xs text-zinc-500 mb-1.5 block uppercase font-bold tracking-wider">เลือกพนักงาน</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <select
                                        value={selectedStaffId}
                                        onChange={e => setSelectedStaffId(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none appearance-none"
                                    >
                                        <option value="">-- เลือกพนักงาน --</option>
                                        {staffList.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} (฿{s.defaultWage})</option>
                                        ))}
                                        <option value="new">+ เพิ่มพนักงานใหม่...</option>
                                    </select>
                                </div>
                            </div>

                            {(!selectedStaffId || selectedStaffId === 'new') && (
                                <div className="animate-fade-in">
                                    <label className="text-xs text-zinc-500 mb-1.5 block uppercase font-bold tracking-wider">ชื่อพนักงานใหม่</label>
                                    <input
                                        type="text"
                                        value={staffName}
                                        onChange={e => setStaffName(e.target.value)}
                                        placeholder="เช่น สมชาย, มานี"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1.5 block uppercase font-bold tracking-wider">ค่าจ้างต่อวัน (฿)</label>
                                    <input
                                        type="number"
                                        value={wage}
                                        onChange={e => setWage(e.target.value)}
                                        placeholder="300"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none font-bold text-emerald-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1.5 block uppercase font-bold tracking-wider">สถานะ</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value as any)}
                                        className={`w-full border rounded-xl px-4 py-3 outline-none font-bold ${status === 'PRESENT' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}
                                    >
                                        <option value="PRESENT">✅ มาทำงาน</option>
                                        <option value="ABSENT">❌ ไม่มา</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1.5 block uppercase font-bold tracking-wider">ตำแหน่ง</label>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value as any)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none"
                                    >
                                        <option value="Barista">Barista</option>
                                        <option value="Cashier">Cashier</option>
                                        <option value="Manager">Manager</option>
                                        <option value="General">General</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1.5 block uppercase font-bold tracking-wider">ช่วงกะ</label>
                                    <select
                                        value={shiftTime}
                                        onChange={e => setShiftTime(e.target.value as any)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none"
                                    >
                                        <option value="Morning">เช้า (Morning)</option>
                                        <option value="Afternoon">บ่าย (Afternoon)</option>
                                        <option value="Night">ดึก (Night)</option>
                                        <option value="FullDay">ทั้งวัน (Full Day)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs text-zinc-500 mb-1.5 block uppercase font-bold tracking-wider">หมายเหตุ (ถ้ามี)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="เช่น มาแทน, กลับก่อน"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            </div>
                            
                            {editingShiftId && (
                                <div className="pt-2 border-t border-zinc-800 mt-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            const shift = shifts.find(s => s.id === editingShiftId);
                                            if (shift) {
                                                // Keep Edit Modal Open to prevent jumpiness
                                                handleTogglePayment(shift, e);
                                            }
                                        }}
                                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all border
                                            ${shifts.find(s => s.id === editingShiftId)?.paid 
                                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
                                    >
                                        <Banknote size={18} />
                                        {shifts.find(s => s.id === editingShiftId)?.paid ? 'ยกเลิกสถานะเบิกเงิน' : 'บันทึกเป็น "เบิกแล้ว"'}
                                    </button>
                                </div>
                            )}
                            
                            <button
                                onClick={handleAddShift}
                                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl mt-4 transition-all shadow-lg shadow-violet-900/40 active:scale-95"
                            >
                                บันทึกข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Withdraw Modal */}
            {showWithdrawModal.show && showWithdrawModal.staff && (
                <div className="fixed inset-0 bg-black/80 z-[55] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-white flex items-center gap-2"><Banknote size={18} className="text-emerald-400" /> เบิกเงิน: {showWithdrawModal.staff.name}</h3>
                            <button onClick={() => setShowWithdrawModal({show: false})} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 mb-2">
                                <span className="text-xs text-zinc-500 block mb-1">ยอดค้างจ่ายตอนนี้</span>
                                <span className="text-2xl font-bold text-rose-400">฿{(staffStats.find(s => s.id === showWithdrawModal.staff?.id)?.pending || 0).toLocaleString()}</span>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-500 mb-1.5 block uppercase font-bold tracking-wider">ระบุจำนวนเงินที่เบิก</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">฿</span>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-4 py-4 text-xl font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-2 italic">* จำนวนเงินต้องไม่เกินยอดค้างจ่าย</p>
                            </div>

                            <button
                                onClick={handleWithdraw}
                                disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (staffStats.find(s => s.id === showWithdrawModal.staff?.id)?.pending || 0)}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-white font-bold py-4 rounded-xl mt-4 transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                            >
                                ยืนยันการเบิกเงิน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal.show && showHistoryModal.staff && (
                <div className="fixed inset-0 bg-black/80 z-[55] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-white flex items-center gap-2"><History size={18} className="text-violet-400" /> ประวัติการเบิก: {showHistoryModal.staff.name}</h3>
                            <button onClick={() => setShowHistoryModal({show: false})} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto space-y-3">
                            {(staffStats.find(s => s.id === showHistoryModal.staff?.id)?.withdrawals || []).length === 0 ? (
                                <div className="text-center py-10 text-zinc-600 italic">ไม่มีรายการเบิกเงิน</div>
                            ) : (
                                (staffStats.find(s => s.id === showHistoryModal.staff?.id)?.withdrawals || []).map(w => (
                                    <div key={w.id} className="flex justify-between items-center p-3 bg-zinc-800 border border-zinc-700 rounded-xl group">
                                        <div>
                                            <span className="text-xs text-zinc-500 block">{new Date(w.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
                                            <span className="text-base font-bold text-white">฿{w.amount.toLocaleString()}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteWithdrawal(w.id)}
                                            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">เบิกรวมแล้วทั้งเดือน:</span>
                                <span className="text-emerald-400 font-bold italic">฿{(staffStats.find(s => s.id === showHistoryModal.staff?.id)?.totalWithdrawn || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

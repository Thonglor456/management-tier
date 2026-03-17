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
import type { Shift, Branch, User } from '../types';
import { subscribeToShifts, addShift, deleteShift } from '../services/scheduleService';

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
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

    // Form State
    const [staffName, setStaffName] = useState('');
    const [role, setRole] = useState<'Barista' | 'Cashier' | 'Manager' | 'General'>('Barista');
    const [shiftTime, setShiftTime] = useState<'Morning' | 'Afternoon' | 'FullDay' | 'Night'>('Morning');
    const [note, setNote] = useState('');

    // Load shifts
    useEffect(() => {
        const unsubscribe = subscribeToShifts(selectedBranchId, (data) => {
            setShifts(data);
        });
        return () => unsubscribe();
    }, [selectedBranchId]);

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
        if (!staffName.trim()) return;

        const dateStr = formatDateForStorage(selectedDate);

        try {
            await addShift({
                branchId: selectedBranchId,
                date: dateStr,
                staffName: staffName.trim(),
                role,
                shiftTime,
                note: note.trim(),
                createdBy: currentUser?.username || 'unknown'
            });
            setShowAddModal(false);
            setStaffName('');
            setNote('');
        } catch (error) {
            console.error("Error adding shift:", error);
            alert("บันทึกไม่สำเร็จ");
        }
    };

    const handleDeleteShift = async (id: string) => {
        if (window.confirm("ต้องการลบตารางงานนี้ใช่หรือไม่?")) {
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
                        {dayShifts.slice(0, 3).map((_, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-500'}`}></div>
                        ))}
                        {dayShifts.length > 3 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-zinc-600'}`}></div>}
                    </div>
                </button>
            );
        }
        return days;
    };

    const currentBranchName = branches.find(b => b.id === selectedBranchId)?.name || 'สาขาทั่วไป';

    return (
        <div className="space-y-6 animate-fade-in pb-20">
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

                    {/* Daily Details */}
                    <div className="space-y-4">
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
                                    <Card key={shift.id} className="p-4 flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                                                ${shift.role === 'Barista' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    shift.role === 'Cashier' ? 'bg-amber-500/20 text-amber-400' :
                                                        shift.role === 'Manager' ? 'bg-rose-500/20 text-rose-400' :
                                                            'bg-blue-500/20 text-blue-400'}
                                            `}>
                                                {shift.staffName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white">{shift.staffName}</h4>
                                                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] border
                                                        ${shift.role === 'Barista' ? 'border-emerald-500/30 text-emerald-400' :
                                                            shift.role === 'Cashier' ? 'border-amber-500/30 text-amber-400' :
                                                                shift.role === 'Manager' ? 'border-rose-500/30 text-rose-400' :
                                                                    'border-blue-500/30 text-blue-400'}
                                                    `}>{shift.role}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {shift.shiftTime === 'Morning' ? 'กะเช้า (Morning)' :
                                                            shift.shiftTime === 'Afternoon' ? 'กะบ่าย (Afternoon)' :
                                                                shift.shiftTime === 'Night' ? 'กะดึก (Night)' : 'ทั้งวัน (Full Day)'}
                                                    </span>
                                                </div>
                                                {shift.note && <p className="text-zinc-500 text-xs mt-1 italic">{shift.note}</p>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteShift(shift.id)}
                                            className="p-2 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                // TABLE VIEW
                <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden">
                    {/* Summary Header */}
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                        <h3 className="font-bold text-white text-sm">สรุปตารางงานทั้งหมด ({shifts.length})</h3>
                        <button
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
                                    <th className="px-4 py-3">ช่วงเวลา</th>
                                    <th className="px-4 py-3">หมายเหตุ</th>
                                    <th className="px-4 py-3 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {shifts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-600 italic">
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
                                                    <span className={`px-2 py-0.5 rounded text-[10px] border whitespace-nowrap
                                                        ${shift.role === 'Barista' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' :
                                                            shift.role === 'Cashier' ? 'border-amber-500/20 text-amber-400 bg-amber-500/5' :
                                                                shift.role === 'Manager' ? 'border-rose-500/20 text-rose-400 bg-rose-500/5' :
                                                                    'border-blue-500/20 text-blue-400 bg-blue-500/5'}
                                                    `}>{shift.role}</span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {shift.shiftTime === 'Morning' ? '08:00 - 16:00' :
                                                        shift.shiftTime === 'Afternoon' ? '12:00 - 20:00' :
                                                            shift.shiftTime === 'Night' ? '16:00 - 00:00' : 'Full Day'}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-500 italic truncate max-w-[150px]">{shift.note || '-'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteShift(shift.id)}
                                                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-white">ลงเวลาเพิ่ม</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-xs text-zinc-400 mb-1 block">ชื่อพนักงาน</label>
                                <input
                                    type="text"
                                    value={staffName}
                                    onChange={e => setStaffName(e.target.value)}
                                    placeholder="เช่น สมชาย, มานี"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-400 mb-1 block">ตำแหน่ง</label>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value as any)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                                    >
                                        <option value="Barista">Barista</option>
                                        <option value="Cashier">Cashier</option>
                                        <option value="Manager">Manager</option>
                                        <option value="General">General</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 mb-1 block">ช่วงกะ</label>
                                    <select
                                        value={shiftTime}
                                        onChange={e => setShiftTime(e.target.value as any)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                                    >
                                        <option value="Morning">เช้า (Morning)</option>
                                        <option value="Afternoon">บ่าย (Afternoon)</option>
                                        <option value="Night">ดึก (Night)</option>
                                        <option value="FullDay">ทั้งวัน (Full Day)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 mb-1 block">หมายเหตุ (ถ้ามี)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="เช่น มาแทน, กลับก่อน"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={handleAddShift}
                                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-lg mt-4 transition-colors"
                            >
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

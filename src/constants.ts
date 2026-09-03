import Wallet from 'lucide-react/dist/esm/icons/wallet';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Heart from 'lucide-react/dist/esm/icons/heart';
import type { Branch, Transaction, User } from './types';
import React from 'react';

export const INITIAL_BRANCHES: Branch[] = [
    { id: 'HQ', name: 'ทุกสาขา (All Branches)', color: 'bg-slate-700' }, // Virtual ID for Admin
    { id: 'B01', name: 'สาขา สยามสแควร์', color: 'bg-amber-600' },
    { id: 'B02', name: 'สาขา อารีย์', color: 'bg-indigo-600' },
    { id: 'B03', name: 'สาขา ทองหล่อ', color: 'bg-emerald-600' },
];

export const USERS: User[] = [
    { id: 'u1', username: 'admin', name: 'CEO / Admin', role: 'ADMIN' },
    { id: 'u2', username: 'siam', name: 'Manager Siam', role: 'USER', branchId: 'B01' },
    { id: 'u3', username: 'ari', name: 'Staff Ari', role: 'USER', branchId: 'B02' },
];

export const DEFAULT_INCOME_CATEGORIES = ['เครื่องดื่ม', 'สินค้าฝากขาย', 'อื่นๆ'];

export const DEFAULT_EXPENSE_CATEGORIES = [
    'วัตถุดิบหลัก (กาแฟ/ชา)',
    'วัตถุดิบเสริม (นม/ไซรัป)',
    'บรรจุภัณฑ์',
    'ค่าแรง/เงินเดือน',
    'ค่าเช่าสถานที่',
    'ค่าน้ำ/ไฟ/เน็ต',
    'ซ่อมบำรุง',
    'การตลาด',
    'เบ็ดเตล็ด'
];

// Note: We can't easily export JSX in constants without React import, 
// ensuring React is imported or changing how icons are stored if needed.
// For now, importing React above fixes it.
export const ACCOUNTS = [
    // using dynamic import or functional component might be cleaner, but this works for now
    { id: 'cash', name: 'เงินสด (Cash)', icon: React.createElement(Wallet, { size: 16 }) },
    { id: 'bank', name: 'ธนาคาร (Bank)', icon: React.createElement(CreditCard, { size: 16 }) },
    { id: 'delivery', name: 'Delivery App', icon: React.createElement(Smartphone, { size: 16 }) },
    { id: 'thaiChuaiThai', name: 'ไทยช่วยไทย', icon: React.createElement(Heart, { size: 16 }) },
];

export const getLocalDateString = (d: Date = new Date()): string => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

export const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return getLocalDateString(d);
};

// Initial Data Distributed across branches
export const INITIAL_TRANSACTIONS: Transaction[] = [
    // Siam (B01)
    { id: '1', branchId: 'B01', date: getPastDate(0), type: 'INCOME', name: 'ยอดขายหน้าร้าน', amount: 1250, category: 'ยอดขายหน้าร้าน', paymentMethod: 'cash', note: '', createdBy: 'siam' },
    { id: '2', branchId: 'B01', date: getPastDate(0), type: 'EXPENSE', name: 'น้ำแข็ง', amount: 500, category: 'น้ำแข็ง', paymentMethod: 'cash', note: '', createdBy: 'siam' },
    { id: '3', branchId: 'B01', date: getPastDate(1), type: 'INCOME', name: 'ยอดขายหน้าร้าน', amount: 5400, category: 'ยอดขายหน้าร้าน', paymentMethod: 'bank', note: '', createdBy: 'siam' },

    // Ari (B02)
    { id: '4', branchId: 'B02', date: getPastDate(0), type: 'INCOME', name: 'ยอดขาย Grab', amount: 3200, category: 'ยอดขาย Grab', paymentMethod: 'delivery', note: '', createdBy: 'ari' },
    { id: '5', branchId: 'B02', date: getPastDate(1), type: 'EXPENSE', name: 'ค่าเช่าสถานที่', amount: 15000, category: 'ค่าเช่าสถานที่', paymentMethod: 'bank', note: '', createdBy: 'ari' },

    // Thong Lo (B03)
    { id: '6', branchId: 'B03', date: getPastDate(0), type: 'INCOME', name: 'เมล็ดกาแฟ', amount: 8500, category: 'เมล็ดกาแฟ', paymentMethod: 'bank', note: '', createdBy: 'admin' },
];

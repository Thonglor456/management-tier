import Wallet from 'lucide-react/dist/esm/icons/wallet';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import type { Branch, Transaction, User } from './types';
import React from 'react';

export const INITIAL_BRANCHES: Branch[] = [
    { id: 'HQ', name: 'ทุกสาขา (All Branches)', color: 'bg-slate-700' }, // Virtual ID for Admin
    { id: 'B01', name: 'สาขา สยามสแควร์', color: 'bg-violet-600' },
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
];

export const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
};

// Initial Data Distributed across branches
export const INITIAL_TRANSACTIONS: Transaction[] = [
    // Siam (B01)
    { id: '1', branchId: 'B01', date: getPastDate(0), type: 'INCOME', amount: 1250, category: 'เครื่องดื่ม', paymentMethod: 'cash', note: 'ช่วงเช้าลูกค้าแน่น', createdBy: 'siam' },
    { id: '2', branchId: 'B01', date: getPastDate(0), type: 'EXPENSE', amount: 500, category: 'น้ำแข็ง/ก๊าซ', paymentMethod: 'cash', note: 'น้ำแข็งหมด', createdBy: 'siam' },
    { id: '3', branchId: 'B01', date: getPastDate(1), type: 'INCOME', amount: 5400, category: 'เครื่องดื่ม', paymentMethod: 'bank', note: 'ยอดขายทั้งวัน', createdBy: 'siam' },

    // Ari (B02)
    { id: '4', branchId: 'B02', date: getPastDate(0), type: 'INCOME', amount: 3200, category: 'เครื่องดื่ม', paymentMethod: 'delivery', note: 'Grab Food ปังมาก', createdBy: 'ari' },
    { id: '5', branchId: 'B02', date: getPastDate(1), type: 'EXPENSE', amount: 15000, category: 'ค่าเช่าสถานที่', paymentMethod: 'bank', note: 'ค่าเช่าเดือนนี้', createdBy: 'ari' },

    // Thong Lo (B03)
    { id: '6', branchId: 'B03', date: getPastDate(0), type: 'INCOME', amount: 8500, category: 'สินค้าฝากขาย', paymentMethod: 'bank', note: 'ขายเมล็ดกาแฟ Lot ใหม่', createdBy: 'admin' },
];

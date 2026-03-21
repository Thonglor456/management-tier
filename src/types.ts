export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT' | 'DIVIDEND';
export type UserRole = 'ADMIN' | 'USER';

export interface Branch {
    id: string;
    name: string;
    color: string;
    actualBankBalance?: number; // Real balance in bank account
    actualCashBalance?: number; // Real balance in cash
    actualDeliveryBalance?: number; // Real balance in delivery accounts
}

export interface User {
    id: string;
    username: string;
    name: string;
    role: UserRole;
    branchId?: string; // If undefined, can access all (Admin)
}

export interface Transaction {
    id: string;
    branchId: string; // Linked to Branch
    date: string;
    type: TransactionType;
    name: string;      // Specific item name/title
    amount: number;
    category: string;  // Grouping category
    paymentMethod: string;
    toAccount?: string;
    note: string;      // Additional details
    createdBy: string;
}

export interface AccountBalance {
    cash: number;
    bank: number;
    delivery: number;
}

export interface ReconciliationRecord {
    id: string;
    branchId: string;
    date: string; // ISO String
    items: {
        accountId: string;
        systemAmount: number;
        actualAmount: number;
        diff: number;
    }[];
    totalDiff: number;
    note?: string;
    createdBy: string;
}

export interface Shift {
    id: string;
    branchId: string;
    date: string; // YYYY-MM-DD
    staffName: string;
    role: 'Barista' | 'Cashier' | 'Manager' | 'General';
    shiftTime: 'Morning' | 'Afternoon' | 'FullDay' | 'Night';
    wage: number;
    status: 'PRESENT' | 'ABSENT';
    paid: boolean;
    paidAt?: string;
    note?: string;
    createdBy?: string;
}

export interface Withdrawal {
    id: string;
    staffId: string;
    staffName: string;
    branchId: string;
    date: string; // ISO String
    amount: number;
    month: string; // YYYY-MM
    createdBy: string;
}

export interface Staff {
    id: string;
    name: string;
    defaultWage: number;
    branchId: string;
}

import {
    collection,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Branch, Transaction, ReconciliationRecord } from '../types';

// --- Branches ---

export const subscribeToBranches = (onUpdate: (branches: Branch[]) => void) => {
    const q = query(collection(db, 'branches'));
    // Note: Ordering can be done here or client side. Firestore requires index for complex sorting.

    return onSnapshot(q, (snapshot) => {
        const branches = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Branch[];
        onUpdate(branches);
    });
};

export const addBranch = async (name: string) => {
    const colors = ['bg-pink-600', 'bg-orange-600', 'bg-cyan-600', 'bg-lime-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    await addDoc(collection(db, 'branches'), {
        name,
        color: randomColor
    });
};

export const updateBranch = async (id: string, name: string) => {
    // Prevent updating virtual ID 'HQ' if it ever gets passed, though it shouldn't be in DB.
    if (id === 'HQ') return;
    await updateDoc(doc(db, 'branches', id), { name });
};

export const updateBranchBalance = async (id: string, updates: { actualBankBalance?: number, actualCashBalance?: number }) => {
    if (id === 'HQ') return;
    await updateDoc(doc(db, 'branches', id), updates);
};

export const deleteBranch = async (id: string) => {
    if (id === 'HQ') return;
    // Note: Ideally, we should batch delete transactions associated with this branch.
    // For now, valid implementation is just deleting the branch doc.
    await deleteDoc(doc(db, 'branches', id));

    // Optional: Clean up transactions
    // const ref = collection(db, 'transactions');
    // const q = query(ref, where('branchId', '==', id));
    // const snap = await getDocs(q);
    // snap.forEach(doc => deleteDoc(doc.ref));
};

// --- Transactions ---

export const subscribeToTransactions = (branchId: string, onUpdate: (transactions: Transaction[]) => void) => {
    let q;
    // If HQ, showing ALL transactions might be heavy in production, but okay for MVP.
    // Ideally, we might want to limit to 'last 3 months' or pagination.
    if (branchId === 'HQ') {
        q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    } else {
        q = query(collection(db, 'transactions'), where('branchId', '==', branchId), orderBy('date', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Transaction[];
        onUpdate(transactions);
    });
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    await addDoc(collection(db, 'transactions'), transaction);
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    await updateDoc(doc(db, 'transactions', id), transaction);
};

export const deleteTransactionReal = async (id: string) => {
    await deleteDoc(doc(db, 'transactions', id));
};

// --- Users ---

export const getUserProfile = async (uid: string) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as any;
    } else {
        return null;
    }
};

export const createUserProfile = async (uid: string, data: any) => {
    await setDoc(doc(db, 'users', uid), data);
};

export const subscribeToUsers = (onUpdate: (users: any[]) => void) => {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        onUpdate(users);
    });
};

export const updateUser = async (uid: string, data: any) => {
    await updateDoc(doc(db, 'users', uid), data);
};

// --- Create User (Client-Side) ---
// Note: This uses a secondary app to avoid logging out the current admin
import { createUserWithEmailAndPassword, getAuth as getAuthSecondary, signOut as signOutSecondary } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
// We need to import the config to re-init
// Assuming firebase.ts exports app, auth, db, but maybe not config. 
// We will just copy the config here or better, export it from firebase.ts. 
// For now, let's just hardcode the config (same as firebase.ts) or try to use existing options if possible.
// Actually, let's assume we can get options from the main app.
import { getApp } from 'firebase/app';

export const createNewUser = async (data: {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'USER';
    branchId: string | null;
}) => {
    // 1. Initialize a secondary app instance
    const mainApp = getApp();
    const secondaryApp = initializeApp(mainApp.options, 'SecondaryApp');
    const secondaryAuth = getAuthSecondary(secondaryApp);

    try {
        // 2. Create user in Firebase Auth using secondary auth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
        const newUser = userCredential.user;

        // 3. Create user profile in Firestore (using MAIN db is fine, as we are authenticated as Admin there)
        await setDoc(doc(db, 'users', newUser.uid), {
            username: data.email.split('@')[0],
            name: data.name,
            role: data.role,
            branchId: data.branchId,
            createdAt: new Date().toISOString(),
        });

        // 4. Sign out from secondary (just in case) and delete app
        await signOutSecondary(secondaryAuth);

        return {
            success: true,
            uid: newUser.uid,
            message: `สร้างผู้ใช้ ${data.email} สำเร็จ`
        };
    } catch (error: any) {
        throw error;
    } finally {
        // Always cleanup
        await deleteApp(secondaryApp);
    }
};

// --- Reconciliations ---

export const addReconciliation = async (record: Omit<ReconciliationRecord, 'id'>) => {
    await addDoc(collection(db, 'reconciliations'), record);
};

// --- Categories ---

const CATEGORIES_DOC = doc(db, 'settings', 'categories');

export const getCategories = async (): Promise<{ income: string[]; expense: string[] } | null> => {
    const snap = await getDoc(CATEGORIES_DOC);
    if (snap.exists()) {
        return snap.data() as { income: string[]; expense: string[] };
    }
    return null;
};

export const saveCategories = async (income: string[], expense: string[]) => {
    await setDoc(CATEGORIES_DOC, { income, expense });
};

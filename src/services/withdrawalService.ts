import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Withdrawal } from '../types';

const COLLECTION_NAME = 'withdrawals';

export const subscribeToWithdrawals = (
    branchId: string,
    month: string, // YYYY-MM
    callback: (withdrawals: Withdrawal[]) => void
) => {
    let q;
    if (branchId === 'HQ') {
        q = query(
            collection(db, COLLECTION_NAME),
            where('month', '==', month)
        );
    } else {
        q = query(
            collection(db, COLLECTION_NAME),
            where('branchId', '==', branchId),
            where('month', '==', month)
        );
    }

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Withdrawal[];
        
        // Sort by date descending
        data.sort((a, b) => b.date.localeCompare(a.date));
        callback(data);
    });
};

export const addWithdrawal = async (withdrawal: Omit<Withdrawal, 'id'>) => {
    await addDoc(collection(db, COLLECTION_NAME), {
        ...withdrawal,
        createdAt: serverTimestamp()
    });
};

export const deleteWithdrawal = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};

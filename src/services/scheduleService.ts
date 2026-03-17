import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Shift } from '../types';

const COLLECTION_NAME = 'shifts';

export const subscribeToShifts = (
    branchId: string,
    callback: (shifts: Shift[]) => void
) => {
    // If viewing all branches (HQ), maybe we want to see everything?
    // For now, let's assume we filter by branch unless it's strictly 'HQ' and we want all.
    // However, usually schedules are branch-specific.
    // If branchId is HQ, let's query all, or maybe we enforce selecting a branch first in the UI.
    // Let's support querying all if branchId is HQ.

    let q;
    if (branchId === 'HQ') {
        q = query(
            collection(db, COLLECTION_NAME)
        );
    } else {
        q = query(
            collection(db, COLLECTION_NAME),
            where('branchId', '==', branchId)
        );
    }

    return onSnapshot(q, (snapshot) => {
        const shifts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Shift[];

        // Sort client-side to avoid composite index requirement
        shifts.sort((a, b) => a.date.localeCompare(b.date));

        callback(shifts);
    });
};

export const addShift = async (shift: Omit<Shift, 'id'>) => {
    await addDoc(collection(db, COLLECTION_NAME), {
        ...shift,
        createdAt: serverTimestamp()
    });
};

export const updateShift = async (id: string, updates: Partial<Shift>) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const deleteShift = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};

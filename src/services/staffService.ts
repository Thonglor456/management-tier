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
import type { Staff } from '../types';

const COLLECTION_NAME = 'staff';

export const subscribeToStaff = (
    branchId: string,
    callback: (staff: Staff[]) => void
) => {
    let q;
    if (branchId === 'HQ') {
        q = query(collection(db, COLLECTION_NAME));
    } else {
        q = query(
            collection(db, COLLECTION_NAME),
            where('branchId', '==', branchId)
        );
    }

    return onSnapshot(q, (snapshot) => {
        const staff = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Staff[];
        
        staff.sort((a, b) => a.name.localeCompare(b.name));
        callback(staff);
    });
};

export const addStaff = async (staff: Omit<Staff, 'id'>) => {
    await addDoc(collection(db, COLLECTION_NAME), {
        ...staff,
        createdAt: serverTimestamp()
    });
};

export const updateStaff = async (id: string, updates: Partial<Staff>) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const deleteStaff = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};

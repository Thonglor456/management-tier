import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCFzyPEvsM2FHIWwcDBZ-2JzSJDmBIWk4Y",
    authDomain: "management-tier.firebaseapp.com",
    projectId: "management-tier",
    storageBucket: "management-tier.firebasestorage.app",
    messagingSenderId: "608166397546",
    appId: "1:608166397546:web:a0b6ca0ec9858a8c4d6c13"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

async function inspect() {
    console.log("=== INSPECTING FIRESTORE ===");
    
    // Branches
    console.log("\n--- Branches ---");
    const branchesSnap = await getDocs(collection(db, "branches"));
    branchesSnap.forEach(doc => {
        console.log(doc.id, "=>", doc.data());
    });

    // Recent Transactions
    console.log("\n--- Recent Transactions ---");
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(20));
    const txnsSnap = await getDocs(q);
    txnsSnap.forEach(doc => {
        console.log(doc.id, "=>", doc.data().date, doc.data().name, doc.data().amount, doc.data().paymentMethod);
    });
}

inspect().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

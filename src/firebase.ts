import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCFzyPEvsM2FHIWwcDBZ-2JzSJDmBIWk4Y",
    authDomain: "management-tier.firebaseapp.com",
    projectId: "management-tier",
    storageBucket: "management-tier.firebasestorage.app",
    messagingSenderId: "608166397546",
    appId: "1:608166397546:web:a0b6ca0ec9858a8c4d6c13"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

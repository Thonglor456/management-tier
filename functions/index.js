/**
 * Cloud Functions for Tier Coffee Accounting
 * User Management Functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const auth = getAuth();

// Global options for cost control
setGlobalOptions({ maxInstances: 10, region: "asia-southeast1" });

/**
 * Create a new user (callable function)
 * Only ADMIN users can call this function
 */
exports.createUser = onCall(async (request) => {
    const { email, password, name, role, branchId } = request.data;
    const callerUid = request.auth?.uid;

    // 1. Verify the caller is authenticated
    if (!callerUid) {
        throw new HttpsError("unauthenticated", "ต้องเข้าสู่ระบบก่อน");
    }

    // 2. Verify the caller is an ADMIN
    const callerDoc = await db.collection("users").doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data().role !== "ADMIN") {
        throw new HttpsError("permission-denied", "เฉพาะ Admin เท่านั้นที่สร้างผู้ใช้ได้");
    }

    // 3. Validate input
    if (!email || !password || !name) {
        throw new HttpsError("invalid-argument", "กรุณากรอกข้อมูลให้ครบ (Email, Password, ชื่อ)");
    }

    if (password.length < 6) {
        throw new HttpsError("invalid-argument", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    }

    try {
        // 4. Create user in Firebase Authentication
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: name,
        });

        logger.info(`Created new user: ${userRecord.uid} (${email})`);

        // 5. Create user profile in Firestore
        await db.collection("users").doc(userRecord.uid).set({
            username: email.split("@")[0],
            name: name,
            role: role || "USER",
            branchId: branchId || null,
            createdAt: new Date().toISOString(),
            createdBy: callerUid,
        });

        logger.info(`Created user profile for: ${userRecord.uid}`);

        return {
            success: true,
            uid: userRecord.uid,
            message: `สร้างผู้ใช้ ${email} สำเร็จ`,
        };
    } catch (error) {
        logger.error("Error creating user:", error);

        if (error.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "อีเมลนี้มีผู้ใช้แล้ว");
        }
        if (error.code === "auth/invalid-email") {
            throw new HttpsError("invalid-argument", "รูปแบบอีเมลไม่ถูกต้อง");
        }

        throw new HttpsError("internal", `เกิดข้อผิดพลาด: ${error.message}`);
    }
});

import type { Transaction } from '../types';

const SHEET_ID = '11nUSrTuzLyuWRYoa6lkkA79W_EaXLWZP-UJoA2T6AOQ';
const SHEET_NAME = 'ขอนแก่น หน้าบ้าน';

export interface SheetConfig {
    sheetId: string;
    sheetName?: string;
}

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
    sheetId: SHEET_ID,
    sheetName: SHEET_NAME,
};

export const extractSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

interface GvizCell {
    v: string | number | null;
    f?: string;
}
// ... (rest of the interfaces remain the same)
interface GvizRow {
    c: (GvizCell | null)[];
}

interface GvizTable {
    cols: { id: string; label: string; type: string }[];
    rows: GvizRow[];
}

// Firebase Cloud Function that fetches Google Sheets server-to-server.
// Replaces the old flaky public CORS proxies (corsproxy.io / allorigins.win),
// which were unreliable and whose own errors (e.g. a 401 from the proxy
// itself) were being misreported to users as "the Sheet isn't shared".
const SHEETS_PROXY_FUNCTION_URL = 'https://asia-southeast1-management-tier.cloudfunctions.net/fetchGoogleSheet';

/**
 * Fetch data from a public Google Sheets using the gviz JSON endpoint,
 * via our own Cloud Function (avoids browser CORS and third-party proxies).
 */
export const fetchSheetData = async (config: SheetConfig): Promise<GvizTable> => {
    const params = new URLSearchParams({ sheetId: config.sheetId });
    if (config.sheetName) params.set('sheetName', config.sheetName);

    let response: Response;
    try {
        response = await fetch(`${SHEETS_PROXY_FUNCTION_URL}?${params.toString()}`);
    } catch (error: any) {
        throw new Error(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Network error): ${error.message}`);
    }

    if (!response.ok) {
        let message = `ไม่สามารถดึงข้อมูลจาก Google Sheets [${config.sheetName}] ได้ (${response.status})`;
        try {
            const errBody = await response.json();
            if (errBody?.error) message = errBody.error;
        } catch {
            // Response wasn't JSON - keep the default message above.
        }
        throw new Error(message);
    }

    const text = await response.text();
    if (!text) {
        throw new Error(`ไม่สามารถดึงข้อมูลจาก Google Sheets [${config.sheetName}] ได้ (Empty response)`);
    }

    // Safe JSON extraction between first { and last }
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
        throw new Error(`ไม่พบข้อมูลใน Google Sheets [${config.sheetName}] (Format error)`);
    }

    const jsonStr = text.substring(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonStr);
    return parsed.table as GvizTable;
};

/**
 * Convert dd/mm/yy date string to YYYY-MM-DD format.
 */
const parseDateDDMMYY = (dateStr: string): string => {
    // 1. Handle "Date(year, month, day)" format from gviz
    const dateMatch = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (dateMatch) {
        let year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) + 1; // gviz months are 0-indexed
        const day = parseInt(dateMatch[3]);
        // Handle Buddhist Era if year > 2500
        if (year > 2500) year -= 543;
        // Handle Google Sheets 2-digit BE years parsed as 19xx AD (e.g. 1969 -> 2026)
        if (year >= 1950 && year <= 2000) {
            year += 57;
        }
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // Clean up string
    const cleaned = dateStr.trim();
    if (!cleaned) return '';

    // Check for standard YYYY-MM-DD format (already valid)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        let year = parseInt(cleaned.substring(0, 4));
        if (year > 2500) {
            year -= 543;
            return `${year}-${cleaned.substring(5)}`;
        }
        return cleaned;
    }

    // Split by common delimiters: /, -, .
    const parts = cleaned.split(/[\/\-\.]/);
    if (parts.length === 3) {
        // Let's determine if first part is Year or Day
        let dayStr = '';
        let monthStr = '';
        let yearStr = '';

        if (parts[0].length === 4) {
            // YYYY-MM-DD or YYYY/MM/DD
            yearStr = parts[0];
            monthStr = parts[1];
            dayStr = parts[2];
        } else {
            // DD/MM/YYYY or DD-MM-YYYY
            dayStr = parts[0];
            monthStr = parts[1];
            yearStr = parts[2];
        }

        const day = dayStr.padStart(2, '0');
        const month = monthStr.padStart(2, '0');
        let year = parseInt(yearStr);

        // Handle 2-digit year
        if (year < 100) {
            if (year > 50) {
                year += 2500;
            } else {
                year += 2000;
            }
        }

        // Handle Buddhist Era (พ.ศ.)
        if (year > 2500) {
            year -= 543;
        } else if (year > 2400) {
            year -= 543;
        }

        return `${year}-${month}-${day}`;
    }

    return dateStr; // fallback
};

const getCellValue = (row: GvizRow, colIndex: number): string | number | null => {
    const cell = row.c?.[colIndex];
    if (!cell) return null;
    return cell.v;
};

const getCellString = (row: GvizRow, colIndex: number): string => {
    const cell = row.c?.[colIndex];
    if (!cell) return '';
    if (cell.f) return cell.f;
    if (cell.v !== null && cell.v !== undefined) return String(cell.v);
    return '';
};

const getCellNumber = (row: GvizRow, colIndex: number): number | null => {
    const val = getCellValue(row, colIndex);
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
    return isNaN(num) ? null : num;
};

const getCellDate = (row: GvizRow, colIndex: number): string | null => {
    const cell = row.c?.[colIndex];
    if (!cell || cell.v === null || cell.v === undefined) return null;

    if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
        return parseDateDDMMYY(cell.v);
    }

    if (cell.f) {
        return parseDateDDMMYY(cell.f);
    }

    if (typeof cell.v === 'string' && cell.v.includes('/')) {
        return parseDateDDMMYY(cell.v);
    }

    return null;
};

export interface ParsedImportData {
    transactions: Omit<Transaction, 'id'>[];
    summary: {
        totalDays: number;
        totalTransactions: number;
        incomeCount: number;
        expenseCount: number;
        totalIncome: number;
        totalExpense: number;
        dateRange: { start: string; end: string };
    };
}

/**
 * Common data row slicer: 
 * - Skips Title (merged) and Header rows (label "วันที่" or "สาขา:")
 * - Skips Footer summary rows (label "รวม" in Col A or empty values)
 */
const sliceDataRows = (rows: GvizRow[]): GvizRow[] => {
    if (rows.length === 0) return [];
    
    return rows.filter((row) => {
        const colA = getCellString(row, 0).trim();
        
        // Skip common header/title patterns
        if (colA.includes('สาขา:') || colA === 'วันที่' || colA === 'วันที่นำเข้า') return false;
        
        // Skip empty rows or footer summary rows
        if (!colA || colA === 'รวม' || colA === 'รวมทั้งหมด') return false;
        
        return true;
    });
};

/**
 * Fetch and parse unified sheet ("ขอนแก่น หน้าบ้าน").
 * 
 * Column Structure:
 * col A = วันที่
 * col B = ประเภท ("รายรับ" หรือ "รายจ่าย")
 * col C = รายการ (ชื่อ เช่น ยอดขาย, น้ำแข็ง) -> category & name
 * col D = จำนวน (ตัวเลข)
 * col E = หมวดหมู่ (Broad Grouping) -> IGNORED (as per 1661)
 * col F = ช่องทาง (เช่น ธนาคาร, เงินสด) -> paymentMethod
 */
export const fetchAllSheetsAndParse = async (
    branchId: string,
    createdBy: string,
    branchName: string,
    googleSheetsUrl?: string,
    googleSheetsTabs?: string
): Promise<ParsedImportData> => {
    
    let targetSheetId = SHEET_ID;
    let sheetNames: string[] = [];

    if (googleSheetsUrl) {
        const extractedId = extractSheetIdFromUrl(googleSheetsUrl);
        if (!extractedId) {
            throw new Error("URL ของ Google Sheets ไม่ถูกต้อง กรุณาตรวจสอบลิงก์อีกครั้ง");
        }
        targetSheetId = extractedId;

        if (googleSheetsTabs && googleSheetsTabs.trim()) {
            sheetNames = googleSheetsTabs.split(',').map(s => s.trim()).filter(Boolean);
        } else {
            // Empty string means it will fetch the default first tab and use standard parsing logic
            sheetNames = [""]; 
        }
    } else {
        // Fallback to legacy logic
        sheetNames = ["ขอนแก่น หน้าบ้าน"];
        if (branchName === "2. ร้อยเอ็ด") {
            sheetNames = ["ร้อยเอ็ด", "ร้อยเอ็ด โอน"];
        } else if (branchName === "1. ขอนแก่น หน้าบ้าน") {
            sheetNames = ["ขอนแก่น หน้าบ้าน", "ขอนแก่น โอน"];
        } else if (branchName === "3.ขอนแก่น โคลัมโบ") {
            sheetNames = ["ขอนแก่น โคลัมโบ", "ขอนแก่น โคลัมโบ โอน"];
        }
    }

    console.log('--- IMPORT SERVICE START ---');
    console.log('branchName received:', branchName);
    console.log('sheetNames decided:', sheetNames);
    console.log('targetSheetId:', targetSheetId);

    // Fetch all sheets concurrently
    const tables = await Promise.all(
        sheetNames.map(sheetName => fetchSheetData({ sheetId: targetSheetId, sheetName: sheetName || undefined }))
    );

    const transactions: Omit<Transaction, 'id'>[] = [];
    const uniqueDates = new Set<string>();

    for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        const table = tables[i];
        const rows = sliceDataRows(table.rows);

        if (sheetName === "ขอนแก่น โอน") {
            // Specific parsing for ขอนแก่น โอน
            for (const row of rows) {
                const date = getCellDate(row, 0); // Col A
                const nameInSheet = getCellString(row, 2).trim(); // Col C
                const amount = getCellNumber(row, 3); // Col D
                const categoryRaw = getCellString(row, 4).trim(); // Col E
                
                if (!date || !amount || amount <= 0) continue;

                const validCategories = [
                    "วัตถุดิบหลัก (กาแฟ/ชา)", 
                    "วัตถุดิบเสริม (นม/ไซรัป)", 
                    "น้ำแข็ง", 
                    "บรรจุภัณฑ์", 
                    "ค่าแรง/เงินเดือน", 
                    "ค่าเช่าสถานที่", 
                    "ค่าน้ำ/ไฟ/เน็ต", 
                    "ซ่อมบำรุง", 
                    "การตลาด", 
                    "เบ็ดเตล็ด"
                ];
                
                let mappedCategory = "เบ็ดเตล็ด";
                if (validCategories.includes(categoryRaw)) {
                    mappedCategory = categoryRaw;
                }

                transactions.push({
                    branchId,
                    date,
                    type: 'EXPENSE',
                    name: nameInSheet || mappedCategory,
                    amount,
                    category: mappedCategory,
                    paymentMethod: 'bank', // Force bank
                    note: "",
                    createdBy,
                });
                uniqueDates.add(date);
            }
        } else if (sheetName === "ขอนแก่น โคลัมโบ โอน") {
            // Specific parsing for ขอนแก่น โคลัมโบ โอน (Same logic as ขอนแก่น โอน)
            for (const row of rows) {
                const date = getCellDate(row, 0); // Col A
                const nameInSheet = getCellString(row, 2).trim(); // Col C
                const amount = getCellNumber(row, 3); // Col D
                const categoryRaw = getCellString(row, 4).trim(); // Col E
                
                if (!date || !amount || amount <= 0) continue;

                const validCategories = [
                    "วัตถุดิบหลัก (กาแฟ/ชา)", 
                    "วัตถุดิบเสริม (นม/ไซรัป)", 
                    "น้ำแข็ง", 
                    "บรรจุภัณฑ์", 
                    "ค่าแรง/เงินเดือน", 
                    "ค่าเช่าสถานที่", 
                    "ค่าน้ำ/ไฟ/เน็ต", 
                    "ซ่อมบำรุง", 
                    "การตลาด", 
                    "เบ็ดเตล็ด"
                ];
                
                let mappedCategory = "เบ็ดเตล็ด";
                if (validCategories.includes(categoryRaw)) {
                    mappedCategory = categoryRaw;
                }

                transactions.push({
                    branchId,
                    date,
                    type: 'EXPENSE',
                    name: nameInSheet || mappedCategory,
                    amount,
                    category: mappedCategory,
                    paymentMethod: 'bank', // Force bank
                    note: "",
                    createdBy,
                });
                uniqueDates.add(date);
            }
        } else if (sheetName === "ร้อยเอ็ด โอน") {
            // Specific parsing for ร้อยเอ็ด โอน
            for (const row of rows) {
                const date = getCellDate(row, 0); // Col A
                const nameInSheet = getCellString(row, 2).trim(); // Col C
                const amount = getCellNumber(row, 3); // Col D
                const categoryRaw = getCellString(row, 4).trim(); // Col E
                
                if (!date || !amount || amount <= 0) continue;

                transactions.push({
                    branchId,
                    date,
                    type: 'EXPENSE',
                    name: nameInSheet || (categoryRaw || "เบ็ดเตล็ด"),
                    amount,
                    category: categoryRaw || "เบ็ดเตล็ด",
                    paymentMethod: 'bank',
                    note: "",
                    createdBy,
                });
                uniqueDates.add(date);
            }
        } else {
            // Standard parsing for "ขอนแก่น หน้าบ้าน" and "ร้อยเอ็ด"
            for (const row of rows) {
                const date = getCellDate(row, 0);
                const typeStr = getCellString(row, 1).trim(); // "รายรับ" or "รายจ่าย"
                const nameInSheet = getCellString(row, 2).trim(); // Col C (รายการ เช่น น้ำแข็ง, ยอดขาย)
                const amount = getCellNumber(row, 3);
                // Column E is ignored as per user request 1661
                const channelStr = getCellString(row, 5).trim(); // "ธนาคาร", "เงินสด", "Delivery" - Col F
        
                if (!date || !typeStr || !amount || amount <= 0) continue;
        
                // Debug log to verify mapping in browser console if needed
                if (transactions.length === 0) {
                    console.log(`DEBUG: First row mapped for ${sheetName}:`, {
                        date,
                        type: typeStr,
                        colC_Item: nameInSheet,
                        colD_Amount: amount,
                        colF_Channel: channelStr
                    });
                }
        
                uniqueDates.add(date);
        
                const type = typeStr === 'รายรับ' ? 'INCOME' : 'EXPENSE';
                
                // Map payment method
                let paymentMethod: string = 'cash';
                const methodLower = channelStr.toLowerCase();
                if (methodLower.includes('ธนาคาร') || methodLower.includes('โอน')) paymentMethod = 'bank';
                else if (methodLower.includes('delivery') || methodLower.includes('grab')) paymentMethod = 'delivery';
                else if (methodLower.includes('ไทยช่วยไทย')) paymentMethod = 'thaiChuaiThai';
        
                // Debug log for each row
                if (row.c[2]?.v) {
                    console.log('IMPORT DEBUG - Col C:', row.c[2].v);
                    console.log('category mapped to:', String(row.c[2].v));
                    console.log('name mapped to:', String(row.c[2].v));
                }
        
                transactions.push({
                    branchId,
                    date,
                    type,
                    name: String(row.c[2]?.v || (type === 'INCOME' ? 'ยอดขาย' : 'รายจ่าย')),
                    amount,
                    category: String(row.c[2]?.v ?? "เบ็ดเตล็ด"),
                    paymentMethod,
                    note: "",
                    createdBy,
                });
            }
        }
    }

    const sortedDates = Array.from(uniqueDates).sort();
    const incomeTxns = transactions.filter(t => t.type === 'INCOME');
    const expenseTxns = transactions.filter(t => t.type === 'EXPENSE');

    // Sort transactions by date then type (income first)
    transactions.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.type === 'INCOME' ? -1 : 1;
    });

    return {
        transactions,
        summary: {
            totalDays: sortedDates.length,
            totalTransactions: transactions.length,
            incomeCount: incomeTxns.length,
            expenseCount: expenseTxns.length,
            totalIncome: incomeTxns.reduce((s, t) => s + t.amount, 0),
            totalExpense: expenseTxns.reduce((s, t) => s + t.amount, 0),
            dateRange: {
                start: sortedDates[0] || '',
                end: sortedDates[sortedDates.length - 1] || '',
            },
        },
    };
};

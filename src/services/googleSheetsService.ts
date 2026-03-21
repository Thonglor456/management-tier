import type { Transaction } from '../types';

const SHEET_ID = '11nUSrTuzLyuWRYoa6lkkA79W_EaXLWZP-UJoA2T6AOQ';
const SHEET_NAME = 'ขอนแก่น หน้าบ้าน';

export interface SheetConfig {
    sheetId: string;
    sheetName: string;
}

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
    sheetId: SHEET_ID,
    sheetName: SHEET_NAME,
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

/**
 * Fetch data from a public Google Sheets using the gviz JSON endpoint.
 */
export const fetchSheetData = async (config: SheetConfig): Promise<GvizTable> => {
    const targetUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(config.sheetName)}`;

    let text = "";
    let lastError = "";

    // Sequential multi-proxy fetcher
    const methods = [
        { name: 'corsproxy.io', url: `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}` },
        { name: 'allorigins.win', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` },
        { name: 'direct', url: targetUrl }
    ];

    for (const method of methods) {
        try {
            const response = await fetch(method.url);
            if (response.status === 401) {
                throw new Error("Authentication required (401): Please share the Google Sheet as 'Anyone with the link can view'");
            }
            if (!response.ok) {
                throw new Error(`${method.name} error: ${response.status}`);
            }
            text = await response.text();
            if (text) break; // Success!
        } catch (error: any) {
            console.warn(`${method.name} fetch failed:`, error.message);
            lastError = error.message;
            if (error.message.includes("401")) throw error; // Stop immediately if it's a permission issue
        }
    }

    if (!text) {
        throw new Error(lastError || `ไม่สามารถดึงข้อมูลจาก Google Sheets [${config.sheetName}] ได้ (CORS/Network error)`);
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
    // Handle "Date(year, month, day)" format from gviz
    const dateMatch = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (dateMatch) {
        let year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) + 1; // gviz months are 0-indexed
        const day = parseInt(dateMatch[3]);
        // Handle Buddhist Era if year > 2500
        if (year > 2500) year -= 543;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // Handle dd/mm/yy string format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parseInt(parts[2]);

        // Handle 2-digit year
        if (year < 100) {
            // In Thailand, "67", "68", "69" are almost certainly BE 2567, 2568, 2569
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
            // Some older formats might use BE without leading 2
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
 * col C = รายการ (ชื่อ เช่น ยอดขาย, น้ำแข็ง) -> note
 * col D = จำนวน (ตัวเลข)
 * col E = หมวดหมู่ (เช่น ยอดขาย, วัตถุดิบ) -> category
 * col F = ช่องทาง (เช่น ธนาคาร, เงินสด) -> paymentMethod
 */
export const fetchAllSheetsAndParse = async (
    branchId: string,
    createdBy: string
): Promise<ParsedImportData> => {
    const table = await fetchSheetData(DEFAULT_SHEET_CONFIG);

    const transactions: Omit<Transaction, 'id'>[] = [];
    const uniqueDates = new Set<string>();

    const rows = sliceDataRows(table.rows);
    for (const row of rows) {
        const date = getCellDate(row, 0);
        const typeStr = getCellString(row, 1).trim(); // "รายรับ" or "รายจ่าย"
        const name = getCellString(row, 2).trim();     // Name (น้ำแข็ง) - Col C
        const amount = getCellNumber(row, 3);
        const category = getCellString(row, 4).trim(); // Category (วัตถุดิบ) - Col E
        const channelStr = getCellString(row, 5).trim(); // "ธนาคาร", "เงินสด", "Delivery" - Col F

        if (!date || !typeStr || !amount || amount <= 0) continue;

        uniqueDates.add(date);

        const type = typeStr === 'รายรับ' ? 'INCOME' : 'EXPENSE';
        
        // Map payment method
        let paymentMethod: string = 'cash';
        const methodLower = channelStr.toLowerCase();
        if (methodLower.includes('ธนาคาร') || methodLower.includes('โอน')) paymentMethod = 'bank';
        else if (methodLower.includes('delivery') || methodLower.includes('grab')) paymentMethod = 'delivery';

        transactions.push({
            branchId,
            date,
            type,
            name: name || (type === 'INCOME' ? 'ยอดขาย' : 'รายจ่าย'),
            amount,
            category: category || (type === 'INCOME' ? 'ยอดขาย' : 'อื่นๆ'),
            paymentMethod,
            note: '', // Items now use the 'name' field, leaving note for extra info
            createdBy,
        });
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

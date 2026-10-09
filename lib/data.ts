import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

/** Parser CSV sederhana yang menangani field berkutip dan koma di dalamnya. */
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // abaikan
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows
    .slice(1)
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      header.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

function readCSV(name: string): Record<string, string>[] {
  const text = fs.readFileSync(path.join(DATA_DIR, name), "utf-8");
  return parseCSV(text);
}

function readJSONL(name: string): Record<string, any>[] {
  const text = fs.readFileSync(path.join(DATA_DIR, name), "utf-8");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

export interface RawData {
  accounts: Record<string, string>[];
  contacts: Record<string, string>[];
  history: Record<string, string>[];
  deals: Record<string, string>[];
  employees: Record<string, string>[];
  interactions: Record<string, any>[];
}

let cache: RawData | null = null;

export function loadData(): RawData {
  if (cache) return cache;
  cache = {
    accounts: readCSV("crm_accounts.csv"),
    contacts: readCSV("crm_contacts.csv"),
    history: readCSV("contact_employment_history.csv"),
    deals: readCSV("crm_deals.csv"),
    employees: readCSV("employees.csv"),
    interactions: readJSONL("interactions.jsonl"),
  };
  return cache;
}

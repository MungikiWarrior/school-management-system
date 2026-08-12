export type StudentCsvRow = {
  rowNumber: number;
  fullName: string;
  email: string;
  gender: "MALE" | "FEMALE";
  gradeLevel: number;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
};

export type StudentCsvError = {
  rowNumber: number;
  field?: string;
  message: string;
};

export type StudentCsvParseResult = {
  rows: StudentCsvRow[];
  errors: StudentCsvError[];
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

const normalizeHeader = (header: string) => header.trim().toLowerCase().replace(/[\s_-]+/g, "");

export function parseStudentsCsv(input: string): StudentCsvParseResult {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: [{ rowNumber: 1, message: "CSV file is empty." }] };

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const required = ["fullname", "email", "gender", "gradelevel"];
  const headerErrors = required.filter(field => !headers.includes(field));
  if (headerErrors.length > 0) {
    return { rows: [], errors: [{ rowNumber: 1, message: `Missing required column(s): ${headerErrors.join(", ")}.` }] };
  }

  const indexOf = (field: string) => headers.indexOf(field);
  const rows: StudentCsvRow[] = [];
  const errors: StudentCsvError[] = [];

  lines.slice(1).forEach((line, lineIndex) => {
    const rowNumber = lineIndex + 2;
    const cells = parseCsvLine(line);
    const get = (field: string) => cells[indexOf(field)]?.trim() ?? "";
    const fullName = get("fullname");
    const email = get("email");
    const genderValue = get("gender").toUpperCase();
    const gradeValue = Number(get("gradelevel"));
    const rowErrors: StudentCsvError[] = [];

    if (!fullName) rowErrors.push({ rowNumber, field: "fullName", message: "Full name is required." });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) rowErrors.push({ rowNumber, field: "email", message: "A valid email is required for automatic credential delivery." });
    if (genderValue !== "MALE" && genderValue !== "FEMALE") rowErrors.push({ rowNumber, field: "gender", message: "Gender must be MALE or FEMALE." });
    if (!Number.isInteger(gradeValue) || gradeValue < 1 || gradeValue > 4) rowErrors.push({ rowNumber, field: "gradeLevel", message: "Grade level must be an integer from 1 to 4." });

    const guardianEmail = get("guardianemail");
    if (guardianEmail && !/^\S+@\S+\.\S+$/.test(guardianEmail)) rowErrors.push({ rowNumber, field: "guardianEmail", message: "Guardian email is not valid." });

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    rows.push({
      rowNumber,
      fullName,
      email,
      gender: genderValue as "MALE" | "FEMALE",
      gradeLevel: gradeValue,
      guardianName: get("guardianname") || undefined,
      guardianPhone: get("guardianphone") || undefined,
      guardianEmail: guardianEmail || undefined,
    });
  });

  return { rows, errors };
}

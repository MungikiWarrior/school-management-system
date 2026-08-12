import { describe, expect, it } from "vitest";
import { parseStudentsCsv } from "./csv";

describe("parseStudentsCsv", () => {
  it("returns row-level errors without discarding valid rows", () => {
    const result = parseStudentsCsv([
      "fullName,email,gender,gradeLevel,guardianEmail",
      "Amina Banda,amina@example.com,FEMALE,2,guardian@example.com",
      "Broken Row,,OTHER,9,not-an-email",
    ].join("\n"));

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ fullName: "Amina Banda", email: "amina@example.com", gradeLevel: 2 });
    expect(result.errors.map(error => error.field)).toEqual(["email", "gender", "gradeLevel", "guardianEmail"]);
    expect(result.errors.every(error => error.rowNumber === 3)).toBe(true);
  });

  it("rejects files without the credential-delivery email column", () => {
    const result = parseStudentsCsv("fullName,gender,gradeLevel\nAmina Banda,FEMALE,2");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.message).toContain("email");
  });

  it("supports quoted commas in names and guardian fields", () => {
    const result = parseStudentsCsv('fullName,email,gender,gradeLevel,guardianName\n"Banda, Amina",amina@example.com,FEMALE,2,"Mr Banda, Senior"');
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]).toMatchObject({ fullName: "Banda, Amina", guardianName: "Mr Banda, Senior" });
  });
});

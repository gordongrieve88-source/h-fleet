import { describe, expect, it } from "vitest";
import { _parseCsv as parseCsv } from "./people/csv";

describe("HR CSV parsing", () => {
  it("normalises header names to snake_case keys", () => {
    const rows = parseCsv("Employee No,Full Name,Depot\n101,Alpha Driver,Greenacre");
    expect(rows[0]).toEqual({ employee_no: "101", full_name: "Alpha Driver", depot: "Greenacre" });
  });

  it("handles quoted fields containing commas and quotes", () => {
    const rows = parseCsv('name,depot\n"Driver, Alpha","He said ""hi"""');
    expect(rows[0]).toEqual({ name: "Driver, Alpha", depot: 'He said "hi"' });
  });

  it("survives CRLF line endings and a trailing newline", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("skips blank lines rather than emitting empty records", () => {
    const rows = parseCsv("a,b\n1,2\n\n3,4\n");
    expect(rows).toEqual([{ a: "1", b: "2" }, { a: "3", b: "4" }]);
  });

  it("keeps embedded newlines inside quotes", () => {
    const rows = parseCsv('a,b\n"line1\nline2",x');
    expect(rows[0].a).toBe("line1\nline2");
  });

  it("returns nothing for an empty file", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("pads short rows instead of throwing", () => {
    const rows = parseCsv("a,b,c\n1,2");
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });
});

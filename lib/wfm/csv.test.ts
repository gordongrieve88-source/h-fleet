import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header and CRLF-separated rows", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe("a,b\r\n1,2");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(toCsv(["x"], [["Smith, John"]])).toBe('x\r\n"Smith, John"');
    expect(toCsv(["x"], [['He said "hi"']])).toBe('x\r\n"He said ""hi"""');
    expect(toCsv(["x"], [["line1\nline2"]])).toBe('x\r\n"line1\nline2"');
  });

  it("blanks null and undefined rather than printing them", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("a,b\r\n,");
  });

  it("defuses values Excel would run as a formula", () => {
    expect(toCsv(["x"], [["=1+1"]])).toBe("x\r\n'=1+1");
    expect(toCsv(["x"], [["+A1"]])).toBe("x\r\n'+A1");
    expect(toCsv(["x"], [["-5"]])).toBe("x\r\n'-5");
    expect(toCsv(["x"], [["@SUM(A1)"]])).toBe("x\r\n'@SUM(A1)");
  });

  it("leaves ordinary roster values alone", () => {
    expect(toCsv(["truck", "time"], [["PCC2044", "05:30"]])).toBe("truck,time\r\nPCC2044,05:30");
  });
});

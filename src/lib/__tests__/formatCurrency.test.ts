import { describe, it, expect } from "vitest";
import { formatMoney, formatCompact, formatCompactWan, getCurrencySymbol, formatWithBase } from "../formatCurrency";

describe("formatMoney", () => {
  it("formats large MYR amounts without decimals", () => {
    const result = formatMoney(12500, "MYR");
    expect(result).toContain("RM");
    expect(result).not.toContain(".");
  });

  it("formats small MYR amounts with 2 decimals", () => {
    const result = formatMoney(99.5, "MYR");
    expect(result).toContain("RM");
    expect(result).toContain("99.50");
  });

  it("handles zero", () => {
    expect(formatMoney(0, "MYR")).toContain("0");
  });

  it("handles NaN gracefully", () => {
    expect(formatMoney(NaN, "MYR")).toContain("0");
  });

  it("handles negative amounts", () => {
    const result = formatMoney(-5000, "CNY");
    expect(result).toContain("-");
    expect(result).toContain("¥");
  });

  it("respects showSymbol=false", () => {
    const result = formatMoney(1000, "MYR", { showSymbol: false });
    expect(result).not.toContain("RM");
  });

  it("respects forceNoDecimals", () => {
    const result = formatMoney(50.99, "USD", { forceNoDecimals: true });
    expect(result).not.toContain(".");
  });
});

describe("formatCompact", () => {
  it("rounds to integer", () => {
    const result = formatCompact(1234.56, "MYR");
    expect(result).toContain("1,235");
  });

  it("handles NaN", () => {
    expect(formatCompact(NaN)).toContain("0");
  });
});

describe("formatCompactWan", () => {
  it("formats >= 10000 as 万", () => {
    const result = formatCompactWan(50000, "CNY");
    expect(result).toContain("5.0万");
  });

  it("formats >= 1000000 without decimal in 万", () => {
    const result = formatCompactWan(1500000, "MYR");
    expect(result).toContain("150万");
  });

  it("formats zero", () => {
    expect(formatCompactWan(0, "MYR")).toBe("RM0");
  });
});

describe("getCurrencySymbol", () => {
  it("returns correct symbols", () => {
    expect(getCurrencySymbol("MYR")).toBe("RM");
    expect(getCurrencySymbol("CNY")).toBe("¥");
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("");
  });
});

describe("formatWithBase", () => {
  it("returns single display when currencies match", () => {
    const result = formatWithBase(100, "MYR", "MYR", 1);
    expect(result).toContain("RM");
    expect(result).toContain("100.00");
    expect(result).not.toContain("≈");
  });

  it("returns dual display when currencies differ", () => {
    const result = formatWithBase(100, "MYR", "CNY", 1.52);
    expect(result).toContain("RM");
    expect(result).toContain("≈");
    expect(result).toContain("¥");
    expect(result).toContain("152.00");
  });

  it("handles zero amount", () => {
    const result = formatWithBase(0, "USD", "CNY", 7.1);
    expect(result).toContain("$0.00");
  });

  it("handles NaN gracefully", () => {
    const result = formatWithBase(NaN, "MYR", "CNY", 1.52);
    expect(result).toContain("0.00");
  });
});

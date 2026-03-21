import { describe, it, expect } from "vitest";
import { numberToChinese } from "../numberToChinese";

describe("numberToChinese", () => {
  it("converts zero", () => {
    expect(numberToChinese(0, "CNY")).toContain("零元整");
  });

  it("converts simple integer", () => {
    const result = numberToChinese(100, "CNY");
    expect(result).toContain("壹佰");
    expect(result).toContain("整");
  });

  it("converts amount with decimals", () => {
    const result = numberToChinese(1234.56, "CNY");
    expect(result).toContain("壹仟贰佰叁拾肆");
    expect(result).toContain("伍角");
    expect(result).toContain("陆分");
  });

  it("handles MYR currency", () => {
    const result = numberToChinese(500, "MYR");
    expect(result).toContain("马币");
    expect(result).toContain("令吉");
  });

  it("handles USD currency", () => {
    const result = numberToChinese(1000, "USD");
    expect(result).toContain("美元");
  });

  it("returns empty for negative", () => {
    expect(numberToChinese(-1)).toBe("");
  });

  it("returns empty for NaN", () => {
    expect(numberToChinese(NaN)).toBe("");
  });

  it("handles very large numbers", () => {
    const result = numberToChinese(1e16, "CNY");
    expect(result).toContain("金额过大");
  });

  it("handles 10000", () => {
    const result = numberToChinese(10000, "CNY");
    expect(result).toContain("壹万");
  });
});

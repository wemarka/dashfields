// financials.test.ts
// Unit tests for currency formatting helpers and financials settings validation
import { describe, expect, it } from "vitest";
import { formatMoney, getCurrencySymbol } from "../../client/src/core/hooks/useCurrency";

describe("getCurrencySymbol", () => {
  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns JD for JOD", () => {
    expect(getCurrencySymbol("JOD")).toBe("JD");
  });

  it("returns E£ for EGP", () => {
    expect(getCurrencySymbol("EGP")).toBe("E£");
  });

  it("returns currency code for unknown currency", () => {
    expect(getCurrencySymbol("XYZ")).toBe("XYZ");
  });

  it("is case-insensitive", () => {
    expect(getCurrencySymbol("usd")).toBe("$");
    expect(getCurrencySymbol("eur")).toBe("€");
  });
});

describe("formatMoney", () => {
  it("formats USD with $ prefix", () => {
    const result = formatMoney(1234.56, "USD");
    expect(result).toBe("$1,234.56");
  });

  it("formats EUR with € prefix", () => {
    const result = formatMoney(1234.56, "EUR");
    expect(result).toBe("€1,234.56");
  });

  it("formats SAR with postfix symbol", () => {
    const result = formatMoney(1234.56, "SAR");
    expect(result).toContain("1,234.56");
    expect(result).toContain("﷼");
    // SAR is postfix: "1,234.56 ﷼"
    expect(result.startsWith("1")).toBe(true);
  });

  it("formats JOD with postfix symbol", () => {
    const result = formatMoney(500, "JOD");
    expect(result).toContain("500.00");
    expect(result).toContain("JD");
    expect(result.startsWith("500")).toBe(true);
  });

  it("respects custom decimal places", () => {
    const result = formatMoney(1.5, "USD", 3);
    expect(result).toBe("$1.500");
  });

  it("formats 0 decimals correctly", () => {
    const result = formatMoney(1234, "USD", 0);
    expect(result).toBe("$1,234");
  });

  it("handles zero amount", () => {
    const result = formatMoney(0, "USD");
    expect(result).toBe("$0.00");
  });

  it("handles large amounts", () => {
    const result = formatMoney(1_000_000, "USD");
    expect(result).toBe("$1,000,000.00");
  });

  it("handles GBP", () => {
    const result = formatMoney(99.99, "GBP");
    expect(result).toBe("£99.99");
  });

  it("handles AED (postfix)", () => {
    const result = formatMoney(250, "AED");
    expect(result).toContain("250.00");
    expect(result).toContain("د.إ");
  });
});

describe("ROAS validation", () => {
  const validateRoas = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  };

  it("accepts valid ROAS values", () => {
    expect(validateRoas("3.0")).toBe(true);
    expect(validateRoas("1.5")).toBe(true);
    expect(validateRoas("10")).toBe(true);
    expect(validateRoas("0.5")).toBe(true);
  });

  it("rejects invalid ROAS values", () => {
    expect(validateRoas("0")).toBe(false);
    expect(validateRoas("-1")).toBe(false);
    expect(validateRoas("abc")).toBe(false);
    expect(validateRoas("")).toBe(false);
  });
});

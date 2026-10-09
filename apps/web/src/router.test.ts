import { describe, expect, it } from "vitest";
import { sanitizeNext } from "./router.js";

/**
 * The `?next=` post-login redirect is an open-redirect vector: an attacker
 * could craft /login?next=https://evil.com to steal the session after the
 * user signs in. sanitizeNext must accept ONLY same-origin absolute paths.
 */
describe("sanitizeNext — open-redirect guard", () => {
  it("accepts plain same-origin dashboard paths", () => {
    expect(sanitizeNext("/dashboard")).toBe("/dashboard");
    expect(sanitizeNext("/dashboard/keywords")).toBe("/dashboard/keywords");
  });

  it("accepts paths with query strings", () => {
    expect(sanitizeNext("/dashboard/keywords?q=necklace")).toBe("/dashboard/keywords?q=necklace");
    expect(sanitizeNext("/privacy")).toBe("/privacy");
  });

  it("rejects empty / null / non-path values", () => {
    expect(sanitizeNext(null)).toBeNull();
    expect(sanitizeNext("")).toBeNull();
    expect(sanitizeNext("dashboard")).toBeNull(); // relative
    expect(sanitizeNext("https://evil.com")).toBeNull();
    expect(sanitizeNext("http://evil.com")).toBeNull();
    expect(sanitizeNext("javascript:alert(1)")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNext("//evil.com")).toBeNull();
    expect(sanitizeNext("//evil.com/dashboard")).toBeNull();
  });

  it("rejects backslash authority tricks", () => {
    expect(sanitizeNext("/\\evil.com")).toBeNull();
    expect(sanitizeNext("/\\\\evil.com")).toBeNull();
  });

  it("rejects whitespace and control characters", () => {
    expect(sanitizeNext("/dashboard\n")).toBeNull();
    expect(sanitizeNext("/dashboard\r\n")).toBeNull();
    expect(sanitizeNext("/dash board")).toBeNull();
    expect(sanitizeNext("/dashboard%0A")).toBeNull(); // encoded newline
    expect(sanitizeNext("/dashboard%09")).toBeNull(); // encoded tab
  });

  it("rejects double-encoded payloads smuggled through decoding", () => {
    // URLSearchParams.get() decodes once; sanitizeNext decodes once more.
    expect(sanitizeNext("%252f%252fevil.com")).toBeNull(); // "//evil.com"
    expect(sanitizeNext("%2f%2fevil.com")).toBeNull(); // "//evil.com"
    expect(sanitizeNext("%5c%5cevil.com")).toBeNull(); // backslashes
  });

  it("rejects malformed percent-encoding", () => {
    expect(sanitizeNext("/dashboard%")).toBeNull();
    expect(sanitizeNext("/dashboard%zz")).toBeNull();
    expect(sanitizeNext("%")).toBeNull();
  });
});

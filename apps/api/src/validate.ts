/**
 * Shared input validation helpers — every 400 here is thrown as an Error
 * with statusCode, which the central error handler in index.ts turns into
 * a clean JSON response (no stack traces to the client).
 */
import type { FeeInput } from "@digital-mazdoor/core";

export function badRequest(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function notFound(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 404 });
}

export function badGateway(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 502 });
}

/**
 * Optional numeric query param. Empty/missing → null (caller applies its
 * default). Anything else that isn't a finite number → 400, never a silent
 * 0-row filter.
 */
export function parseOptionalNumber(raw: string | undefined, name: string): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw badRequest(`?${name}= must be a number, got "${raw.slice(0, 40)}".`);
  }
  return n;
}

/** Required finite number (POST bodies). */
export function requireNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw badRequest(`"${name}" must be a number.`);
  }
  return value;
}

/** Cap free-text input length (AI endpoints: 2000 chars max per field). */
export function capLength(value: string, max: number, name: string): string {
  if (value.length > max) {
    throw badRequest(`"${name}" is too long (max ${max} characters).`);
  }
  return value;
}

const FEE_COUNTRIES = ["US", "UK", "CA", "DE", "OTHER"] as const;

/** Validate POST /api/tools/fee-calculator — 400 on bad input, never a 500. */
export function validateFeeInput(body: unknown): FeeInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const itemPrice = requireNumber(b["itemPrice"], "itemPrice");
  const shippingCharged = requireNumber(b["shippingCharged"], "shippingCharged");
  const quantity = requireNumber(b["quantity"], "quantity");
  const annualSalesUsd = requireNumber(b["annualSalesUsd"], "annualSalesUsd");
  if (itemPrice < 0 || shippingCharged < 0) {
    throw badRequest('"itemPrice" and "shippingCharged" must be >= 0.');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw badRequest('"quantity" must be an integer >= 1.');
  }
  if (annualSalesUsd < 0) throw badRequest('"annualSalesUsd" must be >= 0.');
  const country = b["country"];
  if (typeof country !== "string" || !(FEE_COUNTRIES as readonly string[]).includes(country)) {
    throw badRequest(`"country" must be one of: ${FEE_COUNTRIES.join(", ")}.`);
  }
  if (typeof b["offsiteAds"] !== "boolean") {
    throw badRequest('"offsiteAds" must be a boolean.');
  }
  return {
    itemPrice,
    shippingCharged,
    quantity,
    country: country as FeeInput["country"],
    offsiteAds: b["offsiteAds"] as boolean,
    annualSalesUsd,
  };
}

/** Shape of the JSON the model must return for POST /api/ai/listing. */
export interface AiListingShape {
  title: string;
  tags: string[];
  description: string;
  suggestedPrice: number;
}

/**
 * Validate the parsed model output before it reaches the UI.
 * Returns the cleaned shape or throws 502 (upstream's fault, not the client's).
 */
export function validateAiListingShape(value: unknown): AiListingShape {
  const v = value as Partial<Record<string, unknown>> | null;
  const fail = (): never => {
    throw badGateway("The AI returned an unexpected shape — try again.");
  };
  if (typeof v !== "object" || v === null) fail();
  const title = (v as Record<string, unknown>)["title"];
  const tags = (v as Record<string, unknown>)["tags"];
  const description = (v as Record<string, unknown>)["description"];
  const suggestedPrice = (v as Record<string, unknown>)["suggestedPrice"];
  if (typeof title !== "string" || !title.trim()) fail();
  if (!Array.isArray(tags) || tags.length === 0 || !tags.every((t) => typeof t === "string")) fail();
  if (typeof description !== "string" || !description.trim()) fail();
  if (typeof suggestedPrice !== "number" || !Number.isFinite(suggestedPrice)) fail();
  return {
    title: title as string,
    tags: tags as string[],
    description: description as string,
    suggestedPrice: suggestedPrice as number,
  };
}

/** Validated shape of a POST /api/contact body. */
export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw badRequest(`"${name}" is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw badRequest(`"${name}" is too long (max ${max} characters).`);
  }
  return trimmed;
}

/**
 * Validate POST /api/contact — 400 on bad input, never a 500.
 * The honeypot field ("website") is NOT validated here: it is checked
 * separately in contact.ts so spam can be silently discarded.
 */
export function validateContactInput(body: unknown): ContactInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = requireText(b["name"], "name", 100);
  const emailRaw = requireText(b["email"], "email", 254);
  if (!EMAIL_RE.test(emailRaw)) {
    throw badRequest('"email" must be a valid email address.');
  }
  const subject = requireText(b["subject"], "subject", 200);
  const message = requireText(b["message"], "message", 5000);
  return { name, email: emailRaw, subject, message };
}

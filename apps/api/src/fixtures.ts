/**
 * Labeled fixture data used while the Etsy key is not live.
 * Every consumer must surface `mode: "fixture"` — fixtures are NEVER real data.
 */
import type { Listing } from "@digital-mazdoor/core";

export interface FixtureShop {
  shopId: number;
  shopName: string;
}

export const FIXTURE_SHOPS: FixtureShop[] = [
  { shopId: 9001, shopName: "Fixture Studio" },
  { shopId: 9002, shopName: "Paper Trail Co" },
  { shopId: 9003, shopName: "Career Canvas" },
  { shopId: 9004, shopName: "Doc Design Lab" },
  { shopId: 9005, shopName: "Hire Me Templates" },
];

export function fixtureShopName(shopId: number): string {
  return FIXTURE_SHOPS.find((s) => s.shopId === shopId)?.shopName ?? `Shop ${shopId}`;
}

/** Resume-niche sample listings. `views` intentionally absent → exercises the est. path. */
export const FIXTURE_LISTINGS: Listing[] = [
  {
    listingId: 1000001,
    title: "Modern Resume Template Editable in Canva",
    price: { amount: 7, currencyCode: "USD" },
    numFavorers: 812,
    tags: ["resume template", "modern resume", "editable resume", "canva resume"],
    taxonomyId: 1,
    shopId: 9001,
    originalCreationTimestamp: 1789000000,
    quantity: 999,
    url: "https://www.etsy.com/listing/1000001",
  },
  {
    listingId: 1000002,
    title: "Professional CV Template for Word + Pages",
    price: { amount: 5.5, currencyCode: "USD" },
    numFavorers: 640,
    tags: ["cv template", "professional resume", "resume template word"],
    taxonomyId: 1,
    shopId: 9002,
    originalCreationTimestamp: 1780000000,
    quantity: 999,
    url: "https://www.etsy.com/listing/1000002",
  },
  {
    listingId: 1000003,
    title: "Minimalist Resume Template with Cover Letter",
    price: { amount: 9, currencyCode: "USD" },
    numFavorers: 455,
    tags: ["minimalist resume", "resume template", "cover letter"],
    taxonomyId: 1,
    shopId: 9003,
    originalCreationTimestamp: 1790000000,
    quantity: 999,
    url: "https://www.etsy.com/listing/1000003",
  },
  {
    listingId: 1000004,
    title: "ATS Friendly Resume Template Bundle",
    price: { amount: 12, currencyCode: "USD" },
    numFavorers: 388,
    tags: ["ats resume template", "ats friendly resume", "resume template"],
    taxonomyId: 1,
    shopId: 9001,
    originalCreationTimestamp: 1772000000,
    quantity: 999,
    url: "https://www.etsy.com/listing/1000004",
  },
  {
    listingId: 1000005,
    title: "Creative Resume Design for Designers",
    price: { amount: 6.5, currencyCode: "USD" },
    numFavorers: 210,
    tags: ["modern resume", "creative resume", "editable resume"],
    taxonomyId: 1,
    shopId: 9004,
    originalCreationTimestamp: 1785000000,
    quantity: 999,
    url: "https://www.etsy.com/listing/1000005",
  },
  {
    listingId: 1000006,
    title: "Simple Job Application Resume Template",
    price: { amount: 4, currencyCode: "USD" },
    numFavorers: 96,
    tags: ["simple resume", "job application", "resume template"],
    taxonomyId: 1,
    shopId: 9005,
    originalCreationTimestamp: 1791000000,
    quantity: 999,
    url: "https://www.etsy.com/listing/1000006",
  },
];

export interface FixtureBuzzTag {
  tag: string;
  frequency: number;
  avgEngagement: number;
  listings: number;
  avgFavs: number;
  listingsPerMonth: number[];
  medianAgeDays: number;
}

/** Tag sample for the Trend Buzz heat index (PRD §5.15). */
export const FIXTURE_BUZZ_TAGS: FixtureBuzzTag[] = [
  { tag: "resume template", frequency: 52, avgEngagement: 410, listings: 52, avgFavs: 410, listingsPerMonth: [2, 3, 4, 5, 6, 8, 9, 12], medianAgeDays: 210 },
  { tag: "modern resume", frequency: 36, avgEngagement: 380, listings: 36, avgFavs: 380, listingsPerMonth: [1, 2, 3, 4, 5, 6, 7, 8], medianAgeDays: 180 },
  { tag: "professional resume", frequency: 30, avgEngagement: 290, listings: 30, avgFavs: 290, listingsPerMonth: [2, 2, 3, 3, 4, 5, 5, 6], medianAgeDays: 260 },
  { tag: "cv template", frequency: 28, avgEngagement: 310, listings: 28, avgFavs: 310, listingsPerMonth: [1, 2, 2, 3, 4, 4, 6, 6], medianAgeDays: 300 },
  { tag: "editable resume", frequency: 25, avgEngagement: 260, listings: 25, avgFavs: 260, listingsPerMonth: [1, 1, 2, 3, 3, 4, 5, 6], medianAgeDays: 150 },
  { tag: "cover letter", frequency: 18, avgEngagement: 220, listings: 18, avgFavs: 220, listingsPerMonth: [0, 1, 1, 2, 2, 3, 4, 5], medianAgeDays: 120 },
  { tag: "minimalist resume", frequency: 15, avgEngagement: 240, listings: 15, avgFavs: 240, listingsPerMonth: [0, 0, 1, 2, 2, 3, 3, 4], medianAgeDays: 90 },
  { tag: "ats resume template", frequency: 12, avgEngagement: 200, listings: 12, avgFavs: 200, listingsPerMonth: [0, 0, 1, 1, 2, 2, 3, 3], medianAgeDays: 60 },
];

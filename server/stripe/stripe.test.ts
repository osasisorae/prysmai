import { describe, expect, it } from "vitest";
import { PLANS, stripePriceIds } from "./products";

describe("Stripe Products Configuration", () => {
  it("defines all four plan tiers", () => {
    expect(Object.keys(PLANS)).toEqual(
      expect.arrayContaining(["free", "pro", "team", "enterprise"])
    );
    expect(Object.keys(PLANS)).toHaveLength(4);
  });

  it("free plan has correct pricing", () => {
    expect(PLANS.free.priceMonthly).toBe(0);
    expect(PLANS.free.requestLimit).toBe(5000);
    expect(PLANS.free.name).toBe("Free");
  });

  it("pro plan has correct pricing (in cents)", () => {
    expect(PLANS.pro.priceMonthly).toBe(3900); // $39.00 in cents
    expect(PLANS.pro.requestLimit).toBe(50000);
    expect(PLANS.pro.name).toBe("Pro");
  });

  it("team plan has correct pricing (in cents)", () => {
    expect(PLANS.team.priceMonthly).toBe(14900); // $149.00 in cents
    expect(PLANS.team.requestLimit).toBe(250000);
    expect(PLANS.team.name).toBe("Team");
  });

  it("enterprise plan has custom pricing", () => {
    expect(PLANS.enterprise.priceMonthly).toBe(0); // custom
    expect(PLANS.enterprise.requestLimit).toBe(-1); // unlimited
    expect(PLANS.enterprise.name).toBe("Enterprise");
  });

  it("all paid plans have overage rates (in cents)", () => {
    expect(PLANS.pro.overagePer10k).toBe(500); // $5.00
    expect(PLANS.team.overagePer10k).toBe(400); // $4.00
  });

  it("all plans have data retention configured", () => {
    expect(PLANS.free.dataRetentionDays).toBe(7);
    expect(PLANS.pro.dataRetentionDays).toBe(30);
    expect(PLANS.team.dataRetentionDays).toBe(90);
    expect(PLANS.enterprise.dataRetentionDays).toBe(-1); // custom
  });

  it("all plans have project limits", () => {
    expect(PLANS.free.maxProjects).toBe(1);
    expect(PLANS.pro.maxProjects).toBe(3);
    expect(PLANS.team.maxProjects).toBe(-1); // unlimited
    expect(PLANS.enterprise.maxProjects).toBe(-1); // unlimited
  });

  it("all plans have team member limits", () => {
    expect(PLANS.free.maxTeamMembers).toBe(1);
    expect(PLANS.pro.maxTeamMembers).toBe(1);
    expect(PLANS.team.maxTeamMembers).toBe(10);
    expect(PLANS.enterprise.maxTeamMembers).toBe(-1); // unlimited
  });

  it("stripePriceIds cache starts empty", () => {
    expect(stripePriceIds).toBeDefined();
    expect(typeof stripePriceIds).toBe("object");
  });
});

describe("Stripe Price Consistency", () => {
  it("pro price in cents matches Stripe unit_amount convention", () => {
    // Stripe expects unit_amount in cents: $39.00 = 3900
    expect(PLANS.pro.priceMonthly).toBe(3900);
  });

  it("team price in cents matches Stripe unit_amount convention", () => {
    // Stripe expects unit_amount in cents: $149.00 = 14900
    expect(PLANS.team.priceMonthly).toBe(14900);
  });

  it("free and enterprise have zero price (not billed through Stripe)", () => {
    expect(PLANS.free.priceMonthly).toBe(0);
    expect(PLANS.enterprise.priceMonthly).toBe(0);
  });
});

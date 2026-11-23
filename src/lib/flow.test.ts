import { describe, expect, it } from "vitest";
import { reducer, initial } from "./store";
import { slaOf } from "./insights";

describe("challenge → outbox → board flow", () => {
  it("draft shows as awaiting approval, sent moves to challenged", () => {
    let s = initial();
    const c0 = s.cases.find((c) => c.stage === "to_assess")!;
    s = reducer(s, { type: "challenge", id: c0.id, rules: ["R2"] });
    let c = s.cases.find((x) => x.id === c0.id)!;
    expect(c.stage).toBe("challenged");
    expect(slaOf(c).state).toBe("awaiting_send");
    const draft = s.emails.find((e) => e.caseId === c0.id && e.status === "draft")!;
    expect(draft).toBeTruthy();
    s = reducer(s, { type: "sendEmails", ids: [draft.id] });
    c = s.cases.find((x) => x.id === c0.id)!;
    expect(c.challengeSentAt).toBeTruthy();
    expect(slaOf(c).state).toBe("on_track");
  });
});

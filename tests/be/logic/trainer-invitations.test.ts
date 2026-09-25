import { describe, expect, it } from "vitest";
import { normalizePhone, validSharing } from "@/features/trainer/types";
import { solapiMessage, solapiAuthorization, type Notification } from "@/features/trainer/solapi";
import { normalizeDock } from "@/features/launcher/home-preferences";
describe("trainer invitations and home dock", () => {
  it("normalizes Korean mobile numbers and rejects malformed recipients", () => {
    expect(normalizePhone("+82 10-1234-5678")).toBe("01012345678");
    for (const phone of ["", "010abc12345678", "123", "01012345678;other"]) expect(normalizePhone(phone)).toBeNull();
  });
  it("requires explicit booleans for every sharing category", () => {
    expect(validSharing({workout:true,diet:false,body:false,prescription:false})).toBe(true);
    expect(validSharing({workout:"true"})).toBe(false);
  });
  it("does not generate pretend messages when sender or templates are missing", () => {
    const note: Notification = { id:"x",kind:"invite",channel:"LMS",phone:"01012345678",payload:{trainer:"테스트",url:"https://example.com/invite"} };
    expect(solapiMessage(note,{})).toBeNull();
    expect(solapiMessage(note,{from:"0212345678"})?.type).toBe("LMS");
    expect(solapiMessage({...note,channel:"ATA"},{pfId:"channel"})).toBeNull();
    const disconnect=solapiMessage({...note,kind:"disconnect",channel:"ATA",payload:{trainer:"테스트",member:"회원"}},{pfId:"channel",disconnectTemplate:"template"});
    expect(disconnect?.kakaoOptions?.variables).toEqual({"#{트레이너}":"테스트","#{회원}":"회원"});
    expect(disconnect?.kakaoOptions?.disableSms).toBe(true);
    expect(solapiAuthorization("key","secret","date","salt")).toMatch(/^HMAC-SHA256 apiKey=key, date=date, salt=salt, signature=[a-f0-9]{64}$/);
  });
  it("preserves four slots, clears duplicates, and recovers corrupt preferences", () => {
    expect(normalizeDock(["diet","diet",null,42])).toEqual(["diet",null,null,null]);
    expect(normalizeDock(null)).toEqual(["workout","diet","calendar","groups"]);
    expect(normalizeDock([])).toHaveLength(4);
  });
});
import {afterEach,expect,it,vi} from "vitest";
import {webcrypto} from "node:crypto";
import {createWorkoutSessionId} from "@/features/workout-timer/session-id";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
afterEach(()=>vi.unstubAllGlobals());
it("uses the browser UUID API when available",()=>{
  const expected="12345678-1234-4234-8234-123456789abc";
  const randomUUID=vi.fn(()=>expected);
  vi.stubGlobal("crypto",{randomUUID});
  expect(createWorkoutSessionId()).toBe(expected);
  expect(randomUUID).toHaveBeenCalledOnce();
});
it("generates distinct RFC 4122 version 4 IDs without secure-context randomUUID",()=>{
  vi.stubGlobal("crypto",{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)});
  const ids=Array.from({length:100},()=>createWorkoutSessionId());
  expect(new Set(ids).size).toBe(100);
  ids.forEach(id=>expect(id).toMatch(uuid));
});
it("sets version and variant bits even for all-one random bytes",()=>{
  vi.stubGlobal("crypto",{getRandomValues:(bytes:Uint8Array)=>bytes.fill(255)});
  expect(createWorkoutSessionId()).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
});

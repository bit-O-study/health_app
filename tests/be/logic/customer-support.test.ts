import { describe,it,expect } from "vitest";
import { seal,unseal } from "@/features/support/crypto";
import { isSupportOrigin, diagnostics,kakaoResult,uuid,validateTicket } from "@/features/support/model";
describe('customer support boundaries',()=>{
 it('validates categories and bounded content',()=>{expect(validateTicket('bug','오류','내용')).toBeNull();expect(validateTicket('admin','오류','내용')).toBeTruthy();expect(validateTicket('bug',' ','내용')).toBeTruthy();expect(validateTicket('bug','오류','a'.repeat(5001))).toBeTruthy();});
 it('accepts only uuids',()=>{expect(uuid('a')).toBe(false);expect(uuid('c432b98c-51b6-49eb-9172-5b55553f883c')).toBe(true);});
 it('drops secrets and raw routes from diagnostics',()=>{expect(diagnostics({platform:'Android',version:'abc123',viewport:'393x852',token:'secret',route:'/auth?token=abc',email:'a@b.com'})).toEqual({platform:'Android',version:'abc123',viewport:'393x852'});expect(diagnostics({platform:'email@example.com'})).toEqual({});});
 it('encrypts with randomized authenticated encryption',()=>{const key='ab'.repeat(32);const first=seal('secret-token',key);expect(first).not.toContain('secret-token');expect(seal('secret-token',key)).not.toBe(first);expect(unseal(first,key)).toBe('secret-token');expect(()=>unseal(first,'cd'.repeat(32))).toThrow();expect(()=>seal('x','bad')).toThrow();});
 it.each([[200,{result_code:0},'api_succeeded'],[200,{},'unknown'],[429,{},'quota_deferred'],[400,{code:-10},'quota_deferred'],[401,{},'needs_reconnect'],[403,{},'failed'],[503,{},'unknown']])('classifies provider %s safely',(status,body,expected)=>{expect(kakaoResult(status as number,body as {code?:number;result_code?:number}).status).toBe(expected);});
});

it('validates public and loopback Origin against actual Host, rejecting cross-site writes',()=>{expect(isSupportOrigin('http://127.0.0.1:3000','127.0.0.1:3000')).toBe(true);expect(isSupportOrigin('https://health.example','health.example')).toBe(true);expect(isSupportOrigin('https://evil.example','health.example')).toBe(false);expect(isSupportOrigin('http://health.example','health.example')).toBe(false);expect(isSupportOrigin(null,'health.example')).toBe(false);});
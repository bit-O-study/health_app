import { describe,it,expect } from "vitest";
import { seal,unseal } from "@/features/support/crypto";
import { isSupportOrigin, diagnostics,kakaoResult,supportConsoleUrl,uuid,validateTicket } from "@/features/support/model";
describe('customer support boundaries',()=>{
 it('validates categories and bounded content',()=>{expect(validateTicket('bug','오류','내용')).toBeNull();expect(validateTicket('admin','오류','내용')).toBeTruthy();expect(validateTicket('bug',' ','내용')).toBeTruthy();expect(validateTicket('bug','오류','a'.repeat(5001))).toBeTruthy();});
 it('accepts only uuids',()=>{expect(uuid('a')).toBe(false);expect(uuid('c432b98c-51b6-49eb-9172-5b55553f883c')).toBe(true);});
 it('drops secrets and raw routes from diagnostics',()=>{expect(diagnostics({platform:'Android',version:'abc123',viewport:'393x852',token:'secret',route:'/auth?token=abc',email:'a@b.com'})).toEqual({platform:'Android',version:'abc123',viewport:'393x852'});expect(diagnostics({platform:'email@example.com'})).toEqual({});});
 it('encrypts with randomized authenticated encryption',()=>{const key='ab'.repeat(32);const first=seal('secret-token',key);expect(first).not.toContain('secret-token');expect(seal('secret-token',key)).not.toBe(first);expect(unseal(first,key)).toBe('secret-token');expect(()=>unseal(first,'cd'.repeat(32))).toThrow();expect(()=>seal('x','bad')).toThrow();});
 it.each([[200,{result_code:0},'api_succeeded'],[200,{},'unknown'],[429,{},'quota_deferred'],[400,{code:-10},'quota_deferred'],[401,{},'needs_reconnect'],[403,{},'failed'],[503,{},'unknown']])('classifies provider %s safely',(status,body,expected)=>{expect(kakaoResult(status as number,body as {code?:number;result_code?:number}).status).toBe(expected);});
});

it('validates public and loopback Origin against actual Host, rejecting cross-site writes',()=>{expect(isSupportOrigin('http://127.0.0.1:3000','127.0.0.1:3000')).toBe(true);expect(isSupportOrigin('https://health.example','health.example')).toBe(true);expect(isSupportOrigin('https://evil.example','health.example')).toBe(false);expect(isSupportOrigin('http://health.example','health.example')).toBe(false);expect(isSupportOrigin(null,'health.example')).toBe(false);});
it('admin links go to the unified admin console, never an arbitrary path',()=>{expect(supportConsoleUrl()).toBe('https://heltch-admin.vercel.app/admin/health/support');expect(supportConsoleUrl('c432b98c-51b6-49eb-9172-5b55553f883c')).toBe('https://heltch-admin.vercel.app/admin/health/support/c432b98c-51b6-49eb-9172-5b55553f883c');expect(supportConsoleUrl('../../evil')).toBe('https://heltch-admin.vercel.app/admin/health/support');expect(supportConsoleUrl(null)).toBe('https://heltch-admin.vercel.app/admin/health/support');});
it('all admin pages including notification settings redirect before render',async()=>{
 const {supportConsoleRedirects}=await import('@/features/support/console-redirects');
 const rules=supportConsoleRedirects();
 for(const path of ['', '/billing','/trainers','/events','/crons','/test','/settings','/support/notifications']) expect(rules.find(r=>r.source===`/admin${path}`)?.destination).toBe(`https://heltch-admin.vercel.app/admin/health${path}`);
 expect(rules.find(r=>r.source==='/admin/support')).toEqual({source:'/admin/support',destination:'https://heltch-admin.vercel.app/admin/health/support',permanent:false});
 const idPattern=new RegExp(`^${rules.find(r=>r.source.includes(':id'))!.source.replace('/admin/support/:id(','/admin/support/(').replace(/\)$/,')')}$`);
 expect(idPattern.test('/admin/support/c432b98c-51b6-49eb-9172-5b55553f883c')).toBe(true);
 expect(idPattern.test('/admin/support/notifications')).toBe(false);
 expect(rules.find(r=>r.source.includes(':id'))!.destination).toBe('https://heltch-admin.vercel.app/admin/health/support/:id');
});

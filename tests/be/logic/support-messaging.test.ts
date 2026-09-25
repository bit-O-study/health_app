import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),fetch:vi.fn(),updates:[] as {table:string;data:Record<string,unknown>}[]}));
vi.mock('@/lib/supabase/admin',()=>({createSupabaseAdminClient:()=>({rpc:mock.rpc,from:mock.from})}));
vi.mock('@/features/notifications/push',()=>({sendPush:vi.fn()}));
import {dispatchSupport,kakaoConfig} from '@/features/support/messaging.server';
import {seal,unseal} from '@/features/support/crypto';
const key='ab'.repeat(32);
function claim(expired=false){return {batch:'batch',count:1,connection:{user_id:'admin',tokens:seal(JSON.stringify({access_token:'access',refresh_token:'refresh'}),key),token_expires_at:new Date(Date.now()+(expired?-1000:3600000)).toISOString(),refresh_expires_at:new Date(Date.now()+86400000).toISOString()}};}
beforeEach(()=>{
 vi.stubEnv('SUPPORT_KAKAO_CALLBACK_ORIGIN','');vi.resetAllMocks();mock.updates.length=0;vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://example.com');vi.stubEnv('KAKAO_REST_API_KEY','key');vi.stubEnv('SUPPORT_TOKEN_ENCRYPTION_KEY',key);vi.stubGlobal('fetch',mock.fetch);
 mock.rpc.mockResolvedValue({data:claim(),error:null});
 mock.from.mockImplementation((table:string)=>{
  const q:Record<string,unknown>={};for(const method of ['select','eq','in','is','limit','order'])q[method]=()=>q;
  q.update=(data:Record<string,unknown>)=>{mock.updates.push({table,data});return q;};
  q.maybeSingle=async()=>({data:{user_id:'admin'},error:null});
  q.then=(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:[{ticket_id:'ticket',kind:'new'}],error:null}).then(resolve);
  return q;
 });
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('does not call provider when conditional claim fails',async()=>{mock.rpc.mockResolvedValue({data:null});await dispatchSupport({recipientId:'admin'});expect(mock.fetch).not.toHaveBeenCalled();});
it('unknown timeout has one request and is never blindly retried',async()=>{mock.fetch.mockRejectedValue(new Error('network timeout'));await dispatchSupport({recipientId:'admin'});expect(mock.fetch).toHaveBeenCalledTimes(1);expect(mock.updates.find(r=>r.table==='support_notification_outbox')?.data.status).toBe('unknown');});
it('quota failure is deferred with no paid fallback',async()=>{mock.fetch.mockResolvedValue(new Response(JSON.stringify({code:-10}),{status:429}));await dispatchSupport({recipientId:'admin'});expect(mock.fetch).toHaveBeenCalledTimes(1);expect(mock.fetch.mock.calls[0][0]).toBe('https://kapi.kakao.com/v2/api/talk/memo/default/send');expect(mock.updates.find(r=>r.table==='support_notification_outbox')?.data).toMatchObject({status:'quota_deferred',error_code:'quota'});});
it('records only API success, not delivery/read',async()=>{mock.fetch.mockResolvedValue(new Response(JSON.stringify({result_code:0}),{status:200}));await dispatchSupport({recipientId:'admin'});expect(mock.updates.find(r=>r.table==='support_notification_outbox')?.data.status).toBe('api_succeeded');});
it('retains refresh token when Kakao omits rotation',async()=>{mock.rpc.mockResolvedValue({data:claim(true)});mock.fetch.mockResolvedValueOnce(new Response(JSON.stringify({access_token:'new-access',expires_in:21600}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({result_code:0}),{status:200}));await dispatchSupport({recipientId:'admin'});const saved=mock.updates.find(r=>r.data.tokens)?.data.tokens as string;expect(JSON.parse(unseal(saved,key))).toEqual({access_token:'new-access',refresh_token:'refresh'});expect(mock.fetch).toHaveBeenCalledTimes(2);});
it('rejected refresh requires reconnect and never sends memo',async()=>{mock.rpc.mockResolvedValue({data:claim(true)});mock.fetch.mockResolvedValue(new Response('{}',{status:400}));await dispatchSupport({recipientId:'admin'});expect(mock.fetch).toHaveBeenCalledTimes(1);expect(mock.updates.find(r=>r.table==='support_notification_outbox')?.data.status).toBe('needs_reconnect');});

it('keeps production message links while using the local OAuth callback',()=>{vi.stubEnv('SUPPORT_KAKAO_CALLBACK_ORIGIN','http://127.0.0.1:3000');expect(kakaoConfig()).toMatchObject({origin:'https://example.com',authOrigin:'http://127.0.0.1:3000',callback:'http://127.0.0.1:3000/api/support/kakao/callback'});});
it.each(['invalid','http://example.com','ftp://localhost','https://user:password@example.com'])('rejects unsafe callback origin %s',(origin)=>{vi.stubEnv('SUPPORT_KAKAO_CALLBACK_ORIGIN',origin);expect(kakaoConfig()).toBeNull();});

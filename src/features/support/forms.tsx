"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CATEGORIES, STATUSES, type Ticket } from "./model";
import { retrySupportNotification, createTicket, replyTicket, manageTicket, readTicket, supportNotificationAction } from "./actions";

const field = "mt-2 block w-full rounded-xl border border-zinc-300 bg-transparent p-3 dark:border-zinc-700";
const button = "rounded-xl bg-brand px-4 py-3 font-semibold text-white dark:text-zinc-950 disabled:opacity-50";
export function RefreshSupport() {
  const router = useRouter();
  useEffect(() => { const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); },60000); return () => clearInterval(id); },[router]);
  return <button className="text-sm underline" onClick={()=>router.refresh()}>새로고침</button>;
}
export function ReadSupport({id}:{id:string}) {
  useEffect(()=>{ void readTicket(id); },[id]); return null;
}
export function NewTicket() {
  const router=useRouter(); const requestId=useRef<string>("");
  const [pending,start]=useTransition(); const [error,setError]=useState("");
  return <form className="space-y-5" onSubmit={event=>{ event.preventDefault(); const form=new FormData(event.currentTarget); start(async()=>{
    setError(""); requestId.current ||= crypto.randomUUID();
    try {
      const diagnostic=form.get("diagnostic") ? {platform:/Android/i.test(navigator.userAgent)?"Android":/iPhone|iPad/i.test(navigator.userAgent)?"iOS":"Web",version:process.env.NEXT_PUBLIC_BUILD_ID??"dev",viewport:`${window.innerWidth}x${window.innerHeight}`} : {};
      const result=await createTicket({requestId:requestId.current,category:String(form.get("category")),title:String(form.get("title")),body:String(form.get("body")),diagnostic});
      if(result.error) setError(result.error); else router.push(`/support/${result.id}?created=1`);
    }catch{setError("접수 결과를 확인하지 못했어요. 다시 보내면 중복 접수를 방지해요.");}
  }); }}>
    <label className="block">문의 종류<select name="category" className={field}>{Object.entries(CATEGORIES).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
    <label className="block">제목<input name="title" required maxLength={100} className={field} placeholder="어떤 문제가 있었나요?"/></label>
    <label className="block">내용<textarea name="body" required maxLength={5000} rows={7} className={field} placeholder="어느 화면에서 무엇을 했는지, 어떤 결과가 나왔는지 알려 주세요."/></label>
    <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="diagnostic"/>기기 종류·앱 버전·화면 크기를 함께 보내기 (선택)</label>
    <p className="text-sm text-muted">사진은 접수 후 문의 화면에서 최대 3장 첨부할 수 있어요. 비밀번호나 인증번호는 적지 마세요.</p>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    <button disabled={pending} className={`${button} w-full`}>{pending?"접수 중…":"문의 접수"}</button>
  </form>;
}
export function ReplyForm({id,admin=false}:{id:string;admin?:boolean}) {
  const router=useRouter();const [body,setBody]=useState("");const [internal,setInternal]=useState(false);const [message,setMessage]=useState("");const [pending,start]=useTransition();const request=useRef("");
  return <form className="space-y-3" onSubmit={e=>{e.preventDefault();start(async()=>{request.current ||= crypto.randomUUID();try{const r=await replyTicket(id,request.current,body,internal);setMessage(r.error??"저장했어요.");if(!r.error){setBody("");request.current="";router.refresh();}}catch{setMessage("저장 결과를 확인하지 못했어요. 다시 시도해 주세요.");}});}}>
    <label className="block font-semibold">{admin?"답변 작성":"추가 문의"}<textarea className={field} rows={4} required maxLength={5000} value={body} onChange={e=>{setBody(e.target.value);request.current="";}}/></label>
    {admin&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={internal} onChange={e=>setInternal(e.target.checked)}/>관리자 전용 메모 (회원에게 보이지 않음)</label>}
    <p role="status" className="text-sm">{message}</p><button className={button} disabled={pending}>{pending?"저장 중…":internal?"내부 메모 저장":"답변 보내기"}</button>
  </form>;
}
export function ManageForm({ticket}:{ticket:Ticket}) {
  const router=useRouter();const [pending,start]=useTransition();const [message,setMessage]=useState("");
  return <form className="space-y-3" action={form=>start(async()=>{try{const r=await manageTicket(ticket.id,String(form.get("status")),String(form.get("priority")),form.has("assign"));setMessage(r.error??"변경했어요.");router.refresh();}catch{setMessage("변경하지 못했어요.");}})}>
    <div className="grid grid-cols-2 gap-3"><label>처리 상태<select name="status" defaultValue={ticket.status} className={field}>{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>우선순위<select className={field} name="priority" defaultValue={ticket.priority}><option value="normal">일반</option><option value="high">높음</option><option value="urgent">긴급</option></select></label></div>
    <label className="flex gap-2 text-sm"><input type="checkbox" name="assign"/>내가 담당하기</label><button disabled={pending} className={button}>처리 정보 저장</button><p role="status">{message}</p>
  </form>;
}
export function AttachmentForm({id}:{id:string}) {
  const router=useRouter();const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState("");const [message,setMessage]=useState("");const [pending,start]=useTransition();
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  return <form className="space-y-3" onSubmit={e=>{e.preventDefault();if(!file)return;start(async()=>{try{const form=new FormData();form.set("ticket",id);form.set("file",file);const response=await fetch("/api/support/attachments",{method:"POST",body:form});const result=await response.json();setMessage(result.error??"사진을 첨부했어요.");if(result.ok){setFile(null);setPreview("");router.refresh();}}catch{setMessage("사진 전송에 실패했어요. 문의 내용은 저장돼 있어요.");}});}}>
    <label className="block">스크린샷 첨부<input className={field} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const next=e.target.files?.[0]??null;setFile(next);setPreview(next?URL.createObjectURL(next):"");}}/></label>
    {file&&<div>{preview&&/* User-selected local preview. */ <Image unoptimized width={320} height={240} src={preview} alt="첨부할 사진 미리보기" className="max-h-48 rounded-xl"/>}<button type="button" className="p-3 underline" onClick={()=>{setFile(null);setPreview("");}}>선택 취소</button></div>}
    <p className="text-sm text-muted">JPG·PNG·WebP · 5MB 이하 · 문의당 최대 3장</p><button className={button} disabled={!file||pending}>사진 첨부</button><p role="status" className="text-sm">{message}</p>
  </form>;
}
export function NotificationSettings({configured,connection}:{configured:boolean;connection:{state:string;enabled:boolean;push_enabled:boolean;kakao_id:string|null}|null}) {
  const router=useRouter();const [message,setMessage]=useState("");const [pending,start]=useTransition();const [enabled,setEnabled]=useState(connection?.enabled??true);const [push,setPush]=useState(connection?.push_enabled??false);
  function run(kind:"save"|"disconnect"|"test"|"dispatch"){start(async()=>{try{const r=await supportNotificationAction(kind,enabled,push);setMessage(r.error??"처리했어요. 아래 발송 내역을 확인해 주세요.");router.refresh();}catch{setMessage("처리하지 못했어요. 잠시 후 다시 시도해 주세요.");}});}
  return <section className="app-card space-y-4 p-5">
    <h2 className="font-bold">내 카카오톡 연결</h2><p>연결 상태: {connection?.state==="connected"?"연결됨":connection?.state==="needs_reconnect"?"재연결 필요":"연결 안 됨"}{connection?.kakao_id?` · 계정 …${connection.kakao_id.slice(-4)}`:""}</p>
    <p className="text-sm text-muted">나와의 채팅으로 전송해요. 무료 한도를 넘으면 대기하며 유료 문자로 전환하지 않아요. 휴대폰 알림음·배너는 기기에서 별도로 확인해 주세요.</p>
    {configured?<a href="/api/support/kakao/start" className="inline-block rounded-xl bg-yellow-300 px-4 py-3 font-semibold text-zinc-900">카카오 계정 연결</a>:<p role="status">카카오 REST 키·서버 암호화 키·사이트 URL·서버 관리자 키 설정이 필요해요. 문의 접수는 계속 사용할 수 있어요.</p>}
    <label className="flex gap-2"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>카카오 문의 알림 받기</label>
    <label className="flex gap-2"><input type="checkbox" checked={push} onChange={e=>setPush(e.target.checked)}/>등록된 브라우저 기기로 새 문의 푸시 받기</label>
    <Link className="block text-sm underline" href="/settings/notifications">기기 푸시 등록·권한 설정</Link>
    <div className="flex flex-wrap gap-2">{([['save','설정 저장'],['test','테스트 보내기'],['dispatch','대기 알림 처리'],['disconnect','카카오 연결 해제']] as const).map(([kind,label])=><button type="button" className="rounded-xl border px-3 py-3 text-sm" key={kind} disabled={pending||((kind==="test")&&!configured)} onClick={()=>run(kind)}>{label}</button>)}</div>
    <p role="status" className="text-sm">{message}</p>
  </section>;
}

export function DeleteAttachment({id}:{id:string}) {
 const router=useRouter();const [pending,start]=useTransition();const [message,setMessage]=useState("");
 return <div><button type="button" disabled={pending} className="w-full p-3 text-sm underline" onClick={()=>start(async()=>{try{const r=await fetch('/api/support/attachments',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});const body=await r.json();if(body.ok)router.refresh();else setMessage(body.error);}catch{setMessage('사진을 삭제하지 못했어요.');}})}>사진 삭제</button><p role="status" className="text-sm">{message}</p></div>;
}

export function RetryNotification({id}:{id:string}) {
 const [confirmed,setConfirmed]=useState(false);const [pending,start]=useTransition();const [message,setMessage]=useState("");const router=useRouter();
 return <div className="mt-2 space-y-2"><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>이미 전송된 경우 중복 수신할 수 있음을 확인했어요.</label><button type="button" disabled={!confirmed||pending} className="rounded border p-2 disabled:opacity-50" onClick={()=>start(async()=>{try{const result=await retrySupportNotification(id,confirmed);setMessage(result.error??'재전송 요청을 저장했어요.');router.refresh();}catch{setMessage('재전송 요청에 실패했어요.');}})}>이 알림 재전송</button><p role="status">{message}</p></div>;
}

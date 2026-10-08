import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getMyGroups } from "./data-access";
import { getGroupMode } from "./group-mode.server";
import { GroupsClient } from "./components/groups-client";

export async function GroupSectionPage({section,query=""}:{section:"find"|"notifications"|"activity";query?:string}) {
  const user=await getCurrentUser(); if(!user) redirect("/login");
  const groups=await getMyGroups();
  const title=section==="find"?"그룹 찾기":section==="notifications"?"그룹 알림":"내 활동";
  const db=await createSupabaseServerClient();
  const ids=groups.map(group=>group.id);
  const postsQuery=db.from("community_posts").select("id,caption,created_at,author_name,group_id").eq("visibility","group").in("group_id",ids).order("created_at",{ascending:false}).limit(50);
  const posts=section==="find"||!ids.length?null:await (section==="activity"?postsQuery.eq("user_id",user.id):postsQuery);
  const joined=section==="notifications"&&ids.length?await db.from("group_members").select("id,display_name,group_id,joined_at").in("group_id",ids).order("joined_at",{ascending:false}).limit(30):null;
  const groupName=(id:string|null)=>groups.find(group=>group.id===id)?.name??"그룹";
  return <div className="app-page"><PageHeader branded title={title}/><main className="app-container space-y-5"><h2 className="text-2xl font-bold">{title}</h2>
    {section==="find"?<>
      <p className="text-sm text-muted">내 그룹을 검색하거나 받은 초대 링크·코드로 새 그룹에 참여하세요.</p>
      <form className="flex gap-2"><input type="search" name="q" aria-label="그룹 이름 검색" defaultValue={query} placeholder="내 그룹 이름 검색" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line px-3"/><button className="rounded-xl bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950">검색</button></form>
      {query && !groups.some(group=>group.name.includes(query.trim()))&&<p className="text-sm text-muted">일치하는 내 그룹이 없어요.</p>}
      <GroupsClient groups={groups.filter(group=>group.name.includes(query.trim()))} mode={await getGroupMode()}/>
    </>:<>
      <p className="text-sm text-muted">{section==="notifications"?"가입한 그룹의 최근 새 글과 참여 소식이에요.":"내가 그룹에 남긴 최근 인증 글이에요."}</p>
      {posts?.error||joined?.error?<p role="alert">그룹 소식을 불러오지 못했어요.<br />잠시 후 다시 확인해 주세요.</p>:null}
      <section className="app-card divide-y divide-line" aria-label={section==="activity"?"내 그룹 게시물":"그룹 새 글"}>{posts?.data?.map(post=><Link key={post.id} href={`/community/${post.id}`} className="block space-y-2 p-4"><p className="text-xs text-brand">{groupName(post.group_id)} · {post.author_name}</p><h3 className="font-semibold">{post.caption||"오늘의 운동 인증"}</h3><time className="text-xs text-muted">{new Date(post.created_at).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})}</time></Link>)}{!posts?.error&&!posts?.data?.length&&<p className="p-5 text-sm text-muted">표시할 그룹 글이 없어요.</p>}</section>
      {!!joined?.data?.length&&<section className="space-y-3"><h3 className="app-section-label">최근 그룹 참여</h3><div className="app-card divide-y divide-line">{joined.data.map(member=><Link key={member.id} href={`/groups?g=${member.group_id}`} className="block p-4 text-sm"><p><strong>{member.display_name||"회원"}</strong> 님이 {groupName(member.group_id)}에 참여했어요.</p><time className="text-xs text-muted">{new Date(member.joined_at).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})}</time></Link>)}</div></section>}
      <Link href="/groups/manage" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">내 그룹 관리 →</Link>
    </>}
  </main></div>;
}

// Local browser regression using real UI components and stubbed server actions.
// Uses the existing .verify-shots/trainer-validation esbuild installation.
import assert from "node:assert/strict";
import { build } from "../../.verify-shots/trainer-validation/node_modules/esbuild/lib/main.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const pluginRequire = createRequire(require.resolve("@tailwindcss/postcss"));
const postcss = pluginRequire("postcss");
const tailwind = require("@tailwindcss/postcss");
const dir = resolve(".verify-shots/launcher");
await mkdir(dir, {recursive:true});
const css = await postcss([tailwind()]).process(await readFile("src/styles/globals.css","utf8"), {from:resolve("src/styles/globals.css")});
await writeFile(resolve(dir,"styles.css"),css.css);
const source = `
import React from "react";
import { createRoot } from "react-dom/client";
import { usePathname, useSearchParams } from "next/navigation";
import { LauncherHome } from "./src/features/launcher/launcher-home";
import { BottomNav } from "./src/components/bottom-nav";
import { NotificationBell, NotificationCenterProvider } from "./src/features/notifications/notification-center";
import { DietBoard } from "./src/features/diet/components/diet-board";
import { CommunityBoard } from "./src/features/community/components/community-board";
window.__calls = [];
const dashboard = {dietExerciseNeed:{eatenKcal:1240,targetKcal:2100},macroRemaining:{protein:62,carbs:100,fat:20},hasFoodLog:true,contributions:Array.from({length:7},(_,i)=>({date:"2026-09-"+(14+i),minutes:i%2?30:0,level:i%2?2:0}))};
const weekly = {current:{workoutDays:4,exerciseCount:12,dietLoggedDays:5}};
function App() {
  const path = usePathname(), query = useSearchParams();
  const view = query.get("view");
  return <NotificationCenterProvider><div className="app-page min-h-screen bg-[#f4f6f5] dark:bg-[#0d1310]">
    <NotificationBell/><main className="app-container">
    {path==="/home" ? <LauncherHome dashboard={dashboard} weekly={weekly} showCoach={query.get("coach")==="1"} searching={view==="search"} today="2026-09-20" />
    : path==="/diet" ? <DietBoard date="2026-09-20" today="2026-09-20" logs={[]} target={{kcal:2100,protein:120,carbs:240,fat:60}} mealPhotos={{breakfast:[],lunch:[],dinner:[],snack:[]}} view={view}/>
    : path==="/community" ? <CommunityBoard key={view} initialView={view} groups={[]} initialPosts={[]} canModerate={false}/>
    : <h1 className="py-8 text-2xl">{path}</h1>}
    </main><BottomNav showCoach={query.get("coach")==="1"} groupTheme={false}/></div></NotificationCenterProvider>;
}
createRoot(document.getElementById("root")).render(<App/>);
`;
const navStub = `import { useSyncExternalStore } from "react";
const subscribe = fn => {window.addEventListener("popstate",fn); return ()=>window.removeEventListener("popstate",fn);};
export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname);}
export function useSearchParams(){return new URLSearchParams(useSyncExternalStore(subscribe,()=>location.search));}
export function navigate(href,replace=false){history[replace?"replaceState":"pushState"]({}, "", href);window.dispatchEvent(new PopStateEvent("popstate"));}
export function useRouter(){return {push:navigate,replace:href=>navigate(href,true),refresh(){}};}
`;
const actionNames = ["addFoodLogAction","deleteFoodLogAction","deleteMealAction","updateFoodLogAction","addMealPhotoAction","clearMealPhotosAction","removeMealPhotoAction","createCommunityPostAction","deleteCommunityPostAction","toggleLikeAction","deleteTeachingPostAction"];
await build({stdin:{contents:source,loader:"tsx",resolveDir:process.cwd()},bundle:true,platform:"browser",jsx:"automatic",outfile:resolve(dir,"app.js"),define:{"process.env.NODE_ENV":'"development"'},plugins:[{name:"test-stubs",setup(b){
  b.onResolve({filter:/^(next\/link|next\/navigation)$/},args=>({path:args.path,namespace:"stub"}));
  b.onResolve({filter:/diet-actions|meal-photo-actions|community-actions|teaching-actions|upload-photo|use-food-search|meal-scanner|teaching-reels|report-button|routine-share-board|share-day-button/},args=>({path:args.path,namespace:"stub"}));
  b.onLoad({filter:/.*/,namespace:"stub"},args=>{
    if(args.path==="next/navigation") return {resolveDir:process.cwd(),contents:navStub};
    if(args.path==="next/link") return {resolveDir:process.cwd(),contents:`import React from "react";import {navigate} from "next/navigation";export const useLinkStatus=()=>({pending:false});export default function Link({href,children,prefetch,scroll,onClick,...rest}){return React.createElement("a",{...rest,href,onClick:e=>{onClick?.(e);if(!e.defaultPrevented&&!e.ctrlKey&&!e.metaKey){e.preventDefault();navigate(href);}}},children);}`};
    if(args.path.includes("use-food-search")) return {resolveDir:process.cwd(),contents:"export const useFoodSearch=()=>({rows:[],loading:false});"};
    if(args.path.includes("upload-photo")) return {resolveDir:process.cwd(),contents:'export async function uploadFoodPhoto(){return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";}export const uploadCommunityPhoto=uploadFoodPhoto;'};
    const components={ "meal-scanner":"MealScanForm", "teaching-reels":"TeachingReels", "report-button":"ReportButton", "routine-share-board":"RoutineShareBoard", "share-day-button":"ShareDayButton" };
    for(const [key,name] of Object.entries(components)) if(args.path.includes(key)) return {resolveDir:process.cwd(),contents:`export function ${name}(){return null;}`};
    return {resolveDir:process.cwd(),contents:actionNames.map(name=>`export async function ${name}(...args){window.__calls.push({name:"${name}",args});return {ok:true,id:"saved"};}`).join("\n")};
  });
}}]});
const server=createServer(async (req,res)=>{
  try {
    if(req.url==="/app.js" || req.url==="/styles.css"){res.setHeader("Content-Type",req.url.endsWith(".js")?"text/javascript":"text/css");res.end(await readFile(resolve(dir,req.url.slice(1))));}
    else {res.setHeader("Content-Type","text/html; charset=utf-8");res.end('<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');}
  } catch(error){res.statusCode=500;res.end(String(error));}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch();
let checks=0;
try {
 const page=await browser.newPage({viewport:{width:393,height:852}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto(origin+"/home");
 const nav=page.getByRole("navigation",{name:"주요 메뉴"});
 await expect(page.getByRole("region",{name:"오늘의 요약"}).getByRole("link")).toHaveCount(3);checks++;
 await expect(page.getByRole("link",{name:"헬쑤쌤 앱 열기",exact:true})).toHaveCount(0);checks++;
 await page.screenshot({path:resolve(dir,"home-light.png"),fullPage:true});
 const labels = ["홈", "운동", "식단", "캘린더", "그룹", "커뮤니티"];
 for(const [name] of [["운동","workout"],["식단","diet"],["캘린더","calendar"],["그룹","groups"],["커뮤니티","community"],["펫","pet"]]){
   await page.getByRole("link",{name:name+" 앱 열기",exact:true}).click();
   await expect(nav.getByRole("link")).toHaveText(labels);checks++;
   await expect(nav.getByRole("link").first()).toHaveAttribute("href","/home");checks++;
   await nav.getByRole("link",{name:"홈",exact:true}).click();
   await expect(page.getByRole("region",{name:"앱 런처"})).toBeVisible();checks++;
 }
 await page.goto(origin+"/home?view=search");
 await page.getByRole("searchbox",{name:"앱 검색"}).fill("운동");
 await expect(page.getByRole("link",{name:/앱 열기$/})).toHaveCount(1);checks++;
 await page.getByRole("searchbox",{name:"앱 검색"}).fill("없는앱");
 await expect(page.getByRole("status")).toContainText("찾는 앱이 없어요");checks++;
 await nav.getByRole("link",{name:"홈",exact:true}).click();
 await expect(page.getByRole("link",{name:/앱 열기$/})).toHaveCount(6);checks++;
 await page.goto(origin+"/home?coach=1");await expect(page.getByRole("link",{name:"헬쑤쌤 앱 열기",exact:true})).toBeVisible();checks++;
 await page.getByRole("button",{name:"알림",exact:true}).click();
 await expect(page.getByText("새 알림이 없어요", {exact:true})).toBeVisible();checks++;
 await page.goto(origin+"/diet?view=search");
 await page.getByRole("button",{name:"아침 음식 찾기",exact:true}).click();
 await expect(page.getByText("아침 추가",{exact:true})).toBeVisible();checks++;
 await Promise.all([page.evaluate(() => new Promise(resolve => window.addEventListener("popstate", resolve, {once:true}))), page.getByRole("button",{name:"닫기",exact:true}).click()]);
 await page.goto(origin+"/diet?view=photos");
 const photos=page.getByRole("region",{name:"사진기록"});
 await expect(photos.locator('input[type="file"]')).toHaveCount(8);checks++;
 await photos.locator('input[type="file"]').first().setInputFiles({name:"meal.gif",mimeType:"image/gif",buffer:Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7","base64")});
 await expect(photos.getByRole("img",{name:"음식 사진"})).toHaveCount(1);checks++;
 assert.deepEqual(await page.evaluate(()=>window.__calls.find(call=>call.name==="addMealPhotoAction").args.filter((_,i)=>i!==1)),["breakfast","2026-09-20"]);checks++;
 await page.goto(origin+"/diet?view=nutrition");await expect(page.getByRole("heading",{name:"하루 영양 현황"})).toBeVisible();checks++;
 await page.goto(origin+"/community?view=popular");await expect(page.getByText(/좋아요 많은 순/)).toBeVisible();checks++;
 await page.goto(origin+"/community?view=mine");await expect(page.getByText("아직 내가 쓴 글이 없어요",{exact:true})).toBeVisible();checks++;
 await page.goto(origin+"/community?view=compose");await expect(page.getByRole("button",{name:"닫기",exact:true})).toBeVisible();checks++;
 for(const width of [320,393,768]){
   await page.setViewportSize({width,height:852});await page.goto(origin+"/home");
   for(const dark of [false,true]){
     await page.evaluate(value=>document.documentElement.classList.toggle("dark",value),dark);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
     const home=nav.getByRole("link",{name:"홈",exact:true});assert.ok((await home.boundingBox()).width>=44);checks++;
     await page.screenshot({path:resolve(dir,`home-${width}-${dark?"dark":"light"}.png`),fullPage:true});
   }
 }
 for(const route of ["/running","/jog","/admin/events","/login"]){await page.goto(origin+route);await expect(nav).toHaveCount(0);checks++;}
 assert.deepEqual(errors,[]);checks++;
 await writeFile(resolve(dir,"result.json"),JSON.stringify({checks,origin,backend:"stubbed; no live database",viewports:[320,393,768],errors},null,2));
 console.log(checks+" Chromium checks passed. Screenshots: "+dir);
} finally {await browser.close();await new Promise(done=>server.close(done));}

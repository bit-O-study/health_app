import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({ platform:vi.fn(), available:vi.fn(), permission:vi.fn(), aggregate:vi.fn(), workouts:vi.fn(), save:vi.fn(), connect:vi.fn(), plugin:vi.fn(), hcPermission:vi.fn(), records:vi.fn() }));
vi.mock("@capacitor/core",()=>({Capacitor:{getPlatform:mocks.platform}}));
vi.mock("@capgo/capacitor-health",()=>({Health:{isAvailable:mocks.available,requestAuthorization:mocks.permission,queryAggregated:mocks.aggregate,queryWorkouts:mocks.workouts}}));
vi.mock("@/features/health/steps-native",()=>({connectSteps:mocks.connect}));
vi.mock("@/features/health/steps-actions",()=>({saveStepsDaysAction:mocks.save}));
vi.mock("@/features/health/health-plugin",()=>({getHealthPlugin:mocks.plugin,withTimeout:(p:Promise<unknown>)=>p}));
import { syncWatchMetric } from "@/features/health/watch-sync";
beforeEach(()=>{vi.clearAllMocks();mocks.platform.mockReturnValue("ios");mocks.available.mockResolvedValue({available:true});mocks.permission.mockResolvedValue({readAuthorized:[]});mocks.save.mockResolvedValue({ok:true});mocks.aggregate.mockResolvedValue({samples:[]});mocks.workouts.mockResolvedValue({workouts:[]});mocks.plugin.mockResolvedValue({requestHealthPermissions:mocks.hcPermission,readRecords:mocks.records});});
describe("워치 기록 연동",()=>{
 it("웹에서는 건강 권한을 요청하지 않는다",async()=>{mocks.platform.mockReturnValue("web");await expect(syncWatchMetric("steps")).rejects.toThrow("앱");expect(mocks.permission).not.toHaveBeenCalled();});
 it("Apple 읽기 권한 결과가 비어도 실제 쿼리하며 빈 기록을 연결 완료로 표시하지 않는다",async()=>{const r=await syncWatchMetric("heartRate");expect(mocks.permission).toHaveBeenCalledWith({read:["heartRate"],write:[]});expect(r.message).toContain("기록이 없어요");expect(mocks.save).not.toHaveBeenCalled();});
 it("Apple 걸음을 캘린더에 upsert한다",async()=>{mocks.aggregate.mockResolvedValue({samples:[{value:4321,startDate:new Date().toISOString()}]});expect((await syncWatchMetric("steps")).message).toContain("4,321");expect(mocks.save).toHaveBeenCalledWith(expect.any(Object),"apple-health");});
 it("저장 실패를 성공으로 표시하지 않는다",async()=>{mocks.aggregate.mockResolvedValue({samples:[{value:10}]});mocks.save.mockResolvedValue({ok:false});await expect(syncWatchMetric("steps")).rejects.toThrow("저장하지 못했어요");});
 it("운동 기록은 세트/칼로리를 중복 생성하지 않고 읽는다",async()=>{mocks.workouts.mockResolvedValue({workouts:[{workoutType:"walking",startDate:"2026-10-06T01:00:00Z",endDate:"2026-10-06T01:30:00Z",sourceName:"Watch"}]});expect((await syncWatchMetric("workouts")).workouts?.[0].minutes).toBe(30);expect(mocks.permission).toHaveBeenCalledWith({read:["workouts"],write:[]});expect(mocks.save).not.toHaveBeenCalled();});
 it("Galaxy 읽기 거부 시 기록을 조회하지 않는다",async()=>{mocks.platform.mockReturnValue("android");mocks.hcPermission.mockResolvedValue({grantedPermissions:["android.permission.health.WRITE_EXERCISE"]});await expect(syncWatchMetric("workouts")).rejects.toThrow("읽기 권한");expect(mocks.records).not.toHaveBeenCalled();});
 it("Galaxy 운동 읽기 권한만 요청하고 시간순으로 보여 준다",async()=>{mocks.platform.mockReturnValue("android");mocks.hcPermission.mockResolvedValue({grantedPermissions:["android.permission.health.READ_EXERCISE"]});mocks.records.mockResolvedValue({records:[{title:"달리기",startTime:"2026-10-06T01:00:00Z",endTime:"2026-10-06T01:20:00Z"}]});expect((await syncWatchMetric("workouts")).workouts?.[0].minutes).toBe(20);expect(mocks.hcPermission).toHaveBeenCalledWith({read:["ExerciseSession"],write:[]});});
});

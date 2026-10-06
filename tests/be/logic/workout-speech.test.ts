import { afterEach, describe, expect, it, vi } from "vitest";
import { speak, stopSpeaking } from "@/features/workout-timer/speech";
afterEach(()=>vi.unstubAllGlobals());
describe("운동 음성 브리지",()=>{
 it("Android에서는 네이티브 음성만 호출한다",()=>{const native=vi.fn().mockResolvedValue(undefined);const browser=vi.fn();vi.stubGlobal("window",{Capacitor:{Plugins:{WorkoutSpeech:{speak:native,stop:vi.fn().mockResolvedValue(undefined)}}},speechSynthesis:{speak:browser}});speak("첫 세트");expect(native).toHaveBeenCalledWith({text:"첫 세트"});expect(browser).not.toHaveBeenCalled();});
 it("끔 이후 늦은 네이티브 실패가 브라우저 음성을 시작하지 않는다",async()=>{let fail:(reason:Error)=>void=()=>{};const browser=vi.fn();const stop=vi.fn().mockResolvedValue(undefined);vi.stubGlobal("window",{Capacitor:{Plugins:{WorkoutSpeech:{speak:()=>new Promise((_,reject)=>{fail=reject;}),stop}}},speechSynthesis:{speak:browser,cancel:vi.fn()}});speak("세트 시작");stopSpeaking();fail(new Error("late"));await Promise.resolve();expect(stop).toHaveBeenCalledOnce();expect(browser).not.toHaveBeenCalled();});
 it("웹은 한국어 음성을 골라 읽는다",()=>{const output=vi.fn();const korean={lang:"ko-KR"};vi.stubGlobal("SpeechSynthesisUtterance",class {text:string;constructor(text:string){this.text=text;}});vi.stubGlobal("window",{speechSynthesis:{speak:output,cancel:vi.fn(),getVoices:()=>[korean]}});speak("쉬세요");expect(output).toHaveBeenCalledWith(expect.objectContaining({text:"쉬세요",lang:"ko-KR",voice:korean}));});
});

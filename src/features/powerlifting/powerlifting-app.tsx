"use client";

import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  History,
  Home,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BodyPart = "가슴" | "하체" | "등" | "어깨";
type LiftKey = "bench" | "squat" | "deadlift" | "press";
type Week = 1 | 2 | 3 | 4;
type Tab = "home" | "routine" | "history" | "settings";
type Program = "531" | "5x5";
type OneRepMaxInputs = Record<LiftKey, string>;
type MainSet = {
  index: number;
  percent: number;
  reps: string;
  weight: number;
  highlight: boolean;
};

type AppSettings = {
  oneRepMax: Record<LiftKey, number | null>;
  trainingMax: Record<LiftKey, number>;
  week: Week;
  todayPart: BodyPart;
  program: Program;
  setupComplete: boolean;
};

type WorkoutRecord = {
  id: string;
  date: string;
  bodyPart: BodyPart;
  liftName: string;
  week: Week;
  program?: Program;
  topSet?: string;
  amrap?: string;
};

const STORAGE_SETTINGS = "powerlifting.settings.v1";
const STORAGE_RECORDS = "powerlifting.records.v1";

const defaultSettings: AppSettings = {
  oneRepMax: {
    bench: null,
    squat: null,
    deadlift: null,
    press: null,
  },
  trainingMax: {
    bench: 80,
    squat: 120,
    deadlift: 140,
    press: 50,
  },
  week: 1,
  todayPart: "가슴",
  program: "5x5",
  setupComplete: false,
};

const routines: Record<
  BodyPart,
  {
    lift: LiftKey;
    liftName: string;
    assistance: string[];
    checkpoints: string[];
  }
> = {
  가슴: {
    lift: "bench",
    liftName: "벤치프레스",
    assistance: ["덤벨 프레스 3x10", "인클라인 프레스 3x8", "케이블 플라이 3x12", "삼두 푸시다운 3x12"],
    checkpoints: ["견갑을 모으고 내린다", "발로 바닥을 밀어 몸통을 고정한다", "바는 가슴 하단에 부드럽게 터치한다"],
  },
  하체: {
    lift: "squat",
    liftName: "스쿼트",
    assistance: ["프론트 스쿼트 3x5", "레그 프레스 3x10", "레그 컬 3x12", "카프 레이즈 3x15"],
    checkpoints: ["복압을 먼저 만들고 내려간다", "무릎은 발끝 방향으로 연다", "중족부 위에서 바를 움직인다"],
  },
  등: {
    lift: "deadlift",
    liftName: "데드리프트",
    assistance: ["루마니안 데드리프트 3x8", "바벨 로우 4x8", "랫풀다운 3x10", "백 익스텐션 3x12"],
    checkpoints: ["바를 정강이에 가깝게 둔다", "광배로 바를 몸 쪽에 붙인다", "엉덩이와 가슴이 함께 올라간다"],
  },
  어깨: {
    lift: "press",
    liftName: "오버헤드프레스",
    assistance: ["푸시 프레스 3x5", "사이드 레터럴 레이즈 4x12", "페이스풀 3x15", "딥스 3x8"],
    checkpoints: ["갈비뼈가 들리지 않게 복압을 잡는다", "바는 얼굴 가까이 수직으로 올린다", "락아웃에서 머리를 바 아래로 넣는다"],
  },
};

const weekSchemes: Record<Week, { percent: number; reps: string }[]> = {
  1: [
    { percent: 65, reps: "5" },
    { percent: 75, reps: "5" },
    { percent: 85, reps: "5+" },
  ],
  2: [
    { percent: 70, reps: "3" },
    { percent: 80, reps: "3" },
    { percent: 90, reps: "3+" },
  ],
  3: [
    { percent: 75, reps: "5" },
    { percent: 85, reps: "3" },
    { percent: 95, reps: "1+" },
  ],
  4: [
    { percent: 40, reps: "5" },
    { percent: 50, reps: "5" },
    { percent: 60, reps: "5" },
  ],
};

const fiveByFiveScheme = Array.from({ length: 5 }, () => ({
  percent: 75,
  reps: "5",
}));

const programLabels: Record<Program, string> = {
  "5x5": "5x5",
  "531": "5/3/1",
};

const bodyParts = Object.keys(routines) as BodyPart[];
const liftLabels: Record<LiftKey, string> = {
  bench: "벤치프레스",
  squat: "스쿼트",
  deadlift: "데드리프트",
  press: "오버헤드프레스",
};
const liftOrder = Object.keys(liftLabels) as LiftKey[];
const emptyBarTrainingMax = 20;

function roundToLoadableWeight(weight: number) {
  return Math.round(weight / 5) * 5;
}

function formatKg(weight: number) {
  return Number.isInteger(weight) ? `${weight}kg` : `${weight.toFixed(1)}kg`;
}

function todayLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function getRecommendedProgram(oneRepMax: OneRepMaxInputs): Program {
  return liftOrder.some((lift) => Number(oneRepMax[lift]) > 0) ? "531" : "5x5";
}

function buildTrainingMax(oneRepMax: OneRepMaxInputs) {
  return liftOrder.reduce(
    (trainingMax, lift) => ({
      ...trainingMax,
      [lift]: Number(oneRepMax[lift]) > 0
        ? roundToLoadableWeight(Number(oneRepMax[lift]) * 0.9)
        : emptyBarTrainingMax,
    }),
    {} as Record<LiftKey, number>,
  );
}

function buildOneRepMax(oneRepMax: OneRepMaxInputs) {
  return liftOrder.reduce(
    (maxes, lift) => ({
      ...maxes,
      [lift]: Number(oneRepMax[lift]) > 0 ? Number(oneRepMax[lift]) : null,
    }),
    {} as Record<LiftKey, number | null>,
  );
}

function normalizeSettings(settings: AppSettings) {
  if (!settings.setupComplete) return settings;

  const inferredOneRepMax = liftOrder.reduce(
    (maxes, lift) => {
      const savedOneRepMax = settings.oneRepMax[lift];
      const savedTrainingMax = settings.trainingMax[lift];

      return {
        ...maxes,
        [lift]: savedOneRepMax
          ?? (savedTrainingMax > emptyBarTrainingMax
            ? roundToLoadableWeight(savedTrainingMax / 0.9)
            : null),
      };
    },
    {} as Record<LiftKey, number | null>,
  );
  const hasOneRepMax = liftOrder.some((lift) => inferredOneRepMax[lift]);

  return {
    ...settings,
    oneRepMax: inferredOneRepMax,
    trainingMax: liftOrder.reduce(
      (trainingMax, lift) => ({
        ...trainingMax,
        [lift]: inferredOneRepMax[lift]
          ? roundToLoadableWeight(inferredOneRepMax[lift] * 0.9)
          : emptyBarTrainingMax,
      }),
      {} as Record<LiftKey, number>,
    ),
    program: hasOneRepMax ? "531" : settings.program,
  };
}

function formatTrainingMaxFormula(oneRepMax: number | null, trainingMax: number) {
  if (oneRepMax) {
    const rawTrainingMax = oneRepMax * 0.9;
    const formula = `TM = 1RM ${formatKg(oneRepMax)} x 90% = ${formatKg(rawTrainingMax)}`;

    return rawTrainingMax === trainingMax
      ? formula
      : `${formula} -> ${formatKg(trainingMax)}`;
  }
  if (trainingMax !== emptyBarTrainingMax) {
    return `TM ${formatKg(trainingMax)} · 1RM을 입력하면 공식 표시`;
  }
  return "TM = 빈봉 시작 기준";
}

export function PowerliftingApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedSettings = window.localStorage.getItem(STORAGE_SETTINGS);
      const savedRecords = window.localStorage.getItem(STORAGE_RECORDS);

      if (savedSettings) {
        setSettings(normalizeSettings({ ...defaultSettings, ...JSON.parse(savedSettings) }));
      }
      if (savedRecords) {
        setRecords(JSON.parse(savedRecords));
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
  }, [hydrated, settings]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records));
  }, [hydrated, records]);

  const todayRoutine = routines[settings.todayPart];
  const mainSets = useMemo(() => {
    const tm = settings.trainingMax[todayRoutine.lift];
    const scheme =
      settings.program === "531" ? weekSchemes[settings.week] : fiveByFiveScheme;

    return scheme.map((set, index) => ({
      ...set,
      index: index + 1,
      weight: roundToLoadableWeight((tm * set.percent) / 100),
      highlight: index === scheme.length - 1,
    }));
  }, [settings.program, settings.trainingMax, settings.week, todayRoutine.lift]);
  const topSet = mainSets[mainSets.length - 1];

  function completeSetup(oneRepMax: OneRepMaxInputs, program: Program) {
    setSettings({
      ...settings,
      oneRepMax: buildOneRepMax(oneRepMax),
      trainingMax: buildTrainingMax(oneRepMax),
      program,
      week: 1,
      setupComplete: true,
    });
  }

  function completeWorkout() {
    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      bodyPart: settings.todayPart,
      liftName: todayRoutine.liftName,
      week: settings.week,
      program: settings.program,
      topSet: `${formatKg(topSet.weight)} x ${topSet.reps}`,
    };
    setRecords((current) => [record, ...current].slice(0, 30));
    setActiveTab("history");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-24 pt-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-300">{todayLabel()}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">오늘의 리프팅</h1>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
            <Dumbbell aria-hidden="true" size={22} />
          </div>
        </header>

        <div className="mt-5 flex-1">
          {!settings.setupComplete ? (
            <SetupPanel onComplete={completeSetup} />
          ) : activeTab === "home" ? (
            <HomePanel
              settings={settings}
              routine={todayRoutine}
              sets={mainSets}
              topSet={topSet}
              onComplete={completeWorkout}
            />
          ) : null}
          {activeTab === "routine" ? <RoutinePanel /> : null}
          {activeTab === "history" ? <HistoryPanel records={records} /> : null}
          {activeTab === "settings" ? (
            <SettingsPanel settings={settings} onChange={setSettings} />
          ) : null}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 px-2">
          <TabButton icon={Home} label="홈" active={activeTab === "home"} onClick={() => setActiveTab("home")} />
          <TabButton icon={ClipboardList} label="루틴" active={activeTab === "routine"} onClick={() => setActiveTab("routine")} />
          <TabButton icon={History} label="기록" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          <TabButton icon={Settings} label="설정" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </div>
      </nav>
    </div>
  );
}

function SetupPanel({
  onComplete,
}: {
  onComplete: (oneRepMax: OneRepMaxInputs, program: Program) => void;
}) {
  const [oneRepMax, setOneRepMax] = useState<OneRepMaxInputs>({
    bench: "",
    squat: "",
    deadlift: "",
    press: "",
  });
  const recommendedProgram = getRecommendedProgram(oneRepMax);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const activeProgram = selectedProgram ?? recommendedProgram;

  function setLiftMax(lift: LiftKey, value: string) {
    setOneRepMax((current) => ({ ...current, [lift]: value }));
    setSelectedProgram(null);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5">
        <p className="text-sm font-semibold text-emerald-200">리프팅 모드 시작</p>
        <h2 className="mt-1 text-2xl font-black">1RM을 먼저 입력하세요</h2>
        <p className="mt-3 text-sm leading-6 text-emerald-50/80">
          모르면 비워두세요. 비워둔 종목은 빈봉부터 시작하도록 계산합니다.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        {liftOrder.map((lift) => (
          <div key={lift} className="space-y-1.5">
            <label className="grid grid-cols-[1fr_104px] items-center gap-3 text-sm font-semibold">
              {liftLabels[lift]}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="2.5"
                value={oneRepMax[lift]}
                placeholder="모름"
                onChange={(event) => setLiftMax(lift, event.target.value)}
                className="h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-right font-bold text-zinc-100 placeholder:text-zinc-600"
              />
            </label>
            <p className="text-xs font-semibold text-zinc-500">
              {formatTrainingMaxFormula(
                Number(oneRepMax[lift]) > 0 ? Number(oneRepMax[lift]) : null,
                buildTrainingMax(oneRepMax)[lift],
              )}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div>
          <p className="text-sm font-bold text-emerald-300">추천 프로그램</p>
          <p className="mt-1 text-sm text-zinc-400">
            {recommendedProgram === "531"
              ? "입력한 1RM 기준으로 5/3/1 Training Max를 잡겠습니다."
              : "아직 1RM이 없어 5x5 빈봉 시작을 추천합니다."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(programLabels) as Program[]).map((program) => (
            <button
              key={program}
              type="button"
              onClick={() => setSelectedProgram(program)}
              className={`h-11 rounded-md text-sm font-black ${
                activeProgram === program
                  ? "bg-emerald-400 text-zinc-950"
                  : "bg-zinc-950 text-zinc-300"
              }`}
            >
              {programLabels[program]}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => onComplete(oneRepMax, activeProgram)}
        className="flex h-14 w-full items-center justify-center rounded-lg bg-emerald-400 text-base font-black text-zinc-950 transition hover:bg-emerald-300"
      >
        추천 중량으로 시작
      </button>
    </div>
  );
}

function HomePanel({
  settings,
  routine,
  sets,
  topSet,
  onComplete,
}: {
  settings: AppSettings;
  routine: (typeof routines)[BodyPart];
  sets: MainSet[];
  topSet: MainSet;
  onComplete: () => void;
}) {
  const currentOneRepMax = settings.oneRepMax[routine.lift];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-200">오늘 부위</p>
            <h2 className="mt-1 text-4xl font-black">{settings.todayPart}</h2>
          </div>
          <span className="rounded-md bg-zinc-100 px-3 py-1 text-sm font-bold text-zinc-950">
            {programLabels[settings.program]}
          </span>
        </div>
        <p className="mt-4 text-lg font-bold">
          {routine.liftName}
          {settings.program === "531" ? ` · Week ${settings.week}` : ""}
        </p>
        <p className="mt-1 text-sm font-semibold text-emerald-100/80">
          TM {formatKg(settings.trainingMax[routine.lift])}
        </p>
        <p className="mt-2 text-xs leading-5 text-emerald-50/70">
          {formatTrainingMaxFormula(currentOneRepMax, settings.trainingMax[routine.lift])}
        </p>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">
            {programLabels[settings.program]} 메인 세트
          </h3>
          <span className="text-xs font-semibold text-zinc-400">5kg 단위 반올림</span>
        </div>
        <div className="space-y-2">
          {sets.map((set) => (
            <div
              key={`${set.index}-${set.percent}-${set.reps}`}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md p-3 ${
                set.highlight ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800"
              }`}
            >
              <span className="text-sm font-black">S{set.index}</span>
              <span className="text-sm font-semibold">
                {set.percent}% x {set.reps}
              </span>
              <span className="text-xl font-black">{formatKg(set.weight)}</span>
            </div>
          ))}
        </div>
        {settings.program === "531" ? (
          <p className="mt-3 text-sm font-semibold text-emerald-300">
            마지막 AMRAP: {formatKg(topSet.weight)}로 {topSet.reps}
          </p>
        ) : (
          <p className="mt-3 text-sm font-semibold text-emerald-300">
            5세트 모두 {formatKg(topSet.weight)}로 5회
          </p>
        )}
      </section>

      <InfoList title="보조운동" items={routine.assistance} />
      <InfoList title="자세 체크 포인트" items={routine.checkpoints} />

      <button
        type="button"
        onClick={onComplete}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 text-base font-black text-zinc-950 transition hover:bg-emerald-300"
      >
        <CheckCircle2 aria-hidden="true" size={21} />
        운동 완료
      </button>
    </div>
  );
}

function RoutinePanel() {
  const [selectedPart, setSelectedPart] = useState<BodyPart>("가슴");
  const routine = routines[selectedPart];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">부위별 루틴</h2>
        <p className="mt-1 text-sm text-zinc-400">헬스장에서 바로 확인할 메인 리프트와 보조운동입니다.</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {bodyParts.map((part) => (
          <button
            key={part}
            type="button"
            onClick={() => setSelectedPart(part)}
            className={`h-11 rounded-md text-sm font-bold ${
              selectedPart === part ? "bg-emerald-400 text-zinc-950" : "bg-zinc-900 text-zinc-300"
            }`}
          >
            {part}
          </button>
        ))}
      </div>
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm font-semibold text-emerald-300">메인 리프트</p>
        <h3 className="mt-1 text-3xl font-black">{routine.liftName}</h3>
      </section>
      <InfoList title="보조운동" items={routine.assistance} />
      <InfoList title="자세 체크 포인트" items={routine.checkpoints} />
    </div>
  );
}

function HistoryPanel({ records }: { records: WorkoutRecord[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">최근 운동 기록</h2>
        <p className="mt-1 text-sm text-zinc-400">운동 완료 버튼을 누른 기록이 저장됩니다.</p>
      </div>
      {records.length === 0 ? (
        <section className="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
          아직 완료한 운동이 없습니다.
        </section>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <article key={record.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">
                    {record.bodyPart} · {record.liftName}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(record.date).toLocaleString("ko-KR")}
                  </p>
                </div>
                <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-bold">
                  {programLabels[record.program ?? "531"]}
                  {(record.program ?? "531") === "531" ? ` W${record.week}` : ""}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-emerald-300">
                {record.program === "5x5" ? "작업 중량" : "AMRAP"}{" "}
                {record.topSet ?? record.amrap}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}) {
  function setOneRepMax(lift: LiftKey, value: string) {
    const oneRepMax = Number(value) > 0 ? Number(value) : null;

    onChange({
      ...settings,
      oneRepMax: {
        ...settings.oneRepMax,
        [lift]: oneRepMax,
      },
      trainingMax: {
        ...settings.trainingMax,
        [lift]: oneRepMax
          ? roundToLoadableWeight(oneRepMax * 0.9)
          : emptyBarTrainingMax,
      },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">설정</h2>
        <p className="mt-1 text-sm text-zinc-400">프로그램, Training Max, 현재 주차, 오늘 부위를 수정합니다.</p>
      </div>

      <section className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm font-bold text-emerald-300">프로그램</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(programLabels) as Program[]).map((program) => (
            <button
              key={program}
              type="button"
              onClick={() => onChange({ ...settings, program })}
              className={`h-11 rounded-md text-sm font-black ${
                settings.program === program
                  ? "bg-emerald-400 text-zinc-950"
                  : "bg-zinc-950 text-zinc-300"
              }`}
            >
              {programLabels[program]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
          <SlidersHorizontal aria-hidden="true" size={17} />
          1RM / Training Max
        </div>
        {(Object.keys(settings.trainingMax) as LiftKey[]).map((lift) => (
          <div key={lift} className="space-y-1.5">
            <label className="grid grid-cols-[1fr_96px] items-center gap-3 text-sm font-semibold">
              {liftLabels[lift]}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="2.5"
                value={settings.oneRepMax[lift] ?? ""}
                placeholder="모름"
                onChange={(event) => setOneRepMax(lift, event.target.value)}
                className="h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-right font-bold text-zinc-100 placeholder:text-zinc-600"
              />
            </label>
            <p className="text-xs font-semibold text-zinc-500">
              {formatTrainingMaxFormula(settings.oneRepMax[lift], settings.trainingMax[lift])}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        {settings.program === "531" ? (
          <label className="grid gap-2 text-sm font-semibold">
            현재 주차
            <select
              value={settings.week}
              onChange={(event) => onChange({ ...settings, week: Number(event.target.value) as Week })}
              className="h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 font-bold text-zinc-100"
            >
              <option value={1}>Week 1</option>
              <option value={2}>Week 2</option>
              <option value={3}>Week 3</option>
              <option value={4}>Week 4</option>
            </select>
          </label>
        ) : null}

        <label className="grid gap-2 text-sm font-semibold">
          오늘 부위
          <select
            value={settings.todayPart}
            onChange={(event) => onChange({ ...settings, todayPart: event.target.value as BodyPart })}
            className="h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 font-bold text-zinc-100"
          >
            {bodyParts.map((part) => (
              <option key={part} value={part}>
                {part}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="flex items-start gap-3 rounded-lg bg-emerald-400/10 p-4 text-sm text-emerald-100">
        <CalendarCheck aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
        설정과 최근 기록은 이 브라우저에 저장되어 새로고침 후에도 유지됩니다.
      </section>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="text-base font-bold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-md text-xs font-bold ${
        active ? "text-emerald-300" : "text-zinc-500"
      }`}
    >
      <Icon aria-hidden="true" size={20} />
      {label}
    </button>
  );
}

/**
 * 운동 이름·타깃 문구로 **세부 근육**을 추론한다 — 순수 모듈(테스트 가능).
 *
 * 카탈로그 1300여 개 운동 중 명시 매핑(EXERCISE_SUB_MUSCLES)은 일부뿐이라, 나머지는
 * 부위 기본값으로 폴백했다. 그런데 기본값이 "가슴 = 상부+중부+하부" 라 **세부근육으로
 * 걸러도 사실상 전부 통과**했다(가슴 134개 중 127개). "가슴 상부·하부만" 처럼 골라도
 * 필터가 무의미했던 원인.
 *
 * → 이름/타깃에서 상부·하부·내측 같은 단서를 읽어 좁히고, 단서가 없을 때만
 *   그 부위의 **대표 세부근육 하나**로 떨어뜨린다.
 */
export type InferMuscleId = "chest" | "back" | "shoulder" | "arm" | "lower" | "core";

type Rule = { re: RegExp; subs: string[] };

const RULES: Record<InferMuscleId, Rule[]> = {
  chest: [
    { re: /인클라인|incline|상부|어퍼|upper/, subs: ["chest-upper"] },
    { re: /디클라인|decline|딥스|dips|하부|로우 케이블|low cable/, subs: ["chest-lower"] },
    {
      re: /플라이|fly|펙\s*덱|pec\s*deck|크로스오버|crossover|스벤드|svend|내측|이너|inner|클로즈\s*그립|close\s*grip/,
      subs: ["chest-inner"],
    },
  ],
  back: [
    { re: /풀다운|pulldown|풀업|pull-?up|친업|chin-?up|랫|lat|풀오버|pullover/, subs: ["back-lats"] },
    { re: /슈러그|shrug|승모|trap|업라이트\s*로우|upright\s*row/, subs: ["back-traps"] },
    {
      re: /페이스\s*풀|face\s*pull|리어|rear|능형|rhomboid|리버스\s*플라이|reverse\s*fly|시티드\s*로우|seated\s*row|밴드\s*풀\s*어파트/,
      subs: ["back-rhomboids"],
    },
    {
      re: /데드리프트|deadlift|하이퍼익스텐션|hyperextension|굿모닝|good\s*morning|기립|erector|백\s*익스텐션|back\s*extension/,
      subs: ["back-erector"],
    },
    { re: /로우|row|바벨\s*로우|덤벨\s*로우/, subs: ["back-lats"] },
  ],
  shoulder: [
    {
      re: /래터럴|lateral|사이드\s*레이즈|side\s*raise|측면|업라이트/,
      subs: ["shoulder-side"],
    },
    {
      re: /리어|rear|후면|페이스\s*풀|face\s*pull|리버스\s*플라이|reverse\s*fly|벤트\s*오버/,
      subs: ["shoulder-rear"],
    },
    {
      re: /프론트|front|전면|프레스|press|ohp|오버헤드|overhead|아놀드|arnold/,
      subs: ["shoulder-front"],
    },
  ],
  arm: [
    { re: /이두|biceps|컬|curl|brachialis|상완근/, subs: ["arm-biceps-long", "arm-biceps-short"] },
    {
      re: /삼두|triceps|익스텐션|extension|푸시\s*다운|pushdown|킥백|kickback|딥스|dips/,
      subs: ["arm-triceps-long", "arm-triceps-lateral", "arm-triceps-medial"],
    },
    { re: /전완|forearm|brachioradialis|wrist|손목|리버스\s*컬|해머|hammer/, subs: ["arm-forearm"] },
  ],
  lower: [
    { re: /카프|calf|종아리|카프\s*레이즈/, subs: ["lower-calves"] },
    {
      re: /어덕|adduct|내전|이너\s*타이|inner\s*thigh|스모|sumo|코사크/,
      subs: ["lower-adductors"],
    },
    {
      re: /힙\s*쓰러스트|hip\s*thrust|글루트|glute|둔근|킥백|kickback|앱덕|abduct|브릿지|bridge/,
      subs: ["lower-glutes"],
    },
    {
      re: /레그\s*컬|leg\s*curl|햄스트링|hamstring|rdl|루마니안|romanian|스티프|stiff|굿모닝|good\s*morning/,
      subs: ["lower-hamstrings"],
    },
    {
      re: /스쿼트|squat|레그\s*익스텐션|leg\s*extension|레그\s*프레스|leg\s*press|런지|lunge|사두|quad|해크|hack|스텝\s*업/,
      subs: ["lower-quads"],
    },
  ],
  core: [
    { re: /사이드|side|오블리크|oblique|복사근|러시안\s*트위스트|twist|우드\s*찹/, subs: ["core-obliques"] },
    {
      re: /레그\s*레이즈|leg\s*raise|리버스\s*크런치|reverse\s*crunch|행잉|hanging|하복부|lower\s*abs|니\s*레이즈/,
      subs: ["core-lower-abs"],
    },
    { re: /크런치|crunch|싯업|sit-?up|플랭크|plank|상복부|upper\s*abs|앱\s*휠|ab\s*wheel/, subs: ["core-upper-abs"] },
  ],
};

/** 단서가 하나도 없을 때 떨어질 대표 세부근육(부위당 1개 — 넓게 퍼지지 않게). */
const FALLBACK_SUB: Record<InferMuscleId, string[]> = {
  chest: ["chest-mid"],
  back: ["back-lats"],
  shoulder: ["shoulder-front"],
  arm: ["arm-biceps-long", "arm-biceps-short"],
  lower: ["lower-quads"],
  core: ["core-upper-abs"],
};

/**
 * 이름/타깃 문구에서 세부근육 id 목록을 추론한다.
 * 여러 규칙에 걸리면 모두 포함(예: "인클라인 덤벨 플라이" = 상부 + 내측).
 */
export function inferSubMuscleIds(
  muscle: InferMuscleId,
  name: string,
  target: string,
): string[] {
  const text = `${name} ${target}`.toLowerCase();
  const out: string[] = [];
  for (const rule of RULES[muscle] ?? []) {
    if (!rule.re.test(text)) continue;
    for (const id of rule.subs) if (!out.includes(id)) out.push(id);
  }
  return out.length > 0 ? out : [...FALLBACK_SUB[muscle]];
}

/**
 * 슈퍼세트 — 두세 종목을 **쉬지 않고 번갈아** 하고, 한 바퀴를 돌면 그때 쉰다.
 *
 * 큐 순서는 그대로 두고 **세트 진행 순서만** 바꾼다. A·B 가 한 묶음이면
 * `A1 → B1 → 휴식 → A2 → B2 → 휴식 → …` 이다.
 *
 * server-only 의존성 없는 순수 함수 — 운동모드(클라)와 테스트가 함께 쓴다.
 *
 * ⚠ 묶음은 **큐에서 서로 붙어 있어야** 성립한다. 사이에 다른 운동이 끼면 그건
 * 슈퍼세트가 아니라 그냥 순환이다. 편집기에서 붙은 줄끼리만 묶게 하고, 여기서도
 * 붙어 있는 구간만 한 묶음으로 본다 — 데이터가 어긋나도 화면이 이상해지지 않게.
 */

/** 묶음 판정에 필요한 최소 정보 — 편집기 행도 큐 항목도 이것만 있으면 된다. */
export type SupersetGrouped = {
  /** 같은 값이면 한 묶음. null = 단독 운동. */
  supersetGroup: number | null;
};

/** 운동모드 큐 항목 — 완료·스킵 판정을 위해 rowId 가 더 필요하다. */
export type SupersetItem = SupersetGrouped & { rowId: string };

/** 그룹 번호는 1~99. 화면에서 'A/B/C' 로 보여줄 뿐이라 큰 수가 필요 없다. */
export const MAX_SUPERSET_GROUP = 99;

export function isSupersetGroup(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= 1 &&
    v <= MAX_SUPERSET_GROUP
  );
}

/**
 * `index` 가 속한 묶음의 인덱스들(큐 순서, 붙어 있는 구간만).
 * 단독 운동이거나 그룹이 혼자면 빈 배열 — "묶여 있지 않다"는 뜻이다.
 */
export function supersetBlock(
  items: readonly SupersetGrouped[],
  index: number,
): number[] {
  const cur = items[index];
  if (!cur || !isSupersetGroup(cur.supersetGroup)) return [];
  const g = cur.supersetGroup;

  let start = index;
  while (start - 1 >= 0 && items[start - 1]?.supersetGroup === g) start -= 1;
  let end = index;
  while (end + 1 < items.length && items[end + 1]?.supersetGroup === g) end += 1;

  if (end === start) return [];
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

/** 묶음 안에서 아직 할 것이 남은(완료·스킵 안 한) 인덱스들. */
function activeBlock(
  items: readonly SupersetItem[],
  processed: ReadonlySet<string>,
  index: number,
): number[] {
  return supersetBlock(items, index).filter(
    (i) => i === index || !processed.has(items[i].rowId),
  );
}

/**
 * 한 세트를 끝낸 뒤 **쉬지 않고** 곧바로 갈 다음 종목.
 *
 * 묶음의 다음 멤버가 남아 있으면 그 인덱스, 내가 묶음의 마지막이면 `null`
 * (= 여기서 한 바퀴가 끝났으니 쉰다).
 */
export function nextInSuperset(
  items: readonly SupersetItem[],
  processed: ReadonlySet<string>,
  index: number,
): number | null {
  const block = activeBlock(items, processed, index);
  const at = block.indexOf(index);
  if (at < 0 || at + 1 >= block.length) return null;
  return block[at + 1];
}

/**
 * 휴식이 끝나고 돌아갈 자리 — 묶음의 **첫 멤버**.
 *
 * 묶음이 아니거나 이미 첫 멤버면 `null`(= 제자리에 그대로 둔다).
 */
export function restReturnIndex(
  items: readonly SupersetItem[],
  processed: ReadonlySet<string>,
  index: number,
): number | null {
  const block = activeBlock(items, processed, index);
  if (block.length === 0) return null;
  const first = block[0];
  return first === index ? null : first;
}

/** 묶음 안 순서 라벨 — 0번째가 'A', 1번째가 'B'. 묶음이 아니면 null. */
export function supersetLabel(
  items: readonly SupersetGrouped[],
  index: number,
): string | null {
  const block = supersetBlock(items, index);
  const at = block.indexOf(index);
  if (at < 0) return null;
  return String.fromCharCode(65 + at);
}

/**
 * 편집기에서 쓸 그룹 번호 배정 — `rows[at]` 와 바로 다음 줄을 한 묶음으로 만든다.
 * 둘 중 하나가 이미 묶여 있으면 그 번호에 합치고, 아니면 안 쓰는 번호를 새로 준다.
 * 이미 셋 이상 묶인 줄에 붙이는 것도 같은 번호로 이어진다.
 */
export function linkWithNext<T extends { supersetGroup: number | null }>(
  rows: readonly T[],
  at: number,
): T[] {
  if (at < 0 || at + 1 >= rows.length) return [...rows];
  const a = rows[at].supersetGroup;
  const b = rows[at + 1].supersetGroup;
  const group = isSupersetGroup(a)
    ? a
    : isSupersetGroup(b)
      ? b
      : nextFreeGroup(rows);
  if (group === null) return [...rows];

  return rows.map((r, i) =>
    i === at || i === at + 1
      ? ({ ...r, supersetGroup: group } as T)
      : // 합쳐진 쪽의 옛 번호를 쓰던 줄들도 같은 번호로 끌어온다.
        isSupersetGroup(b) && isSupersetGroup(a) && r.supersetGroup === b
        ? ({ ...r, supersetGroup: group } as T)
        : r,
  );
}

/** 한 줄을 묶음에서 뺀다. 남은 멤버가 하나뿐이면 그 줄도 같이 푼다(혼자는 묶음이 아니다). */
export function unlink<T extends { supersetGroup: number | null }>(
  rows: readonly T[],
  at: number,
): T[] {
  const g = rows[at]?.supersetGroup ?? null;
  if (!isSupersetGroup(g)) return [...rows];
  const next = rows.map((r, i) =>
    i === at ? ({ ...r, supersetGroup: null } as T) : r,
  );
  const left = next.filter((r) => r.supersetGroup === g);
  if (left.length > 1) return next;
  return next.map((r) =>
    r.supersetGroup === g ? ({ ...r, supersetGroup: null } as T) : r,
  );
}

/**
 * 큐를 만들 때 묶음 번호를 **다시 매긴다**.
 *
 * 🔴 번호는 편집기에서 **부위(또는 일차)별로** 매겨진다 — 가슴의 1번과 등의 1번이
 * 서로 남남인데, 오늘 큐에서 두 부위가 맞닿으면 `가슴 마지막(1) · 등 첫째(1)` 가
 * 한 묶음으로 보인다. 저장된 번호를 그대로 믿지 않고, **부위가 같고 번호가 같고
 * 붙어 있는** 구간에만 새 번호를 준다. 혼자 남는 구간은 null(묶음 아님).
 *
 * 이 정규화 덕분에 DB 번호가 어떻게 매겨져 있든 화면과 진행이 같은 판정을 본다.
 */
export function normalizeGroups(
  rows: readonly { focus: string; supersetGroup: number | null }[],
): (number | null)[] {
  const out: (number | null)[] = new Array(rows.length).fill(null);
  let next = 1;
  let i = 0;
  while (i < rows.length) {
    const g = rows[i].supersetGroup;
    if (!isSupersetGroup(g)) {
      i += 1;
      continue;
    }
    let end = i;
    while (
      end + 1 < rows.length &&
      rows[end + 1].supersetGroup === g &&
      rows[end + 1].focus === rows[i].focus
    ) {
      end += 1;
    }
    if (end > i) {
      const id = next;
      next += 1;
      for (let k = i; k <= end; k += 1) out[k] = id;
    }
    i = end + 1;
  }
  return out;
}

/**
 * `at` 과 `at+1` **사이를 끊는다** — 편집기의 묶기/풀기는 줄이 아니라 **줄 사이**를 다룬다.
 *
 * A-B-C-D 묶음에서 B|C 를 끊으면 A-B 와 C-D 두 묶음이 된다. 끊고 나서 혼자 남는 쪽은
 * 묶음을 푼다(혼자는 슈퍼세트가 아니다).
 */
export function splitAfter<T extends { supersetGroup: number | null }>(
  rows: readonly T[],
  at: number,
): T[] {
  const g = rows[at]?.supersetGroup ?? null;
  if (!isSupersetGroup(g) || rows[at + 1]?.supersetGroup !== g) return [...rows];

  let start = at;
  while (start - 1 >= 0 && rows[start - 1]?.supersetGroup === g) start -= 1;
  let end = at + 1;
  while (end + 1 < rows.length && rows[end + 1]?.supersetGroup === g) end += 1;

  const headAlone = at - start + 1 === 1;
  const tailLen = end - at;
  // 🔴 남은 번호는 **전체 기준**으로 고른다. 끊는 묶음을 빼고 세면 앞쪽이 그대로 쓰는
  // 번호를 뒤쪽에 다시 줘서, 끊었는데 도로 한 묶음이 된다.
  const tailGroup = tailLen === 1 ? null : nextFreeGroup(rows);

  return rows.map((r, i) => {
    if (i < start || i > end) return r;
    if (i <= at) return headAlone ? ({ ...r, supersetGroup: null } as T) : r;
    return { ...r, supersetGroup: tailGroup } as T;
  });
}

/** 아직 안 쓰는 그룹 번호. 다 찼으면 null. */
function nextFreeGroup(
  rows: readonly { supersetGroup: number | null }[],
): number | null {
  const used = new Set(rows.map((r) => r.supersetGroup).filter(isSupersetGroup));
  for (let g = 1; g <= MAX_SUPERSET_GROUP; g += 1) {
    if (!used.has(g)) return g;
  }
  return null;
}

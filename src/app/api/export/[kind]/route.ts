import {
  BODY_HEADERS,
  CSV_BOM,
  DIET_HEADERS,
  EXPORT_KINDS,
  WORKOUT_HEADERS,
  backupMeta,
  bodyRow,
  contentDisposition,
  csvLine,
  dietRow,
  isExportKind,
  workoutRow,
  type Cell,
  type ExportKind,
} from "@/features/export/export-format";
import {
  backupSections,
  bodyRecords,
  dietRecords,
  workoutRecords,
  type ExportClient,
} from "@/features/export/export-data";
import { seoulYmd } from "@/features/routine/data";
import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 내 데이터 내보내기 — 로드맵 5.1.
 *
 * `GET /api/export/workouts|body|diet|backup` → 첨부파일로 내려준다.
 *
 * ## 서버에 파일을 만들지 않는다
 * 만들어 두면 지워야 하고, 지우기 전까지는 링크를 아는 사람이 받을 수 있다.
 * 요청을 받은 자리에서 DB 를 읽어 **곧바로 응답 본문으로 흘려보내고 끝낸다** —
 * 남는 파일이 없으니 보존 기간을 정할 것도, 지울 것도 없다.
 *
 * ## 스트리밍
 * 전 기간을 읽으므로 배열로 모으면 행 수만큼 메모리를 쓴다. 조회 계층이 페이지
 * 단위 제너레이터를 주고, 여기서 한 줄씩 인코딩해 내보낸다. 다운로드가 중간에
 * 끊기면 `pull` 이 더 불리지 않아 조회도 함께 멈춘다.
 *
 * ## ⚠ 쿠키는 응답을 돌려주기 **전에** 읽는다
 * 본문 스트림은 Response 를 반환한 뒤에 돌아간다. 그 시점엔 요청 스코프가 없어
 * `cookies()` 가 던지고, 헤더는 이미 나갔으니 **다운로드가 중간에 끊긴 것처럼 보인다.**
 * 그래서 Supabase 클라이언트를 여기서 미리 만들어 조회 계층에 넘긴다.
 *
 * ## 인증
 * 쿠키 세션이 있어야 하고, **그 사람 것만** 나간다(조회 계층이 소유자 조건을
 * 명시하고 RLS 가 한 겹 더 막는다). 로그인 없으면 401 — 리다이렉트가 아니라
 * 상태코드로 답한다(파일 요청에 HTML 로그인 페이지를 주면 그게 파일로 저장된다).
 */

const encoder = new TextEncoder();

function csvStream<T>(
  headers: string[],
  pages: AsyncGenerator<T[]>,
  toCells: (row: T) => Cell[],
): ReadableStream<Uint8Array> {
  const iterator = pages[Symbol.asyncIterator]();
  let sentHeader = false;
  return new ReadableStream({
    async pull(controller) {
      if (!sentHeader) {
        sentHeader = true;
        // BOM 을 빼면 엑셀이 한글을 CP949 로 읽어 전부 깨진다.
        controller.enqueue(encoder.encode(CSV_BOM + csvLine(headers)));
        return;
      }
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
        return;
      }
      let chunk = "";
      for (const row of value) chunk += csvLine(toCells(row));
      if (chunk) controller.enqueue(encoder.encode(chunk));
    },
    async cancel() {
      // 사용자가 다운로드를 취소했다 — 남은 페이지를 더 읽지 않는다.
      await iterator.return?.(undefined);
    },
  });
}

function backupStream(
  supabase: ExportClient,
  userId: string,
  email: string | null,
): ReadableStream<Uint8Array> {
  const iterator = backupSections(supabase, userId)[Symbol.asyncIterator]();
  let openTable: string | null = null;
  let firstRow = true;
  let started = false;
  let finished = false;

  const open = () =>
    `{"meta":${JSON.stringify(backupMeta(email, new Date().toISOString()))},"data":{`;

  return new ReadableStream({
    async pull(controller) {
      if (!started) {
        started = true;
        controller.enqueue(encoder.encode(open()));
        return;
      }
      if (finished) {
        controller.close();
        return;
      }
      const { value, done } = await iterator.next();
      if (done) {
        finished = true;
        controller.enqueue(encoder.encode(`${openTable ? "]" : ""}}}`));
        return;
      }
      let chunk = "";
      if (value.table !== openTable) {
        chunk += openTable ? "]," : "";
        chunk += `${JSON.stringify(value.table)}:[`;
        openTable = value.table;
        firstRow = true;
      }
      for (const row of value.rows) {
        chunk += (firstRow ? "" : ",") + JSON.stringify(row);
        firstRow = false;
      }
      controller.enqueue(encoder.encode(chunk));
    },
    async cancel() {
      await iterator.return?.(undefined);
    },
  });
}

function streamFor(
  kind: ExportKind,
  supabase: ExportClient,
  userId: string,
  email: string | null,
): ReadableStream<Uint8Array> {
  switch (kind) {
    case "workouts":
      return csvStream(
        WORKOUT_HEADERS,
        workoutRecords(supabase, userId),
        workoutRow,
      );
    case "body":
      return csvStream(BODY_HEADERS, bodyRecords(supabase, userId), bodyRow);
    case "diet":
      return csvStream(DIET_HEADERS, dietRecords(supabase, userId), dietRow);
    case "backup":
      return backupStream(supabase, userId, email);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!isExportKind(kind)) {
    return new Response(JSON.stringify({ error: "unknown_kind" }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // ⚠ 스트림이 돌기 전에, 아직 요청 스코프 안일 때 만든다.
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  return new Response(streamFor(kind, supabase, user.id, user.email), {
    headers: {
      "content-type": EXPORT_KINDS[kind].contentType,
      "content-disposition": contentDisposition(kind, today),
      // 내 데이터가 담긴 파일이다 — 어떤 캐시에도 남기지 않는다.
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
    },
  });
}

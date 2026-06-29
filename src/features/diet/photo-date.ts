/**
 * 사진 촬영일 검사 — "오늘 기록엔 오늘 찍은 사진만" 규칙을 위해 EXIF 촬영일을 읽는다.
 * OS 파일 선택창은 날짜로 필터할 수 없어, 고른 사진의 촬영일을 검증해 거부한다.
 * EXIF 가 없으면(스크린샷·편집본 등) 파일 수정시각(lastModified)으로 대체 판단.
 */

/** ms(epoch) → 서울 기준 "YYYY-MM-DD". */
export function toSeoulYmd(ms: number): string {
  // en-CA 로케일은 YYYY-MM-DD 형식.
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/**
 * 규칙: 오늘 기록(isToday)이면 촬영일이 오늘과 같아야 허용. 과거 기록은 항상 허용.
 * takenYmd 가 null(촬영일 불명)이고 오늘 기록이면 허용하지 않는다.
 */
export function photoDateAllowed(
  takenYmd: string | null,
  isToday: boolean,
  todayYmd: string,
): boolean {
  if (!isToday) return true;
  return takenYmd === todayYmd;
}

/** JPEG EXIF 의 DateTimeOriginal(없으면 Digitized) → "YYYY-MM-DD". 못 읽으면 null. */
export function parseExifDateYmd(
  data: ArrayBuffer | Uint8Array,
): string | null {
  const b = data instanceof Uint8Array ? data : new Uint8Array(data);
  // JPEG SOI
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  let off = 2;
  while (off + 4 <= b.length) {
    if (b[off] !== 0xff) {
      off++;
      continue;
    }
    const marker = b[off + 1];
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS(이미지 데이터 시작)
    const size = (b[off + 2] << 8) | b[off + 3];
    if (size < 2) break;
    if (marker === 0xe1) {
      const s = off + 4;
      // "Exif\0\0"
      if (
        b[s] === 0x45 &&
        b[s + 1] === 0x78 &&
        b[s + 2] === 0x69 &&
        b[s + 3] === 0x66 &&
        b[s + 4] === 0x00 &&
        b[s + 5] === 0x00
      ) {
        return parseTiffDate(b, s + 6);
      }
    }
    off += 2 + size;
  }
  return null;
}

function parseTiffDate(b: Uint8Array, tiff: number): string | null {
  if (tiff + 8 > b.length) return null;
  const le = b[tiff] === 0x49 && b[tiff + 1] === 0x49; // 'II' = little-endian
  const u16 = (o: number) =>
    le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1];
  const u32 = (o: number) =>
    (le
      ? b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)
      : (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

  if (u16(tiff + 2) !== 0x002a) return null;
  const ifd0 = tiff + u32(tiff + 4);

  const findEntry = (ifd: number, tag: number): number | null => {
    if (ifd + 2 > b.length) return null;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > b.length) return null;
      if (u16(e) === tag) return e;
    }
    return null;
  };

  // IFD0 → Exif IFD 포인터(0x8769)
  const exifPtr = findEntry(ifd0, 0x8769);
  const exifIfd = exifPtr != null ? tiff + u32(exifPtr + 8) : ifd0;

  // DateTimeOriginal(0x9003) 우선, 없으면 DateTimeDigitized(0x9004), IFD0 DateTime(0x0132)
  const entry =
    findEntry(exifIfd, 0x9003) ??
    findEntry(exifIfd, 0x9004) ??
    findEntry(ifd0, 0x0132);
  if (entry == null) return null;

  const count = u32(entry + 4);
  // ASCII 19바이트("YYYY:MM:DD HH:MM:SS")라 항상 오프셋 참조.
  const valOff = count > 4 ? tiff + u32(entry + 8) : entry + 8;
  if (valOff + 10 > b.length) return null;
  let s = "";
  for (let i = 0; i < 10; i++) s += String.fromCharCode(b[valOff + i]);
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 사진의 촬영일(서울 "YYYY-MM-DD") — EXIF 우선, 없으면 파일 수정시각. (브라우저 전용) */
export async function fileTakenYmd(file: File): Promise<string> {
  try {
    // EXIF 는 파일 앞부분에 있어 256KB 만 읽어도 충분.
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const exif = parseExifDateYmd(buf);
    if (exif) return exif;
  } catch {
    /* EXIF 못 읽으면 lastModified 로 대체 */
  }
  return toSeoulYmd(file.lastModified);
}

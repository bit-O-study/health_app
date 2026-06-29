import { describe, expect, it } from "vitest";

import {
  photoDateAllowed,
  toSeoulYmd,
  parseExifDateYmd,
} from "@/features/diet/photo-date";

describe("photoDateAllowed — 오늘 기록은 오늘 찍은 사진만", () => {
  it("오늘 기록: 촬영일이 오늘이면 허용", () => {
    expect(photoDateAllowed("2026-06-29", true, "2026-06-29")).toBe(true);
  });

  it("오늘 기록: 촬영일이 과거면 거부(갤러리 옛 사진)", () => {
    expect(photoDateAllowed("2026-06-28", true, "2026-06-29")).toBe(false);
    expect(photoDateAllowed("2020-01-01", true, "2026-06-29")).toBe(false);
  });

  it("오늘 기록: 촬영일 불명이면 거부", () => {
    expect(photoDateAllowed(null, true, "2026-06-29")).toBe(false);
  });

  it("과거 기록: 어떤 사진이든 허용", () => {
    expect(photoDateAllowed("2020-01-01", false, "2026-06-29")).toBe(true);
    expect(photoDateAllowed(null, false, "2026-06-29")).toBe(true);
  });
});

describe("toSeoulYmd — epoch ms → 서울 날짜", () => {
  it("UTC 자정도 서울(+9)에선 같은 날 오전", () => {
    // 2026-06-29 00:00 UTC → 서울 09:00 → 2026-06-29
    expect(toSeoulYmd(Date.UTC(2026, 5, 29, 0, 0))).toBe("2026-06-29");
  });

  it("UTC 늦은 밤은 서울에선 다음 날", () => {
    // 2026-06-28 16:00 UTC → 서울 01:00(29일)
    expect(toSeoulYmd(Date.UTC(2026, 5, 28, 16, 0))).toBe("2026-06-29");
  });
});

describe("parseExifDateYmd — JPEG EXIF DateTimeOriginal", () => {
  it("EXIF 가 없는(혹은 JPEG 아닌) 버퍼는 null", () => {
    expect(parseExifDateYmd(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull(); // PNG 시그니처
    expect(parseExifDateYmd(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull(); // EXIF 없는 JPEG
  });

  it("최소 EXIF(리틀엔디안)에서 DateTimeOriginal 을 읽는다", () => {
    expect(parseExifDateYmd(buildJpegWithExifDate("2026:06:29 08:30:00"))).toBe(
      "2026-06-29",
    );
  });
});

/** 테스트용 최소 JPEG: SOI + APP1(Exif, TIFF LE, IFD0→ExifIFD→DateTimeOriginal) + EOI. */
function buildJpegWithExifDate(dt: string): Uint8Array {
  const ascii = dt + "\0"; // 20바이트
  const enc = [...ascii].map((c) => c.charCodeAt(0));

  // TIFF 본문(리틀엔디안)을 만든다. tiff 오프셋 기준 절대값으로 구성.
  // 레이아웃: [TIFF헤더8] [IFD0] [ExifIFD] [DateTime 값]
  const tiff: number[] = [];
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];

  // 헤더: II, 42, IFD0 offset=8
  tiff.push(0x49, 0x49, ...u16(0x2a), ...u32(8));
  // IFD0 @8: 1 entry
  const ifd0 = 8;
  const exifIfdOff = ifd0 + 2 + 12 + 4; // entries + nextIFD(4)
  // entry: ExifIFD pointer(0x8769), type LONG(4), count 1, value=exifIfdOff
  tiff.push(...u16(1));
  tiff.push(...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifIfdOff));
  tiff.push(...u32(0)); // next IFD = 0
  // ExifIFD @exifIfdOff: 1 entry
  const valOff = exifIfdOff + 2 + 12 + 4;
  tiff.push(...u16(1));
  // DateTimeOriginal(0x9003), ASCII(2), count=20, value offset
  tiff.push(...u16(0x9003), ...u16(2), ...u32(enc.length), ...u32(valOff));
  tiff.push(...u32(0)); // next IFD = 0
  // 값
  tiff.push(...enc);

  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  const app1Payload = [...exifHeader, ...tiff];
  const app1Size = app1Payload.length + 2; // size 필드는 자신 포함
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe1, (app1Size >> 8) & 0xff, app1Size & 0xff, // APP1 marker + size
    ...app1Payload,
    0xff, 0xd9, // EOI
  ]);
}

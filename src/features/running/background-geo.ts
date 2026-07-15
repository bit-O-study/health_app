import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * 위치 추적 추상화 — 네이티브 앱은 백그라운드에서도 GPS 를 유지(@capacitor-community/
 * background-geolocation, 포그라운드 서비스), 웹은 navigator.geolocation.watchPosition.
 * 야외 런닝이 앱을 뒤로 보내도 거리 기록이 끊기지 않게 한다.
 */

export type GeoFix = {
  lat: number;
  lng: number;
  accuracy: number | null;
  /** m/s. 없으면 null. */
  speedMps: number | null;
  /** epoch ms. */
  t: number;
};

export type GeoErrKind = "denied" | "gps-off" | "timeout" | "other";
export type GeoWatch = { stop: () => void };

type NativeLoc = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  time?: number | null;
};
type NativeErr = { code?: string; message?: string };
type BgGeoPlugin = {
  addWatcher(
    opts: {
      backgroundTitle?: string;
      backgroundMessage?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    cb: (location: NativeLoc | null, error: NativeErr | null) => void,
  ): Promise<string>;
  removeWatcher(opts: { id: string }): Promise<void>;
};

/**
 * 위치 추적 시작. onFix 마다 위치, onError 로 실패 종류를 알린다.
 * 반환된 stop() 으로 추적을 멈춘다(백그라운드 서비스도 종료).
 */
export async function startGeoWatch(
  onFix: (fix: GeoFix) => void,
  onError: (kind: GeoErrKind, message: string) => void,
): Promise<GeoWatch> {
  if (Capacitor?.isNativePlatform?.()) {
    try {
      const Bg = registerPlugin<BgGeoPlugin>("BackgroundGeolocation");
      let removed = false;
      const id = await Bg.addWatcher(
        {
          backgroundTitle: "런닝 기록 중",
          backgroundMessage: "백그라운드에서도 달린 거리를 기록하고 있어요.",
          requestPermissions: true,
          stale: false,
          distanceFilter: 5,
        },
        (location, error) => {
          if (error) {
            if (error.code === "NOT_AUTHORIZED") {
              onError("denied", "위치 권한이 필요해요. 항상 허용으로 설정해 주세요.");
            } else {
              onError("other", error.message ?? "위치 오류");
            }
            return;
          }
          if (location) {
            onFix({
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy ?? null,
              speedMps:
                typeof location.speed === "number" && location.speed >= 0
                  ? location.speed
                  : null,
              t: location.time ?? Date.now(),
            });
          }
        },
      );
      return {
        stop: () => {
          if (removed) return;
          removed = true;
          void Bg.removeWatcher({ id }).catch(() => {});
        },
      };
    } catch {
      // 네이티브 플러그인 실패 시 웹 방식으로 폴백.
    }
  }

  // 웹(브라우저/PWA) — 포그라운드에서만 동작.
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError("other", "이 기기에서 위치(GPS)를 사용할 수 없어요.");
    return { stop: () => {} };
  }
  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        speedMps:
          typeof pos.coords.speed === "number" && pos.coords.speed >= 0
            ? pos.coords.speed
            : null,
        t: pos.timestamp,
      }),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        onError("denied", "위치 권한이 필요해요.");
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        onError("gps-off", "위치 정보(GPS)가 꺼져 있어요.");
      } else if (err.code === err.TIMEOUT) {
        onError("timeout", "위치를 찾지 못했어요.");
      } else {
        onError("other", `위치 오류: ${err.message}`);
      }
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
  );
  return { stop: () => navigator.geolocation.clearWatch(id) };
}

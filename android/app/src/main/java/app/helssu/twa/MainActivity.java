package app.helssu.twa;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

/**
 * 런닝(실내=카메라 getUserMedia / 야외=GPS geolocation) 웹 권한을 시스템 권한 다이얼로그로
 * 연결한다. Capacitor 기본 WebChromeClient 는 런타임 권한이 없으면 프롬프트 없이 거부하므로,
 * 여기서 요청을 가로채 필요할 때 ActivityCompat.requestPermissions 로 '권한 허용' 알림창을 띄운다.
 */
public class MainActivity extends BridgeActivity {

    private static final int REQ_CAMERA = 9101;
    private static final int REQ_LOCATION = 9102;

    private PermissionRequest pendingCamera;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    // 리모트 URL WebView 라, 다른 앱 갔다 복귀 시 네트워크 순단·WebView 프로세스 종료로
    // 메인 페이지 로드가 실패하면 안드로이드 기본 "페이지를 열 수 없음" 화면이 뜬다.
    // 수동 새로고침을 요구하지 않도록 자동 재시도(백오프)하고, 복귀 시 실패 상태면 다시 로드.
    private static final int MAX_RELOADS = 6;
    private int reloadAttempts = 0;
    private boolean loadFailed = false;
    private final Handler retryHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.getBridge().getWebView();

        // 웹에서 OS 설정 화면을 열 수 있는 JS 브릿지(window.HelssuNative).
        // 야외 런닝에서 GPS(위치정보)가 꺼져 있으면 '위치 설정 열기'로 안내한다.
        // ⚠ 웹/WebView 는 위치정보를 코드로 자동 ON 할 수 없어, 설정 화면 열기까지만 지원한다.
        webView.addJavascriptInterface(new NativeBridge(), "HelssuNative");

        webView.setWebChromeClient(new BridgeWebChromeClient(this.getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean wantsCamera = false;
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) {
                            wantsCamera = true;
                        }
                    }
                    if (!wantsCamera) {
                        // 카메라가 아니면(오디오 등) 그대로 허용.
                        request.grant(request.getResources());
                        return;
                    }
                    if (hasPermission(Manifest.permission.CAMERA)) {
                        request.grant(request.getResources());
                    } else {
                        // 권한 없으면 시스템 다이얼로그 → 결과는 onRequestPermissionsResult 에서.
                        pendingCamera = request;
                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[] { Manifest.permission.CAMERA },
                            REQ_CAMERA
                        );
                    }
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(
                final String origin,
                final GeolocationPermissions.Callback callback
            ) {
                if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[] {
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        },
                        REQ_LOCATION
                    );
                }
            }
        });

        // 메인 페이지 로드 실패 → 기본 에러 페이지 대신 자동 복구. Capacitor 의
        // BridgeWebViewClient 를 상속해 브릿지/네비게이션 동작은 그대로 유지한다.
        webView.setWebViewClient(new BridgeWebViewClient(this.getBridge()) {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // 정상 로드 → 실패 상태·재시도 카운터 리셋.
                loadFailed = false;
                reloadAttempts = 0;
            }

            @Override
            public void onReceivedError(
                WebView view,
                WebResourceRequest request,
                WebResourceError error
            ) {
                // 서브리소스(이미지·폰트 등) 실패는 무시 — 메인 페이지 실패만 복구.
                if (request == null || !request.isForMainFrame()) {
                    super.onReceivedError(view, request, error);
                    return;
                }
                loadFailed = true;
                scheduleReload(view);
            }
        });
    }

    /**
     * 메인 페이지 로드 실패 → 백오프(0.8s,1.6s,…최대 8s)로 자동 재시도.
     * 진짜 오프라인이면 MAX_RELOADS 에서 멈춰 배터리 낭비를 막고, 앱 복귀(onResume) 시
     * 다시 처음부터 시도한다.
     */
    private void scheduleReload(final WebView view) {
        if (view == null || reloadAttempts >= MAX_RELOADS) return;
        reloadAttempts++;
        long delay = Math.min(8000L, 800L * (1L << (reloadAttempts - 1)));
        retryHandler.postDelayed(() -> {
            if (loadFailed) view.reload();
        }, delay);
    }

    @Override
    public void onResume() {
        super.onResume();
        // 다른 앱 갔다 복귀했는데 직전 로드가 실패 상태였다면 자동으로 다시 로드한다.
        if (loadFailed) {
            reloadAttempts = 0;
            WebView wv = this.getBridge().getWebView();
            if (wv != null) wv.reload();
        }
    }

    private boolean hasPermission(String perm) {
        return ContextCompat.checkSelfPermission(this, perm)
            == PackageManager.PERMISSION_GRANTED;
    }

    /** window.HelssuNative — 웹에서 기기 설정 화면을 여는 브릿지. */
    private class NativeBridge {
        /** 기기 '위치 정보(GPS)' 설정 화면 열기. */
        @JavascriptInterface
        public void openLocationSettings() {
            runOnUiThread(() -> {
                Intent i = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            });
        }

        /** 이 앱의 상세 설정(권한) 화면 열기. */
        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(() -> {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                i.setData(Uri.fromParts("package", getPackageName(), null));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        String[] permissions,
        int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        boolean granted = grantResults.length > 0
            && grantResults[0] == PackageManager.PERMISSION_GRANTED;

        if (requestCode == REQ_CAMERA && pendingCamera != null) {
            final PermissionRequest req = pendingCamera;
            pendingCamera = null;
            runOnUiThread(() -> {
                if (granted) {
                    req.grant(req.getResources());
                } else {
                    req.deny();
                }
            });
        } else if (requestCode == REQ_LOCATION && pendingGeoCallback != null) {
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }
}

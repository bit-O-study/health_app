package app.helssu.twa;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.URLUtil;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.Toast;

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
    private static final int REQ_DOWNLOAD_STORAGE = 9103;
    private static final String RECOVERY_PREFS = "helssu_recovery";
    private static final String RENDERER_RECOVERY_PENDING = "renderer_recovery_pending";
    private static final String RENDERER_RECOVERY_COUNT = "renderer_recovery_count";
    private static final String RENDERER_RECOVERY_AT = "renderer_recovery_at";
    private static final long RENDERER_RECOVERY_WINDOW_MS = 2 * 60 * 1000L;

    private PermissionRequest pendingCamera;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private PendingDownload pendingDownload;

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

        loadOAuthCallback(getIntent(), webView);

        // 웹에서 OS 설정 화면을 열 수 있는 JS 브릿지(window.HelssuNative).
        // 야외 런닝에서 GPS(위치정보)가 꺼져 있으면 '위치 설정 열기'로 안내한다.
        // ⚠ 웹/WebView 는 위치정보를 코드로 자동 ON 할 수 없어, 설정 화면 열기까지만 지원한다.
        webView.addJavascriptInterface(new NativeBridge(), "HelssuNative");

        // 내 데이터 내보내기(CSV/JSON) 처럼 서버가 첨부파일로 주는 응답은, 리스너가 없으면
        // WebView 가 **아무 일도 하지 않는다** — 사용자에겐 버튼이 먹통인 것으로 보인다.
        // 시스템 다운로드 관리자로 넘겨 '다운로드' 폴더에 저장하고 알림으로 알린다.
        webView.setDownloadListener((url, userAgent, disposition, mimeType, contentLength) ->
            startDownload(url, userAgent, disposition, mimeType));

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

            /**
             * 웹뷰 렌더러 프로세스가 죽었다 — 대개 메모리 부족이거나, 앱이
             * 백그라운드에 있는 동안 안드로이드가 회수한 경우다.
             *
             * 여기서 true 를 돌려주지 않으면 안드로이드가 **앱 프로세스까지 함께
             * 죽인다.** 사용자에게는 아무 안내 없이 '앱이 그냥 튕기는' 것으로 보인다.
             * 리모트 URL 웹뷰 앱에서 이 콜백을 비워 두면 언젠가 반드시 겪는다.
             *
             * 죽은 WebView 는 되살릴 수 없어 reload() 로는 복구되지 않는다. 화면에서
             * 떼어내 파괴하고 액티비티를 다시 만들어 새 WebView 로 시작한다.
             *
             * 복구는 마지막 페이지가 아니라 시작 URL 로 한다. 렌더러를 터뜨린 바로 그
             * 페이지로 되돌아가면 같은 자리에서 다시 죽는 crash loop 가 된다.
             * 세션은 쿠키에 있으므로 로그인 상태는 유지된다.
             */
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (view != null) {
                    ViewGroup parent = (ViewGroup) view.getParent();
                    if (parent != null) parent.removeView(view);
                }
                // Capacitor가 Activity 종료 때 WebView를 파괴하므로 여기서 중복 파괴하지 않는다.
                android.content.SharedPreferences recovery =
                    getSharedPreferences(RECOVERY_PREFS, MODE_PRIVATE);
                long now = System.currentTimeMillis();
                long previousAt = recovery.getLong(RENDERER_RECOVERY_AT, 0L);
                int recoveryCount = now - previousAt <= RENDERER_RECOVERY_WINDOW_MS
                    ? recovery.getInt(RENDERER_RECOVERY_COUNT, 0) + 1
                    : 1;
                recovery.edit()
                    .putBoolean(RENDERER_RECOVERY_PENDING, true)
                    .putInt(RENDERER_RECOVERY_COUNT, recoveryCount)
                    .putLong(RENDERER_RECOVERY_AT, now)
                    .apply();
                // 죽은 WebView 를 겨냥한 재시도가 남아 있으면 새 화면을 덮어친다.
                retryHandler.removeCallbacksAndMessages(null);
                loadFailed = false;
                reloadAttempts = 0;
                retryHandler.post(() -> MainActivity.this.recreate());
                return true;
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadOAuthCallback(intent, this.getBridge().getWebView());
    }

    private void loadOAuthCallback(Intent intent, WebView webView) {
        if (intent == null || webView == null) return;
        Uri uri = intent.getData();
        if (uri == null) return;
        String callbackUrl;
        if ("helssu".equals(uri.getScheme())
            && "auth".equals(uri.getHost())
            && "/callback".equals(uri.getPath())) {
            Uri.Builder callback = new Uri.Builder()
                .scheme("https")
                .authority("health-app-five-iota.vercel.app")
                .path("/auth/callback");
            appendQueryParameter(uri, callback, "code");
            appendQueryParameter(uri, callback, "next");
            appendQueryParameter(uri, callback, "error");
            callbackUrl = callback.build().toString();
        } else if ("https".equals(uri.getScheme())
            && "health-app-five-iota.vercel.app".equals(uri.getHost())
            && "/auth/callback".equals(uri.getPath())) {
            callbackUrl = uri.toString();
        } else {
            return;
        }
        webView.loadUrl(callbackUrl);
        intent.setData(null);
    }

    private void appendQueryParameter(Uri source, Uri.Builder target, String name) {
        String value = source.getQueryParameter(name);
        if (value != null) target.appendQueryParameter(name, value);
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

    /** 권한을 받고 나서 이어서 받아야 할 다운로드. */
    private static class PendingDownload {
        final String url;
        final String userAgent;
        final String disposition;
        final String mimeType;

        PendingDownload(String url, String userAgent, String disposition, String mimeType) {
            this.url = url;
            this.userAgent = userAgent;
            this.disposition = disposition;
            this.mimeType = mimeType;
        }
    }

    /**
     * WebView 가 못 여는 응답(첨부파일)을 시스템 다운로드 관리자에게 넘긴다.
     *
     * 세 가지를 챙긴다 —
     *  1) **쿠키를 같이 보낸다.** 내보내기 URL 은 로그인 세션이 있어야 열린다.
     *     다운로드 관리자는 WebView 와 별개 프로세스라 쿠키를 물려받지 못한다.
     *  2) **http/https 만.** blob:·data: 는 다운로드 관리자가 못 열고 예외를 던진다.
     *  3) **API 28 이하에서는 저장소 권한.** 29 부터는 필요 없다(공용 다운로드 폴더).
     */
    private void startDownload(
        String url,
        String userAgent,
        String disposition,
        String mimeType
    ) {
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
            Toast.makeText(this, "이 파일은 앱에서 받을 수 없습니다.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            && !hasPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
            pendingDownload = new PendingDownload(url, userAgent, disposition, mimeType);
            ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.WRITE_EXTERNAL_STORAGE },
                REQ_DOWNLOAD_STORAGE
            );
            return;
        }
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null) request.addRequestHeader("Cookie", cookie);
            if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
            // 서버가 Content-Disposition 으로 준 이름을 그대로 쓴다(한글 이름은 ASCII 이름으로 대체).
            String name = URLUtil.guessFileName(url, disposition, mimeType);
            request.setMimeType(mimeType);
            request.setTitle(name);
            request.setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            DownloadManager manager =
                (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) {
                Toast.makeText(this, "다운로드를 시작하지 못했습니다.", Toast.LENGTH_SHORT).show();
                return;
            }
            manager.enqueue(request);
            Toast.makeText(this, "다운로드 폴더에 저장 중입니다.", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            // 다운로드 실패로 앱이 죽으면 안 된다 — 알리고 넘어간다.
            Toast.makeText(this, "다운로드를 시작하지 못했습니다.", Toast.LENGTH_SHORT).show();
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

        /** 렌더러 사망 뒤 새 WebView로 시작한 경우에만 한 번 true를 반환한다. */
        @JavascriptInterface
        public boolean consumeRendererRecovery() {
            boolean pending = getSharedPreferences(RECOVERY_PREFS, MODE_PRIVATE)
                .getBoolean(RENDERER_RECOVERY_PENDING, false);
            if (pending) {
                getSharedPreferences(RECOVERY_PREFS, MODE_PRIVATE)
                    .edit()
                    .remove(RENDERER_RECOVERY_PENDING)
                    .apply();
            }
            return pending;
        }

        /**
         * 설치된 앱 버전(versionName). 웹은 원격 URL 이라 자기 APK 버전을 모른다 —
         * 실사용 오류 관측에서 "어느 앱 버전에서 난 팅김인가"를 가리려면 필요하다.
         * 못 읽으면 빈 문자열(관측이 앱을 방해하지 않는다).
         */
        @JavascriptInterface
        public String appVersion() {
            try {
                return getPackageManager()
                    .getPackageInfo(getPackageName(), 0)
                    .versionName;
            } catch (Exception e) {
                return "";
            }
        }

        /** 2분 안에 이어진 렌더러 복구 횟수. pending 상태일 때 한 번만 반환한다. */
        @JavascriptInterface
        public int consumeRendererRecoveryCount() {
            android.content.SharedPreferences recovery =
                getSharedPreferences(RECOVERY_PREFS, MODE_PRIVATE);
            if (!recovery.getBoolean(RENDERER_RECOVERY_PENDING, false)) return 0;
            int count = recovery.getInt(RENDERER_RECOVERY_COUNT, 1);
            recovery.edit().remove(RENDERER_RECOVERY_PENDING).apply();
            return count;
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
        } else if (requestCode == REQ_DOWNLOAD_STORAGE && pendingDownload != null) {
            final PendingDownload queued = pendingDownload;
            pendingDownload = null;
            if (granted) {
                startDownload(
                    queued.url,
                    queued.userAgent,
                    queued.disposition,
                    queued.mimeType
                );
            } else {
                Toast.makeText(
                    this,
                    "저장 권한이 없어 파일을 받을 수 없습니다.",
                    Toast.LENGTH_SHORT
                ).show();
            }
        }
    }
}

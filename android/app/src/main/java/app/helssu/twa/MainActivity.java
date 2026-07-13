package app.helssu.twa;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.getBridge().getWebView();
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
    }

    private boolean hasPermission(String perm) {
        return ContextCompat.checkSelfPermission(this, perm)
            == PackageManager.PERMISSION_GRANTED;
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

package app.helssu.twa;

import android.app.Application;

import com.woot.plugins.kakao.CapacitorKakaoPlugin;

/**
 * 앱 시작 시 카카오 네이티브 SDK 를 초기화한다(공유 버튼 카드에 필요).
 * AndroidManifest 의 application android:name=".GlobalApplication" 로 등록됨.
 */
public class GlobalApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        CapacitorKakaoPlugin.initKakaoSdk(this, getString(R.string.kakao_app_key));
    }
}

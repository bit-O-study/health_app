package app.helssu.twa;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions;

/**
 * 체성분 분석지 사진 → 글자 조각과 위치(window.Capacitor.Plugins.BodyCompOcr).
 * Google ML Kit 한국어 모델로 폰 안에서만 읽는다 — 인터넷·AI 없음. 모델은 Play 서비스가 설치 때 받아 둔다
 * (앱에 넣으면 APK 50MB). 아직 다 못 받았으면 '잠시 후 다시' 안내.
 * 숫자와 항목명을 짝짓는 건 웹(parse-body-comp-layout.ts)이 위치를 보고 한다.
 */
@CapacitorPlugin(name = "BodyCompOcr")
public class BodyCompOcrPlugin extends Plugin {
    private TextRecognizer recognizer;

    @PluginMethod
    public void recognize(PluginCall call) {
        String base64 = call.getString("base64", "");
        if (base64.isEmpty()) {
            call.reject("사진이 없습니다.");
            return;
        }
        Bitmap bitmap;
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (IllegalArgumentException e) {
            bitmap = null;
        }
        if (bitmap == null) {
            call.reject("사진을 열지 못했어요.");
            return;
        }
        if (recognizer == null) {
            recognizer = TextRecognition.getClient(new KoreanTextRecognizerOptions.Builder().build());
        }
        final Bitmap image = bitmap;
        recognizer.process(InputImage.fromBitmap(image, 0))
            .addOnSuccessListener(text -> {
                JSArray words = new JSArray();
                for (Text.TextBlock block : text.getTextBlocks()) {
                    for (Text.Line line : block.getLines()) {
                        for (Text.Element el : line.getElements()) {
                            Rect box = el.getBoundingBox();
                            if (box == null) continue;
                            JSObject w = new JSObject();
                            w.put("text", el.getText());
                            w.put("left", box.left);
                            w.put("top", box.top);
                            w.put("right", box.right);
                            w.put("bottom", box.bottom);
                            w.put("angle", line.getAngle());
                            words.put(w);
                        }
                    }
                }
                JSObject result = new JSObject();
                result.put("words", words);
                result.put("width", image.getWidth());
                result.put("height", image.getHeight());
                image.recycle();
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                image.recycle();
                boolean downloading = e instanceof com.google.mlkit.common.MlKitException
                    && ((com.google.mlkit.common.MlKitException) e).getErrorCode() == com.google.mlkit.common.MlKitException.UNAVAILABLE;
                call.reject(downloading
                    ? "글자 인식 준비 중이에요. 와이파이에 연결된 채로 1~2분 뒤 다시 시도해 주세요."
                    : "사진의 글자를 읽지 못했어요.");
            });
    }

    @Override
    protected void handleOnDestroy() {
        if (recognizer != null) recognizer.close();
        recognizer = null;
    }
}

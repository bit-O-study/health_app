package app.helssu.twa;

import android.speech.tts.TextToSpeech;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "WorkoutSpeech")
public class WorkoutSpeechPlugin extends Plugin {
    private TextToSpeech engine;
    private PluginCall waiting;
    private boolean ready;
    @PluginMethod public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String text = call.getString("text", "");
            if (text.isEmpty()) { call.resolve(); return; }
            if (ready) { say(call); return; }
            if (waiting != null) waiting.resolve();
            waiting = call;
            if (engine != null) return;
            engine = new TextToSpeech(getContext(), status -> getActivity().runOnUiThread(() -> {
                ready = status == TextToSpeech.SUCCESS && engine.setLanguage(Locale.KOREAN) >= 0;
                PluginCall pending = waiting;
                waiting = null;
                if (ready) { engine.setSpeechRate(1.05f); if (pending != null) say(pending); }
                else { if (pending != null) pending.reject("한국어 음성 엔진을 설치해 주세요."); engine.shutdown(); engine = null; }
            }));
        });
    }
    private void say(PluginCall call) {
        int result = engine.speak(call.getString("text", ""), TextToSpeech.QUEUE_FLUSH, null, "workout-coach");
        if (result == TextToSpeech.ERROR) call.reject("음성을 재생하지 못했어요."); else call.resolve();
    }
    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { stopSpeech(); call.resolve(); });
    }
    private void stopSpeech() {
        if (waiting != null) { waiting.resolve(); waiting = null; }
        if (engine != null) engine.stop();
    }
    @Override protected void handleOnPause() { stopSpeech(); }
    @Override protected void handleOnDestroy() { stopSpeech(); if (engine != null) engine.shutdown(); engine = null; ready = false; }
}

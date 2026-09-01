package app.helssu.twa;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class RendererRecoveryPolicyTest {
    private static final long NOW = 1_000_000L;

    @Test
    public void firstExitAllowsOneRestore() {
        RendererRecoveryPolicy.Decision d = RendererRecoveryPolicy.decide(0L, 0, NOW);
        assertEquals(RendererRecoveryPolicy.MODE_RESTORE_ONCE, d.mode);
        assertEquals(1, d.count);
    }

    @Test
    public void secondExitInsideFiveMinutesUsesSafeHome() {
        RendererRecoveryPolicy.Decision d = RendererRecoveryPolicy.decide(NOW - 1_000L, 1, NOW);
        assertEquals(RendererRecoveryPolicy.MODE_SAFE_HOME, d.mode);
        assertEquals(2, d.count);
    }

    @Test
    public void exitAtFiveMinuteBoundaryStartsNewWindow() {
        RendererRecoveryPolicy.Decision d = RendererRecoveryPolicy.decide(
            NOW - RendererRecoveryPolicy.WINDOW_MS,
            4,
            NOW
        );
        assertEquals(RendererRecoveryPolicy.MODE_RESTORE_ONCE, d.mode);
        assertEquals(1, d.count);
    }

    @Test
    public void backwardsClockStartsNewWindow() {
        RendererRecoveryPolicy.Decision d = RendererRecoveryPolicy.decide(NOW + 1L, 2, NOW);
        assertEquals(RendererRecoveryPolicy.MODE_RESTORE_ONCE, d.mode);
        assertEquals(1, d.count);
    }
}

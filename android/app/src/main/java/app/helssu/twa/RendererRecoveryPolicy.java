package app.helssu.twa;

final class RendererRecoveryPolicy {
    static final long WINDOW_MS = 5L * 60L * 1000L;
    static final String MODE_RESTORE_ONCE = "restore_once";
    static final String MODE_SAFE_HOME = "safe_home";

    static Decision decide(long previousAt, int previousCount, long now) {
        boolean sameWindow = previousAt > 0L && now >= previousAt && now - previousAt < WINDOW_MS;
        int count = sameWindow ? Math.max(1, previousCount) + 1 : 1;
        String mode = count >= 2 ? MODE_SAFE_HOME : MODE_RESTORE_ONCE;
        return new Decision(mode, count);
    }

    static final class Decision {
        final String mode;
        final int count;

        Decision(String mode, int count) {
            this.mode = mode;
            this.count = count;
        }
    }

    private RendererRecoveryPolicy() {}
}

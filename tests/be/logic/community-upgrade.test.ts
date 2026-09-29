import { describe, it, expect } from 'vitest';
import { validatePostInput } from '@/features/community/community';
import { readWorkoutSnapshot } from '@/features/community/workout-snapshot';
import { validCursor, feedView } from '@/features/community/feed-page';
describe('community workout sharing', () => {
  it('allows a verified workout without a photo, but rejects empty content', () => {
    expect(validatePostInput({ photoUrl: '', caption: '', hasWorkout: true }).ok).toBe(true);
    expect(validatePostInput({ photoUrl: '', caption: '' }).ok).toBe(false);
  });
  it('keeps URL and caption validation with a workout', () => {
    expect(validatePostInput({ photoUrl: 'javascript:alert(1)', caption: '', hasWorkout: true }).ok).toBe(false);
    expect(validatePostInput({ photoUrl: '', caption: 'x'.repeat(201), hasWorkout: true }).ok).toBe(false);
  });
  it('reads only public workout fields and omits unknown counts', () => {
    expect(readWorkoutSnapshot({ date: '2026-09-29', durationSec: -1, weight: 70, notes: 'private', exercises: [{ name: '벤치프레스', sets: null, weight: 100 }] })).toEqual({ date: '2026-09-29', durationSec: null, exercises: [{ name: '벤치프레스', sets: null }] });
  });
  it('handles old and malformed records safely', () => {
    for (const value of [null, {}, [], { date: '2026-09-29', exercises: [null, 1, { name: 42 }] }]) expect(readWorkoutSnapshot(value)).toBeNull();
  });
  it('rejects malformed cursors and constrains views', () => {
    expect(feedView('admin')).toBe('workout');
    expect(validCursor({ id: 'x', kind: 'photo', created_at: 'invalid', score: 0 })).toBe(false);
    expect(validCursor({ id: '00000000-0000-4000-8000-000000000001', kind: 'photo', created_at: '2026-09-29T00:00:00Z', score: 0 })).toBe(true);
  });
});

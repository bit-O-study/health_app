import test from 'node:test';
import assert from 'node:assert/strict';
import { selectReviewedGuides } from './guide-review.mjs';

const artifact = { id: 'lat-pulldown', sourceSha256: 'a'.repeat(64), videoSha256: 'b'.repeat(64) };
const review = {
  ...artifact, status: 'passed', equipmentIds: ['machine'],
  sources: ['https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/'],
  checks: { exercise: 'Lat pulldown', equipment: 'High cable', setup: 'Thigh restraint',
    hands: 'Overhand closed grip', feet: 'Planted', movement: 'Bar to chest in front' },
};
test('unreviewed, rejected, incomplete, and unreferenced videos cannot be linked', () => {
  for (const reviews of [[], [{ ...review, status: 'rejected' }],
    [{ ...review, checks: { ...review.checks, movement: '' } }],
    [{ ...review, sources: [] }], [{ ...review, equipmentIds: [] }]]) {
    assert.deepEqual(selectReviewedGuides(reviews, [artifact]), []);
  }
});
test('a correct review links only its own exercise and exact source/video version', () => {
  assert.deepEqual(selectReviewedGuides([review], [artifact]), ['lat-pulldown']);
  for (const changed of [{ ...artifact, id: 'wide-grip-lat-pulldown' },
    { ...artifact, sourceSha256: 'c'.repeat(64) },
    { ...artifact, videoSha256: 'c'.repeat(64) }]) {
    assert.deepEqual(selectReviewedGuides([review], [changed]), []);
  }
});

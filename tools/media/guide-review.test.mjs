import test from 'node:test';
import assert from 'node:assert/strict';
import { selectReviewedDarkGuides, selectReviewedGuides } from './guide-review.mjs';

const artifact = { id: 'lat-pulldown', sourceSha256: 'a'.repeat(64), videoSha256: 'b'.repeat(64) };
const review = {
  id: artifact.id, status: 'passed', equipmentIds: ['lat-pulldown'],
  sourceSha256: artifact.sourceSha256, videoSha256: artifact.videoSha256,
  sources: ['https://example.com/reference'],
  checks: { exercise: 'ok', equipment: 'ok', setup: 'ok', hands: 'ok', feet: 'ok', movement: 'ok' },
};

test('only an exact passed light artifact is publishable', () => {
  assert.deepEqual(selectReviewedGuides([review], [artifact]), ['lat-pulldown']);
  assert.deepEqual(selectReviewedGuides([{ ...review, status: 'rejected' }], [artifact]), []);
  assert.deepEqual(selectReviewedGuides([review], [{ ...artifact, id: 'wide-grip-lat-pulldown' }]), []);
  assert.deepEqual(selectReviewedGuides([review], [{ ...artifact, sourceSha256: 'c'.repeat(64) }]), []);
  assert.deepEqual(selectReviewedGuides([review], [{ ...artifact, videoSha256: 'c'.repeat(64) }]), []);
});

test('all review evidence is required', () => {
  assert.deepEqual(selectReviewedGuides([{ ...review, sources: [] }], [artifact]), []);
  assert.deepEqual(selectReviewedGuides([{ ...review, equipmentIds: [] }], [artifact]), []);
  assert.deepEqual(selectReviewedGuides([{ ...review, checks: { ...review.checks, hands: '' } }], [artifact]), []);
});

test('cutout generation keeps light published and gates dark by its exact review', () => {
  const dark = { ...artifact, darkVideoSha256: 'd'.repeat(64) };
  const darkReview = { ...review, darkVideoSha256: dark.darkVideoSha256 };
  assert.deepEqual(selectReviewedGuides([review], [dark]), ['lat-pulldown']);
  assert.deepEqual(selectReviewedDarkGuides([review], [dark]), []);
  assert.deepEqual(selectReviewedDarkGuides([darkReview], [dark]), ['lat-pulldown']);
  assert.deepEqual(selectReviewedDarkGuides([darkReview], [artifact]), []);
  assert.deepEqual(selectReviewedDarkGuides([darkReview], [{ ...dark, darkVideoSha256: 'e'.repeat(64) }]), []);
});

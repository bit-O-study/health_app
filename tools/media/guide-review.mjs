export const REVIEW_CHECKS = ['exercise', 'equipment', 'setup', 'hands', 'feet', 'movement'];

// A review belongs to exact source and video bytes, not just an exercise name.
export function selectReviewedGuides(reviews, artifacts) {
  return artifacts.filter(artifact => reviews.some(review =>
    review.id === artifact.id &&
    review.status === 'passed' &&
    Array.isArray(review.equipmentIds) && review.equipmentIds.length > 0 &&
    review.sourceSha256 === artifact.sourceSha256 &&
    review.videoSha256 === artifact.videoSha256 &&
    typeof review.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(review.sourceSha256) &&
    typeof review.videoSha256 === 'string' && /^[a-f0-9]{64}$/.test(review.videoSha256) &&
    Array.isArray(review.sources) && review.sources.length > 0 &&
    review.sources.every(url => typeof url === 'string' && url.startsWith('https://')) &&
    REVIEW_CHECKS.every(key => typeof review.checks?.[key] === 'string' && review.checks[key].trim())
  )).map(artifact => artifact.id);
}

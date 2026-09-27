export const REVIEW_CHECKS = ['exercise', 'equipment', 'setup', 'hands', 'feet', 'movement'];

function hasValidReview(review, artifact) {
  return review.id === artifact.id &&
    review.status === 'passed' &&
    Array.isArray(review.equipmentIds) && review.equipmentIds.length > 0 &&
    review.sourceSha256 === artifact.sourceSha256 &&
    review.videoSha256 === artifact.videoSha256 &&
    typeof review.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(review.sourceSha256) &&
    typeof review.videoSha256 === 'string' && /^[a-f0-9]{64}$/.test(review.videoSha256) &&
    Array.isArray(review.sources) && review.sources.length > 0 &&
    review.sources.every(url => typeof url === 'string' && url.startsWith('https://')) &&
    REVIEW_CHECKS.every(key => typeof review.checks?.[key] === 'string' && review.checks[key].trim());
}

export function selectReviewedGuides(reviews, artifacts) {
  return artifacts.filter(artifact => reviews.some(review => hasValidReview(review, artifact)))
    .map(artifact => artifact.id);
}

export function selectReviewedDarkGuides(reviews, artifacts) {
  return artifacts.filter(artifact =>
    typeof artifact.darkVideoSha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(artifact.darkVideoSha256) &&
    reviews.some(review => hasValidReview(review, artifact) && review.darkVideoSha256 === artifact.darkVideoSha256)
  ).map(artifact => artifact.id);
}

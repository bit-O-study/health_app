import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';

// Evidence index only. Never approve, replace or classify public video quality.
const roots = ['tools/media/imports/cutout-all-20261007-a', 'tools/media/imports/cutout-all-20261007-b'];
const progress = JSON.parse(readFileSync('tools/media/motion-refresh/all-exercises-progress.json', 'utf8'));
const entries = progress.entries.filter(x => x.status === 'needs-cutout-review').map(x => ({
  id: x.id, sourceSha256: x.sourceSha256, evidence: [],
}));
for (const root of roots) {
  for (const name of readdirSync(root)) {
    const path = `${root}/${name}`;
    if (!name.endsWith('.json') || !statSync(path).isFile()) continue;
    const value = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
    const rows = Array.isArray(value) ? value : Array.isArray(value.results) ? value.results : [value];
    for (const row of rows) {
      const entry = entries.find(x => x.id === row.id);
      const status = String(row.status ?? row.review ?? row.decision ?? '');
      if (!entry || !/hold|fail/i.test(status)) continue;
      const sourceSha256 = row.sourceSha256 ?? row.evidence?.sourceSha256;
      entry.evidence.push({ path, status, sourceSha256: sourceSha256 ?? null,
        sourceMatches: sourceSha256 ? sourceSha256 === entry.sourceSha256 : null,
        reason: row.reason ?? row.notes ?? row.findings ?? null });
    }
  }
}
const report = { generatedAt: new Date().toISOString(),
  scope: 'Index of candidate failures. Entries may contain earlier attempts; inspect referenced evidence and source hashes before repair. Not a publication or motion-quality approval.',
  nextAction: 'Use a different repair approach or remake faulty sources; do not repeat unchanged failed segmentation. Missing evidence requires manual lookup.',
  total: entries.length, indexed: entries.filter(x => x.evidence.length).length, entries };
writeFileSync('tools/media/imports/all-exercises-20261007/cutout-holds.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ total: report.total, indexed: report.indexed, missing: entries.filter(x => !x.evidence.length).map(x => x.id) }));

# Local exercise video candidates

These are review candidates, not approved replacements for app videos.
Scripts, generation prompts, review decisions and verification JSON belong in Git.
PNG/JPG originals, MP4 videos and cutout caches stay locally under imports/.gitignore.
Ignored files are not deleted.

- low-bar-individual/: 16 individually generated low-bar squat poses.
- wrist-curl-16/: 16-pose behind-the-back wrist curl sheet.
- review.json records remaining quality issues. Playback success does not approve form.
- generation.json records exact built-in image_gen prompts and local original paths.
- verification.json, playback-*.json and foot-anchors.json are evidence snapshots.

Run from project root:

```sh
node tools/media/imports/exercise-video-20260925/serve-gallery.mjs
```

Preview: http://127.0.0.1:3188/?exercise=wrist-candidate
Low-bar preview: http://127.0.0.1:3188/?exercise=candidate

The gallery requires the local candidate and approved MP4 files. A fresh checkout
has no ignored images or videos. Preserve source PNG files when moving the workspace.
Each render.mjs recreates isolated tools/ and public/ trees using the original local
generator paths recorded in generation.json, FFmpeg and tools/media/.venv-cutout.
Candidate rendering does not publish app manifests.

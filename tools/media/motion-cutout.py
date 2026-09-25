"""운동 포즈 시트 → 패널별 누끼 → 운동모드 배경색(라이트/다크) 포즈 이미지.

사용: motion-cutout.py <sheet.jpg> <panels 8|16> <out_dir>
- out_dir/cut/<원본 sha 12자>/<n>.png  누끼 캐시(원본이 같으면 모델을 다시 돌리지 않는다)
- out_dir/poses-light/<n>.jpg          #fafafa (운동모드 bg-zinc-50)
- out_dir/poses-dark/<n>.jpg           #09090b (dark:bg-zinc-950) + 옅은 윤곽광
패널 좌표는 manage-motion-guides.mjs 의 기존 크롭과 같다(칸마다 4px 안쪽).
"""
import hashlib
import json
import os
import shutil
import sys
import time
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

SIZE = 480
MARGIN = 0.06  # 8/16장 공통 영역 둘레 여백
BG = {"light": "#fafafa", "dark": "#09090b"}
RIM = (212, 212, 216)  # 다크 전용 윤곽광 색(zinc-300 계열)
RIM_OPACITY = 0.45
DEFAULT_MODEL = "birefnet-general"
MODEL = os.environ.get("MOTION_CUTOUT_MODEL", DEFAULT_MODEL)


def panel_boxes(width, height, panels):
    rows = panels // 4
    for i in range(panels):
        col, row = i % 4, i // 4
        yield (round(col * width / 4) + 4, round(row * height / rows) + 4,
               round((col + 1) * width / 4) - 4, round((row + 1) * height / rows) - 4)


def cutouts(sheet_path, panels, out):
    sha = hashlib.sha256(sheet_path.read_bytes()).hexdigest()[:12]
    # 모델이 다르면 누끼 결과도 다르므로 캐시를 섞지 않는다(기본 모델은 기존 경로 유지)
    cut_dir = out / "cut" / (sha if MODEL == DEFAULT_MODEL else f"{MODEL}-{sha}")
    paths = [cut_dir / f"{i + 1}.png" for i in range(panels)]
    with Image.open(sheet_path) as sheet:
        boxes = list(panel_boxes(*sheet.size, panels))
    pending = []
    for index, (path, box) in enumerate(zip(paths, boxes)):
        try:
            with Image.open(path) as cached:
                valid = cached.format == 'PNG' and cached.mode == 'RGBA' and cached.size == (box[2] - box[0], box[3] - box[1])
                cached.verify()
            if valid:
                continue
        except (OSError, SyntaxError):
            pass
        pending.append((index, path, box))
    print(json.dumps({'cachedPanels': panels - len(pending), 'pendingPanels': len(pending)}), flush=True)
    if pending:
        import onnxruntime

        # GPU 환경(onnxruntime-gpu[cuda,cudnn])은 pip 로 받은 CUDA/cuDNN DLL 을 먼저 올려야 CUDA 로 돈다
        # TensorRT 는 목록에 떠도 라이브러리가 없어 실패·지연되므로 CUDA → DirectML → CPU 만 쓴다
        available = onnxruntime.get_available_providers()
        providers = ["CPUExecutionProvider"]
        if "DmlExecutionProvider" in available:  # onnxruntime-directml: 드라이버 CUDA 버전과 무관하게 윈도우 GPU 사용
            providers.insert(0, "DmlExecutionProvider")
        if "CUDAExecutionProvider" in available:
            if hasattr(onnxruntime, "preload_dlls"):
                onnxruntime.preload_dlls()
            providers.insert(0, "CUDAExecutionProvider")
        from rembg import new_session, remove  # 캐시가 있으면 모델(1GB)을 올리지 않는다

        cut_dir.mkdir(parents=True, exist_ok=True)
        session = new_session(MODEL, providers=providers)
        print(json.dumps({"providers": session.inner_session.get_providers()}), flush=True)
        with Image.open(sheet_path) as source:
            sheet = source.convert("RGB")
        for index, path, box in pending:
            started = time.monotonic()
            temporary = path.with_suffix('.tmp.png')
            remove(sheet.crop(box), session=session, post_process_mask=True).save(temporary)
            temporary.replace(path)
            print(json.dumps({'panel': index + 1, 'seconds': round(time.monotonic() - started, 2)}), flush=True)
    return sha, [Image.open(p).convert("RGBA") for p in paths]


def compose(cuts, theme):
    # 모든 패널을 같은 상자로 잘라야 사람·기구 위치가 흔들리지 않는다
    boxes = [c.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox() for c in cuts]
    boxes = [b for b in boxes if b]
    if not boxes:
        raise SystemExit("cutout found no subject")
    left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
    right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
    scale = SIZE / (max(right - left, bottom - top) * (1 + 2 * MARGIN))
    cx, cy = (left + right) / 2, (top + bottom) / 2
    for cut in cuts:
        canvas = Image.new("RGB", (SIZE, SIZE), BG[theme])
        scaled = cut.resize((round(cut.width * scale), round(cut.height * scale)), Image.LANCZOS)
        pos = (round(SIZE / 2 - cx * scale), round(SIZE / 2 - cy * scale))
        if theme == "dark":
            alpha = Image.new("L", (SIZE, SIZE), 0)
            alpha.paste(scaled.getchannel("A"), pos)
            # 실루엣 바깥 2~3px 띠만 옅게 밝혀 검은 원판·신발이 배경에 묻히지 않게 한다
            grown = alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.6))
            band = ImageChops.subtract(grown, alpha).point(lambda v: round(v * RIM_OPACITY))
            canvas = Image.composite(Image.new("RGB", (SIZE, SIZE), RIM), canvas, band)
        canvas.paste(scaled, pos, scaled)
        yield canvas


def main():
    sheet_path, panels, out = Path(sys.argv[1]), int(sys.argv[2]), Path(sys.argv[3])
    if panels not in (8, 16):
        raise SystemExit("panels must be 8 or 16")
    sha, cuts = cutouts(sheet_path, panels, out)
    for theme in BG:
        dest = out / f"poses-{theme}"
        shutil.rmtree(dest, ignore_errors=True)
        dest.mkdir(parents=True)
        for i, pose in enumerate(compose(cuts, theme)):
            pose.save(dest / f"{i + 1}.jpg", quality=94)
    print(json.dumps({"sourceSha12": sha, "panels": panels}))


if __name__ == "__main__":
    main()

import hashlib
import importlib.util
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from PIL import Image

spec = importlib.util.spec_from_file_location('motion_cutout', Path(__file__).with_name('motion-cutout.py'))
cutout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutout)


class ResumeCutoutTests(unittest.TestCase):
    def test_partial_cache_preserves_completed_panels_and_repairs_corruption(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sheet = root / 'sheet.png'
            Image.new('RGB', (160, 80), 'gray').save(sheet)
            cache = root / 'out' / 'cut' / hashlib.sha256(sheet.read_bytes()).hexdigest()[:12]
            cache.mkdir(parents=True)
            saved = cache / '1.png'
            Image.new('RGBA', (32, 32), 'red').save(saved)
            original = saved.read_bytes()
            (cache / '2.png').write_bytes(b'partial PNG')
            Image.new('RGBA', (2, 2), 'blue').save(cache / '3.png')
            factory = Mock(return_value=types.SimpleNamespace(inner_session=types.SimpleNamespace(get_providers=lambda: ['CPUExecutionProvider'])))
            remove = Mock(side_effect=lambda image, **kwargs: image.convert('RGBA'))
            modules = {'rembg': types.SimpleNamespace(new_session=factory, remove=remove), 'onnxruntime': types.SimpleNamespace(get_available_providers=lambda: ['CPUExecutionProvider'])}
            with patch.dict(sys.modules, modules), patch.object(cutout, 'MODEL', cutout.DEFAULT_MODEL):
                _, images = cutout.cutouts(sheet, 8, root / 'out')
                self.assertEqual(remove.call_count, 7)
                self.assertEqual(saved.read_bytes(), original)
                for image in images:
                    image.close()
                factory.reset_mock()
                remove.reset_mock()
                _, images = cutout.cutouts(sheet, 8, root / 'out')
                factory.assert_not_called()
                remove.assert_not_called()
                self.assertEqual(len(images), 8)
                for image in images:
                    image.close()


if __name__ == '__main__':
    unittest.main()

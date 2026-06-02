# -*- coding: utf-8 -*-
"""OCR测试脚本 - 测试多种OCR方案识别"卧虎藏龙"图片"""

import time
import os
import sys
import tempfile

IMAGE_PATH = r"C:\Users\13558\Desktop\8f7a01a6-9e35-4520-90ad-ddd1c5453a20.png"
EXPECTED = "卧虎藏龙"
TMP_DIR = tempfile.gettempdir()

results = []

def check_result(text, expected):
    if not text:
        return False
    return expected in text

# ==================== 测试1: Windows OCR ====================
print("=" * 60)
print("Test 1: Windows OCR (winocr)")
try:
    import asyncio
    from PIL import Image
    import winocr

    async def run_winocr():
        img = Image.open(IMAGE_PATH)
        result = await winocr.recognize_pil(img, 'zh-Hans-CN')
        return result.text

    start = time.time()
    text = asyncio.run(run_winocr())
    elapsed = time.time() - start

    found = check_result(text, EXPECTED)
    results.append({"name": "Windows OCR", "found": found, "text": text.strip()[:50], "time": f"{elapsed:.2f}s"})
    print(f"  Result: {'SUCCESS' if found else 'FAILED'}")
    print(f"  Text: {text.strip()[:50]}")
    print(f"  Time: {elapsed:.2f}s")
except Exception as e:
    results.append({"name": "Windows OCR", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试2: Windows OCR (放大) ====================
print("\n" + "=" * 60)
print("Test 2: Windows OCR (scaled 4x)")
try:
    import asyncio
    import cv2
    import numpy as np
    from PIL import Image
    import winocr

    async def run_winocr_scaled():
        img = cv2.imread(IMAGE_PATH)
        scaled = cv2.resize(img, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
        path = os.path.join(TMP_DIR, 'scaled_win.png')
        cv2.imwrite(path, scaled)
        pil_img = Image.open(path)
        result = await winocr.recognize_pil(pil_img, 'zh-Hans-CN')
        return result.text

    start = time.time()
    text = asyncio.run(run_winocr_scaled())
    elapsed = time.time() - start

    found = check_result(text, EXPECTED)
    results.append({"name": "Windows OCR(4x)", "found": found, "text": text.strip()[:50], "time": f"{elapsed:.2f}s"})
    print(f"  Result: {'SUCCESS' if found else 'FAILED'}")
    print(f"  Text: {text.strip()[:50]}")
    print(f"  Time: {elapsed:.2f}s")
except Exception as e:
    results.append({"name": "Windows OCR(4x)", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试3: Windows OCR (8x放大+锐化) ====================
print("\n" + "=" * 60)
print("Test 3: Windows OCR (scaled 8x + sharpen)")
try:
    import asyncio
    import cv2
    from PIL import Image, ImageFilter
    import winocr

    async def run_winocr_hd():
        img = cv2.imread(IMAGE_PATH)
        scaled = cv2.resize(img, None, fx=8, fy=8, interpolation=cv2.INTER_CUBIC)
        path = os.path.join(TMP_DIR, 'scaled_win_hd.png')
        cv2.imwrite(path, scaled)
        pil_img = Image.open(path)
        pil_img = pil_img.filter(ImageFilter.SHARPEN)
        result = await winocr.recognize_pil(pil_img, 'zh-Hans-CN')
        return result.text

    start = time.time()
    text = asyncio.run(run_winocr_hd())
    elapsed = time.time() - start

    found = check_result(text, EXPECTED)
    results.append({"name": "Windows OCR(8x+锐化)", "found": found, "text": text.strip()[:50], "time": f"{elapsed:.2f}s"})
    print(f"  Result: {'SUCCESS' if found else 'FAILED'}")
    print(f"  Text: {text.strip()[:50]}")
    print(f"  Time: {elapsed:.2f}s")
except Exception as e:
    results.append({"name": "Windows OCR(8x+锐化)", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试4: PaddleOCR ====================
print("\n" + "=" * 60)
print("Test 4: PaddleOCR")
try:
    from paddleocr import PaddleOCR

    start = time.time()
    ocr = PaddleOCR(use_angle_cls=True, lang='ch', use_gpu=False, show_log=False)
    result = ocr.ocr(IMAGE_PATH, cls=True)
    text = ' '.join([line[1][0] for line in result[0]]) if result and result[0] else ""
    elapsed = time.time() - start

    found = check_result(text, EXPECTED)
    results.append({"name": "PaddleOCR", "found": found, "text": text.strip()[:50], "time": f"{elapsed:.2f}s"})
    print(f"  Result: {'SUCCESS' if found else 'FAILED'}")
    print(f"  Text: {text.strip()[:50]}")
    print(f"  Time: {elapsed:.2f}s")
except Exception as e:
    results.append({"name": "PaddleOCR", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试5: PaddleOCR (放大) ====================
print("\n" + "=" * 60)
print("Test 5: PaddleOCR (scaled 4x)")
try:
    from paddleocr import PaddleOCR
    import cv2

    start = time.time()
    img = cv2.imread(IMAGE_PATH)
    scaled = cv2.resize(img, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    path = os.path.join(TMP_DIR, 'scaled_paddle.png')
    cv2.imwrite(path, scaled)

    ocr = PaddleOCR(use_angle_cls=True, lang='ch', use_gpu=False, show_log=False)
    result = ocr.ocr(path, cls=True)
    text = ' '.join([line[1][0] for line in result[0]]) if result and result[0] else ""
    elapsed = time.time() - start

    found = check_result(text, EXPECTED)
    results.append({"name": "PaddleOCR(4x)", "found": found, "text": text.strip()[:50], "time": f"{elapsed:.2f}s"})
    print(f"  Result: {'SUCCESS' if found else 'FAILED'}")
    print(f"  Text: {text.strip()[:50]}")
    print(f"  Time: {elapsed:.2f}s")
except Exception as e:
    results.append({"name": "PaddleOCR(4x)", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试6: Tesseract.js (via Node) ====================
print("\n" + "=" * 60)
print("Test 6: Tesseract.js (Node.js)")
try:
    import subprocess
    import base64

    with open(IMAGE_PATH, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()

    js_code = f"""
    const Tesseract = require('tesseract.js');
    (async () => {{
        const result = await Tesseract.recognize(Buffer.from('{img_b64}', 'base64'), 'chi_sim+eng');
        console.log(result.data.text);
    }})();
    """

    js_path = os.path.join(TMP_DIR, 'ocr_test.js')
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js_code)

    start = time.time()
    result = subprocess.run(
        ['node', js_path],
        capture_output=True, text=True, timeout=60,
        cwd=r"I:\vs code project\douban auto-stared"
    )
    text = result.stdout.strip()
    elapsed = time.time() - start

    found = check_result(text, EXPECTED)
    results.append({"name": "Tesseract.js", "found": found, "text": text[:50], "time": f"{elapsed:.2f}s"})
    print(f"  Result: {'SUCCESS' if found else 'FAILED'}")
    print(f"  Text: {text[:50]}")
    print(f"  Time: {elapsed:.2f}s")
except Exception as e:
    results.append({"name": "Tesseract.js", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试7: Tesseract.js (放大) ====================
print("\n" + "=" * 60)
print("Test 7: Tesseract.js (scaled 4x)")
try:
    import subprocess
    import base64
    import cv2

    img = cv2.imread(IMAGE_PATH)
    scaled = cv2.resize(img, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    path = os.path.join(TMP_DIR, 'scaled_tess.png')
    cv2.imwrite(path, scaled)

    with open(path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()

    js_code = f"""
    const Tesseract = require('tesseract.js');
    (async () => {{
        const result = await Tesseract.recognize(Buffer.from('{img_b64}', 'base64'), 'chi_sim+eng');
        console.log(result.data.text);
    }})();
    """

    js_path = os.path.join(TMP_DIR, 'ocr_test2.js')
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js_code)

    start = time.time()
    result = subprocess.run(
        ['node', js_path],
        capture_output=True, text=True, timeout=60,
        cwd=r"I:\vs code project\douban auto-stared"
    )
    text = result.stdout.strip()
    elapsed = time.time() - start

    found = check_result(text, EXPECTED)
    results.append({"name": "Tesseract.js(4x)", "found": found, "text": text[:50], "time": f"{elapsed:.2f}s"})
    print(f"  Result: {'SUCCESS' if found else 'FAILED'}")
    print(f"  Text: {text[:50]}")
    print(f"  Time: {elapsed:.2f}s")
except Exception as e:
    results.append({"name": "Tesseract.js(4x)", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试8: Claude Vision API ====================
print("\n" + "=" * 60)
print("Test 8: Claude Vision API (Sonnet)")
try:
    import base64
    import json
    import urllib.request

    with open(IMAGE_PATH, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()

    # 使用免费的Claude API (需要API key)
    # 这里跳过，因为需要付费API key
    results.append({"name": "Claude Vision", "found": False, "text": "需要API key", "time": "N/A"})
    print("  Skipped: 需要API key")
except Exception as e:
    results.append({"name": "Claude Vision", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试9: Gemini Vision API ====================
print("\n" + "=" * 60)
print("Test 9: Gemini Vision API")
try:
    results.append({"name": "Gemini Vision", "found": False, "text": "需要API key", "time": "N/A"})
    print("  Skipped: 需要API key")
except Exception as e:
    results.append({"name": "Gemini Vision", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 测试10: GPT-4V Vision ====================
print("\n" + "=" * 60)
print("Test 10: GPT-4V Vision")
try:
    results.append({"name": "GPT-4V Vision", "found": False, "text": "需要API key", "time": "N/A"})
    print("  Skipped: 需要API key")
except Exception as e:
    results.append({"name": "GPT-4V Vision", "found": False, "text": str(e)[:40], "time": "N/A"})
    print(f"  Error: {e}")

# ==================== 输出汇总 ====================
print("\n")
print("=" * 70)
print("OCR TEST RESULTS - Image: 8f7a01a6...png (84x49px)")
print("Expected text: " + EXPECTED)
print("=" * 70)
print(f"{'No.':<5} {'OCR Method':<25} {'Result':<10} {'Time':<10} {'Recognized Text'}")
print("-" * 70)

for i, r in enumerate(results, 1):
    status = "SUCCESS" if r["found"] else "FAILED"
    print(f"{i:<5} {r['name']:<25} {status:<10} {r['time']:<10} {r['text']}")

print("-" * 70)
success_count = sum(1 for r in results if r["found"])
print(f"Success rate: {success_count}/{len(results)} ({success_count/len(results)*100:.0f}%)")

# 推荐
print("\n" + "=" * 70)
print("RECOMMENDATION:")
print("=" * 70)
if success_count > 0:
    best = [r for r in results if r["found"]][0]
    print(f"Best option: {best['name']} (Time: {best['time']})")
else:
    print("No OCR method successfully recognized the text.")
    print("This image is very small (84x49px). Consider:")
    print("1. Using a larger image")
    print("2. Using cloud-based AI vision APIs")
    print("3. Pre-processing the image (resize, sharpen)")

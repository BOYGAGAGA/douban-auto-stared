# -*- coding: utf-8 -*-
import sys
import os
import time
import base64
import tempfile

sys.stdout.reconfigure(encoding='utf-8')

IMAGE = r"C:\Users\13558\Desktop\8f7a01a6-9e35-4520-90ad-ddd1c5453a20.png"
EXPECTED = "卧虎藏龙"
TMP = tempfile.gettempdir()

results = []

def ok(text):
    return EXPECTED in (text or "")

# Test 1: Windows OCR
print("=" * 60)
print("[1] Windows OCR (原始)")
try:
    import asyncio, winocr
    from PIL import Image
    async def run():
        r = await winocr.recognize_pil(Image.open(IMAGE), 'zh-Hans-CN')
        return r.text
    t0 = time.time()
    text = asyncio.run(run())
    dt = time.time() - t0
    results.append({"n": "Windows OCR", "ok": ok(text), "t": text.strip()[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text.strip()[:40]}")
except Exception as e:
    results.append({"n": "Windows OCR", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 2: Windows OCR (放大4x)
print("\n[2] Windows OCR (4x放大)")
try:
    import asyncio, winocr, cv2
    from PIL import Image
    async def run():
        img = cv2.imread(IMAGE)
        big = cv2.resize(img, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
        p = os.path.join(TMP, 'w4.png')
        cv2.imwrite(p, big)
        r = await winocr.recognize_pil(Image.open(p), 'zh-Hans-CN')
        return r.text
    t0 = time.time()
    text = asyncio.run(run())
    dt = time.time() - t0
    results.append({"n": "Windows OCR 4x", "ok": ok(text), "t": text.strip()[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text.strip()[:40]}")
except Exception as e:
    results.append({"n": "Windows OCR 4x", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 3: Windows OCR (放大8x+锐化)
print("\n[3] Windows OCR (8x+锐化)")
try:
    import asyncio, winocr, cv2
    from PIL import Image, ImageFilter
    async def run():
        img = cv2.imread(IMAGE)
        big = cv2.resize(img, None, fx=8, fy=8, interpolation=cv2.INTER_CUBIC)
        p = os.path.join(TMP, 'w8.png')
        cv2.imwrite(p, big)
        pil = Image.open(p).filter(ImageFilter.SHARPEN)
        r = await winocr.recognize_pil(pil, 'zh-Hans-CN')
        return r.text
    t0 = time.time()
    text = asyncio.run(run())
    dt = time.time() - t0
    results.append({"n": "Windows OCR 8x+", "ok": ok(text), "t": text.strip()[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text.strip()[:40]}")
except Exception as e:
    results.append({"n": "Windows OCR 8x+", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 4: Windows OCR (放大16x)
print("\n[4] Windows OCR (16x放大)")
try:
    import asyncio, winocr, cv2
    from PIL import Image, ImageFilter
    async def run():
        img = cv2.imread(IMAGE)
        big = cv2.resize(img, None, fx=16, fy=16, interpolation=cv2.INTER_CUBIC)
        p = os.path.join(TMP, 'w16.png')
        cv2.imwrite(p, big)
        pil = Image.open(p).filter(ImageFilter.SHARPEN)
        r = await winocr.recognize_pil(pil, 'zh-Hans-CN')
        return r.text
    t0 = time.time()
    text = asyncio.run(run())
    dt = time.time() - t0
    results.append({"n": "Windows OCR 16x", "ok": ok(text), "t": text.strip()[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text.strip()[:40]}")
except Exception as e:
    results.append({"n": "Windows OCR 16x", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 5: Tesseract.js (Node.js)
print("\n[5] Tesseract.js (原始)")
try:
    import subprocess
    with open(IMAGE, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    js = f"const T=require('tesseract.js');(async()=>{{const r=await T.recognize(Buffer.from('{b64}','base64'),'chi_sim+eng');console.log(r.data.text)}})();"
    p = os.path.join(TMP, 'ocr1.js')
    with open(p, 'w') as f: f.write(js)
    t0 = time.time()
    r = subprocess.run(['node', p], capture_output=True, text=True, timeout=120, cwd=r"I:\vs code project\douban auto-stared")
    dt = time.time() - t0
    text = r.stdout.strip()
    results.append({"n": "Tesseract.js", "ok": ok(text), "t": text[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text[:40]}")
except Exception as e:
    results.append({"n": "Tesseract.js", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 6: Tesseract.js (4x放大)
print("\n[6] Tesseract.js (4x放大)")
try:
    import subprocess, cv2
    img = cv2.imread(IMAGE)
    big = cv2.resize(img, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    p1 = os.path.join(TMP, 't4.png')
    cv2.imwrite(p1, big)
    with open(p1, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    js = f"const T=require('tesseract.js');(async()=>{{const r=await T.recognize(Buffer.from('{b64}','base64'),'chi_sim+eng');console.log(r.data.text)}})();"
    p2 = os.path.join(TMP, 'ocr2.js')
    with open(p2, 'w') as f: f.write(js)
    t0 = time.time()
    r = subprocess.run(['node', p2], capture_output=True, text=True, timeout=120, cwd=r"I:\vs code project\douban auto-stared")
    dt = time.time() - t0
    text = r.stdout.strip()
    results.append({"n": "Tesseract.js 4x", "ok": ok(text), "t": text[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text[:40]}")
except Exception as e:
    results.append({"n": "Tesseract.js 4x", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 7: Tesseract.js (8x放大)
print("\n[7] Tesseract.js (8x放大)")
try:
    import subprocess, cv2
    img = cv2.imread(IMAGE)
    big = cv2.resize(img, None, fx=8, fy=8, interpolation=cv2.INTER_CUBIC)
    p1 = os.path.join(TMP, 't8.png')
    cv2.imwrite(p1, big)
    with open(p1, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    js = f"const T=require('tesseract.js');(async()=>{{const r=await T.recognize(Buffer.from('{b64}','base64'),'chi_sim+eng');console.log(r.data.text)}})();"
    p2 = os.path.join(TMP, 'ocr3.js')
    with open(p2, 'w') as f: f.write(js)
    t0 = time.time()
    r = subprocess.run(['node', p2], capture_output=True, text=True, timeout=120, cwd=r"I:\vs code project\douban auto-stared")
    dt = time.time() - t0
    text = r.stdout.strip()
    results.append({"n": "Tesseract.js 8x", "ok": ok(text), "t": text[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text[:40]}")
except Exception as e:
    results.append({"n": "Tesseract.js 8x", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 8: PaddleOCR
print("\n[8] PaddleOCR")
try:
    from paddleocr import PaddleOCR
    t0 = time.time()
    ocr = PaddleOCR(use_angle_cls=True, lang='ch', use_gpu=False, show_log=False)
    res = ocr.ocr(IMAGE, cls=True)
    text = ' '.join([l[1][0] for l in res[0]]) if res and res[0] else ""
    dt = time.time() - t0
    results.append({"n": "PaddleOCR", "ok": ok(text), "t": text.strip()[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text.strip()[:40]}")
except Exception as e:
    results.append({"n": "PaddleOCR", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 9: PaddleOCR (4x放大)
print("\n[9] PaddleOCR (4x放大)")
try:
    from paddleocr import PaddleOCR
    import cv2
    img = cv2.imread(IMAGE)
    big = cv2.resize(img, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    p = os.path.join(TMP, 'p4.png')
    cv2.imwrite(p, big)
    t0 = time.time()
    ocr = PaddleOCR(use_angle_cls=True, lang='ch', use_gpu=False, show_log=False)
    res = ocr.ocr(p, cls=True)
    text = ' '.join([l[1][0] for l in res[0]]) if res and res[0] else ""
    dt = time.time() - t0
    results.append({"n": "PaddleOCR 4x", "ok": ok(text), "t": text.strip()[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text.strip()[:40]}")
except Exception as e:
    results.append({"n": "PaddleOCR 4x", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Test 10: EasyOCR
print("\n[10] EasyOCR")
try:
    import easyocr
    t0 = time.time()
    reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
    res = reader.readtext(IMAGE, detail=0)
    text = ' '.join(res)
    dt = time.time() - t0
    results.append({"n": "EasyOCR", "ok": ok(text), "t": text.strip()[:40], "s": f"{dt:.2f}s"})
    print(f"  -> {'OK' if ok(text) else 'FAIL'} | {text.strip()[:40]}")
except Exception as e:
    results.append({"n": "EasyOCR", "ok": False, "t": str(e)[:40], "s": "N/A"})
    print(f"  -> Error: {e}")

# Summary
print("\n" + "=" * 70)
print(f"{'No':<4} {'OCR方案':<20} {'结果':<8} {'耗时':<10} {'识别文字'}")
print("-" * 70)
for i, r in enumerate(results, 1):
    s = "OK" if r["ok"] else "FAIL"
    print(f"{i:<4} {r['n']:<20} {s:<8} {r['s']:<10} {r['t']}")
print("-" * 70)
ok_count = sum(1 for r in results if r["ok"])
print(f"Success: {ok_count}/{len(results)}")

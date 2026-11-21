"""
Генерирует кыргызскую озвучку для всех фраз приложения моделью Meta MMS-TTS
(facebook/mms-tts-kir, лицензия CC-BY-NC 4.0 — только некоммерческое использование).

    node scripts/speech-phrases.ts > phrases.json
    pip install torch transformers lameenc numpy
    python scripts/generate-audio.py phrases.json public/audio

Создаёт <hash>.mp3 и index.json {"фраза": "файл.mp3"}.
Уже существующие файлы не перегенерируются, поэтому любую фразу можно заменить
записью диктора с тем же именем файла.
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path

import lameenc
import numpy as np
import torch
from transformers import AutoTokenizer, VitsModel

# Можно указать локальную папку с моделью через переменную MMS_MODEL.
MODEL = os.environ.get("MMS_MODEL", "facebook/mms-tts-kir")


def normalize(text: str) -> str:
    # Должно совпадать с normalizeKey() в src/lib/speech.ts
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s-]", "", text.lower())).strip()


def file_name(key: str) -> str:
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:12] + ".mp3"


SEEDS = 8
GOOD_ENOUGH = 0.6
MIN_VOICED = 0.3


def voiced_ratio(wave: np.ndarray, rate: int) -> float:
    """Доля громких кадров с выраженным тоном 80–400 Гц (голос, а не шум/шипение)."""
    frame, hop = int(0.04 * rate), int(0.01 * rate)
    lo, hi = rate // 400, rate // 80
    peak = float(np.max(np.abs(wave))) or 1.0
    voiced = total = 0
    for start in range(0, len(wave) - frame, hop):
        f = wave[start: start + frame]
        if np.sqrt(np.mean(f ** 2)) < 0.02 * peak:
            continue
        f = f - f.mean()
        ac = np.correlate(f, f, "full")[frame - 1:]
        ac /= ac[0] + 1e-9
        total += 1
        voiced += ac[lo:hi].max() > 0.5
    return voiced / max(total, 1)


def to_mp3(wave: np.ndarray, rate: int) -> bytes:
    # Срезаем тишину по краям и слегка нормализуем громкость.
    idx = np.where(np.abs(wave) > 0.02)[0]
    if len(idx):
        pad = int(rate * 0.05)
        wave = wave[max(0, idx[0] - pad): idx[-1] + pad]
    peak = float(np.max(np.abs(wave))) or 1.0
    pcm = (wave / peak * 0.9 * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(pcm.tobytes()) + enc.flush()


def main() -> None:
    # В консоли Windows по умолчанию cp1251, где нет букв ө/ү/ң.
    sys.stdout.reconfigure(encoding="utf-8")
    phrases_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    phrases = json.loads(phrases_path.read_text(encoding="utf-8"))

    tokenizer = AutoTokenizer.from_pretrained(MODEL)
    model = VitsModel.from_pretrained(MODEL)
    model.eval()
    # Чуть медленнее, чем по умолчанию — для детей.
    model.speaking_rate = 0.85
    sr = model.config.sampling_rate

    index: dict[str, str] = {}
    rejected: list[str] = []
    for i, phrase in enumerate(phrases, 1):
        key = normalize(phrase)
        name = file_name(key)
        target = out_dir / name
        if target.exists():
            # Уже есть (в т.ч. запись живого диктора) — не трогаем.
            index[key] = name
            continue
        inputs = tokenizer(key, return_tensors="pt")
        if inputs["input_ids"].shape[-1] == 0:
            print(f"skip (no tokens): {phrase}")
            continue

        # Модель недетерминирована: пробуем несколько раз и берём самый «голосовой» вариант.
        best_wave, best_score = None, -1.0
        for seed in range(SEEDS):
            torch.manual_seed(seed)
            with torch.no_grad():
                wave = model(**inputs).waveform[0].numpy()
            score = voiced_ratio(wave, sr)
            if score > best_score:
                best_wave, best_score = wave, score
            if score >= GOOD_ENOUGH:
                break

        if best_score < MIN_VOICED:
            # Короткие слоги и отдельные буквы MMS не умеет: получается шипение.
            # Такие фразы приложение озвучит голосом браузера.
            rejected.append(key)
            print(f"[{i}/{len(phrases)}] REJECT {key} (voiced={best_score:.2f})")
            continue

        target.write_bytes(to_mp3(best_wave, sr))
        index[key] = name
        print(f"[{i}/{len(phrases)}] {key} -> {name} (voiced={best_score:.2f})")

    (out_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=0), encoding="utf-8"
    )
    print(f"done: {len(index)} clips, rejected {len(rejected)}: {', '.join(rejected)}")


if __name__ == "__main__":
    main()

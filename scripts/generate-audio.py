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
    # Чуть медленнее и стабильнее, чем по умолчанию — для детей.
    model.config.speaking_rate = 0.85
    model.speaking_rate = 0.85
    model.noise_scale = 0.5

    index: dict[str, str] = {}
    for i, phrase in enumerate(phrases, 1):
        key = normalize(phrase)
        name = file_name(key)
        index[key] = name
        target = out_dir / name
        if target.exists():
            continue
        inputs = tokenizer(key, return_tensors="pt")
        if inputs["input_ids"].shape[-1] == 0:
            print(f"skip (no tokens): {phrase}")
            continue
        torch.manual_seed(1)
        with torch.no_grad():
            wave = model(**inputs).waveform[0].numpy()
        target.write_bytes(to_mp3(wave, model.config.sampling_rate))
        print(f"[{i}/{len(phrases)}] {key} -> {name}")

    (out_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=0), encoding="utf-8"
    )
    print(f"done: {len(index)} phrases")


if __name__ == "__main__":
    main()

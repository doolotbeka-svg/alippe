/**
 * Печатает JSON-список всех фраз, которые приложение озвучивает.
 * Запуск: node scripts/speech-phrases.ts > phrases.json
 * (Node 22.18+ запускает .ts напрямую.)
 */
import {
  LETTER_LESSONS,
  letterSpeechText,
  numberToKyrgyz,
  PRAISE,
} from '../src/data/curriculum.ts';

const phrases = new Set<string>();

for (const lesson of LETTER_LESSONS) {
  phrases.add(letterSpeechText(lesson.id));
  lesson.syllables.forEach((s) => phrases.add(s));
  lesson.words.forEach((w) => phrases.add(w.word));
}
for (let n = 1; n <= 100; n++) phrases.add(numberToKyrgyz(n));
Object.values(PRAISE).forEach((p) => phrases.add(p));

process.stdout.write(JSON.stringify([...phrases], null, 2));

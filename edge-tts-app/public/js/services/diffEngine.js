// Pronunciation accuracy score (%) & word diff alignment engine

export function evaluatePronunciation(targetText, recognizedText) {
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"“”]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const targetWords = normalize(targetText).split(' ').filter(Boolean);
  const recognizedWords = normalize(recognizedText).split(' ').filter(Boolean);

  if (targetWords.length === 0) {
    return { score: 100, diff: [] };
  }

  const n = targetWords.length;
  const m = recognizedWords.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (targetWords[i - 1] === recognizedWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  let i = n;
  let j = m;
  const diffResults = [];
  let correctCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && targetWords[i - 1] === recognizedWords[j - 1]) {
      diffResults.unshift({ type: 'correct', word: targetWords[i - 1] });
      correctCount++;
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      diffResults.unshift({ type: 'missing', word: targetWords[i - 1], said: recognizedWords[j - 1] });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      diffResults.unshift({ type: 'missing', word: targetWords[i - 1] });
      i--;
    } else {
      diffResults.unshift({ type: 'extra', word: recognizedWords[j - 1] });
      j--;
    }
  }

  const score = Math.max(0, Math.round((correctCount / targetWords.length) * 100));

  let grade = 'Needs Practice';
  let gradeColor = '#e63946';
  if (score >= 90) {
    grade = 'Excellent / Mastered';
    gradeColor = '#2a9d8f';
  } else if (score >= 75) {
    grade = 'Very Good';
    gradeColor = '#e07a5f';
  } else if (score >= 50) {
    grade = 'Good Attempt';
    gradeColor = '#f4a261';
  }

  return {
    score,
    grade,
    gradeColor,
    correctCount,
    totalTargetWords: targetWords.length,
    diff: diffResults
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

function cleanLine(line: string): string {
  return line
    .replace(/^[-*\d.]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function stripLabel(line: string, match: RegExpMatchArray): string {
  return line.slice(match[0].length).trim();
}

export function parseFaqFromMarkdown(content: string): FaqItem[] {
  if (!content) return [];
  const normalized = content.replace(/\r\n/g, "\n");
  const faqHeadingMatch = normalized.match(/^##?\s*FAQ\s*$/im);
  if (!faqHeadingMatch) return [];

  const afterHeading = normalized.slice(faqHeadingMatch.index! + faqHeadingMatch[0].length);
  const nextHeadingMatch = afterHeading.match(/^##\s+/im);
  const block = nextHeadingMatch
    ? afterHeading.slice(0, nextHeadingMatch.index)
    : afterHeading;

  const items: FaqItem[] = [];
  const rawLines = block.split("\n");
  let currentQuestion: string | null = null;
  let currentAnswerLines: string[] = [];

  const flush = () => {
    if (currentQuestion && currentAnswerLines.length > 0) {
      items.push({
        question: cleanLine(currentQuestion),
        answer: currentAnswerLines.map((line) => cleanLine(line)).join(" ").trim(),
      });
    }
    currentQuestion = null;
    currentAnswerLines = [];
  };

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const cleaned = cleanLine(line);
    if (!cleaned) continue;

    const qMatch = cleaned.match(/^(?:Q[:\s]\s*|Question[:\s]\s*)/i);
    const aMatch = cleaned.match(/^(?:A[:\s]\s*|Réponse[:\s]\s*|Answer[:\s]\s*)/i);

    if (qMatch) {
      flush();
      currentQuestion = stripLabel(cleaned, qMatch);
    } else if (aMatch && currentQuestion) {
      currentAnswerLines.push(stripLabel(cleaned, aMatch));
    } else if (currentQuestion) {
      currentAnswerLines.push(cleaned);
    }
  }

  flush();
  return items;
}

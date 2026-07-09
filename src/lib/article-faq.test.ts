import { describe, expect, it } from "vitest";
import { parseFaqFromMarkdown } from "./article-faq";

describe("parseFaqFromMarkdown", () => {
  it("returns empty array when no FAQ heading exists", () => {
    expect(parseFaqFromMarkdown("## Introduction\n\nContenu sans FAQ.")).toEqual([]);
  });

  it("parses bold Q/A pairs under a FAQ heading", () => {
    const md = `## Contenu

## FAQ
**Q:** Question 1 ?
**A:** Réponse 1.

**Q:** Question 2 ?
**A:** Réponse 2.

## Suite
Autre contenu.`;

    expect(parseFaqFromMarkdown(md)).toEqual([
      { question: "Question 1 ?", answer: "Réponse 1." },
      { question: "Question 2 ?", answer: "Réponse 2." },
    ]);
  });

  it("collects multi-line answers until the next question", () => {
    const md = `## FAQ
Q: Question longue ?
A: Première ligne.
Deuxième ligne.
Troisième ligne.

Q: Question suivante ?
A: Réponse courte.`;

    expect(parseFaqFromMarkdown(md)).toEqual([
      {
        question: "Question longue ?",
        answer: "Première ligne. Deuxième ligne. Troisième ligne.",
      },
      { question: "Question suivante ?", answer: "Réponse courte." },
    ]);
  });

  it("handles list-formatted FAQ entries", () => {
    const md = `## FAQ
- **Q:** Premier item ?
- **A:** Réponse item.
- **Q:** Deuxième item ?
- **A:** Autre réponse.`;

    expect(parseFaqFromMarkdown(md)).toEqual([
      { question: "Premier item ?", answer: "Réponse item." },
      { question: "Deuxième item ?", answer: "Autre réponse." },
    ]);
  });

  it("supports French labels Question/Réponse", () => {
    const md = `## FAQ
Question: Question en français ?
Réponse: Réponse en français.`;

    expect(parseFaqFromMarkdown(md)).toEqual([
      {
        question: "Question en français ?",
        answer: "Réponse en français.",
      },
    ]);
  });

  it("returns empty array for FAQ heading without valid Q/A pairs", () => {
    expect(parseFaqFromMarkdown("## FAQ\n\nPas de questions ici.")).toEqual([]);
  });
});

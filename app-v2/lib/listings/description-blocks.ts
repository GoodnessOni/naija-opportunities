type DescriptionBlock =
  | { kind: "paragraph" | "heading"; text: string }
  | { kind: "list"; items: string[] };

const sentenceSegments = new Intl.Segmenter("en", { granularity: "sentence" });

export function descriptionBlocks(description: string): DescriptionBlock[] {
  const hasLineBreaks = description.includes("\n");
  const formatted = hasLineBreaks ? description : description
    .replace(/\s+(?=\*\s)/g, "\n")
    .replace(/\s+(WHAT YOU WILL FOCUS ON|WHAT WE ARE LOOKING FOR IN YOU|WHAT WE OFFER YOU|ABOUT CANONICAL)(?=\s|$)/g, "\n\n$1\n\n");

  const blocks: DescriptionBlock[] = [];
  for (const section of formatted.split(/\n{2,}/)) {
    for (const line of section.split("\n").map(value => value.trim()).filter(Boolean)) {
      const bullet = line.match(/^[*•-]\s+(.+)$/);
      if (bullet) {
        const previous = blocks.at(-1);
        if (previous?.kind === "list") previous.items.push(bullet[1]);
        else blocks.push({ kind: "list", items: [bullet[1]] });
      } else if (/^[A-Z][A-Z\s&/-]{5,79}$/.test(line)) {
        blocks.push({ kind: "heading", text: line });
      } else {
        const sentences = hasLineBreaks ? [line] : Array.from(sentenceSegments.segment(line), entry => entry.segment);
        for (let index = 0; index < sentences.length; index += 3) {
          blocks.push({ kind: "paragraph", text: sentences.slice(index, index + 3).join("").trim() });
        }
      }
    }
  }
  return blocks;
}

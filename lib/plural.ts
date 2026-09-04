/*
 * "1 BOOKS" was showing on the lists screens. Small, but it is the kind
 * of thing a reader notices immediately and quietly reads as sloppiness.
 *
 * Uppercase because every place this is used is one of the mono
 * caption labels the design uses for counts ("9 BOOKS · VIEW ONLY").
 * If a sentence-case version is ever needed, add it alongside rather
 * than lowercasing this one at the call site.
 */
export function countLabel(count: number, singular: string): string {
  const word = count === 1 ? singular : `${singular}S`;
  return `${count} ${word.toUpperCase()}`;
}

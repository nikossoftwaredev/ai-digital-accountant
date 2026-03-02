/** Strip markdown code fences from AI response before JSON.parse */
export const cleanJson = (raw: string): string => {
  let text = raw.trim();
  if (text.startsWith("```json")) text = text.slice(7);
  else if (text.startsWith("```")) text = text.slice(3);
  if (text.endsWith("```")) text = text.slice(0, -3);
  return text.trim();
};

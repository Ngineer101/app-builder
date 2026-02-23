export function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}

export function sseData(payload: any) {
  const line = typeof payload === "string" ? payload : JSON.stringify(payload);
  return `data: ${line}\n\n`;
}

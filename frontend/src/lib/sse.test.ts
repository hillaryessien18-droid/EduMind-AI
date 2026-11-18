import { parseSSE } from "./sse";

describe("parseSSE", () => {
  it("splits complete events and keeps the partial remainder", () => {
    const { events, rest } = parseSSE('event: delta\ndata: {"text":"Hi"}\n\nevent: done\ndata: {"a":1}\n\nevent: del');
    expect(events).toEqual([
      { event: "delta", data: '{"text":"Hi"}' },
      { event: "done", data: '{"a":1}' },
    ]);
    expect(rest).toBe("event: del");
  });
});

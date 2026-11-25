import { describe, expect, it } from "vitest";
import { createSingleFlight } from "./single-flight";

describe("createSingleFlight", () => {
  it("ignores a second call while the first is running", async () => {
    const flight = createSingleFlight();
    let release!: () => void;
    let runs = 0;
    const first = flight.run(() => new Promise<string>((r) => ((release = () => r("a")), runs++)));
    const second = await flight.run(async () => (runs++, "b"));
    expect(second).toBeNull();
    release();
    expect(await first).toBe("a");
    expect(runs).toBe(1);
  });

  it("allows a new call after the previous one settled, even if it failed", async () => {
    const flight = createSingleFlight();
    await expect(flight.run(async () => { throw new Error("x"); })).rejects.toThrow();
    expect(await flight.run(async () => "ok")).toBe("ok");
  });

  it("reports whether it is busy", async () => {
    const flight = createSingleFlight();
    let release!: () => void;
    const p = flight.run(() => new Promise<void>((r) => (release = r)));
    expect(flight.busy()).toBe(true);
    release();
    await p;
    expect(flight.busy()).toBe(false);
  });
});

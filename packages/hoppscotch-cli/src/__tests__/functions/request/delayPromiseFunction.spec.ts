import { afterEach, describe, expect, it, vi } from "vitest";
import { delayPromiseFunction } from "../../../utils/request";

describe("describePromiseFunction", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Should resolve the promise<number> after 2 seconds.", async () => {
    vi.useFakeTimers();
    const promiseFunc = vi.fn().mockResolvedValue(2);
    const result = delayPromiseFunction(promiseFunc, 2000);

    expect(promiseFunc).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1999);
    expect(promiseFunc).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(2);
    expect(promiseFunc).toHaveBeenCalledOnce();
  });

  it("Should resolve the promise<number> after 4 seconds.", async () => {
    vi.useFakeTimers();
    const promiseFunc = vi.fn().mockResolvedValue(2);
    const result = delayPromiseFunction(promiseFunc, 4000);

    expect(promiseFunc).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3999);
    expect(promiseFunc).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(2);
    expect(promiseFunc).toHaveBeenCalledOnce();
  });
});

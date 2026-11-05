import { describe, expect, it, vi } from "vitest";
import { ChangeNotifier } from "./changeNotifier";

describe("ChangeNotifier", () => {
	it("calls every subscribed listener on notify", () => {
		const notifier = new ChangeNotifier();
		const a = vi.fn();
		const b = vi.fn();
		notifier.subscribe(a);
		notifier.subscribe(b);
		notifier.notify();
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
	});

	it("stops calling a listener after it unsubscribes", () => {
		const notifier = new ChangeNotifier();
		const listener = vi.fn();
		const unsubscribe = notifier.subscribe(listener);
		unsubscribe();
		notifier.notify();
		expect(listener).not.toHaveBeenCalled();
		expect(notifier.size).toBe(0);
	});

	it("keeps notifying other listeners when one throws", () => {
		const notifier = new ChangeNotifier();
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const after = vi.fn();
		notifier.subscribe(() => {
			throw new Error("boom");
		});
		notifier.subscribe(after);
		notifier.notify();
		expect(after).toHaveBeenCalledTimes(1);
		errorSpy.mockRestore();
	});
});

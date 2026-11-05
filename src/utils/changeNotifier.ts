export type Unsubscribe = () => void;

/** Minimal listener set used to tell open views that the recent-files list changed. */
export class ChangeNotifier {
	private readonly listeners = new Set<() => void>();

	subscribe(listener: () => void): Unsubscribe {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	notify(): void {
		for (const listener of [...this.listeners]) {
			try {
				listener();
			} catch (error) {
				console.error("Recent Files Bases: listener failed", error);
			}
		}
	}

	get size(): number {
		return this.listeners.size;
	}
}

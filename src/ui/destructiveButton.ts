import { requireApiVersion, type ButtonComponent } from "obsidian";

/**
 * Styles a button as destructive. `setDestructive()` arrived in Obsidian 1.13.0 and replaces the
 * deprecated `setWarning()`, which is still the only option on 1.10 to 1.12.
 */
export function markDestructive(button: ButtonComponent): ButtonComponent {
	if (requireApiVersion("1.13.0")) return button.setDestructive();
	// eslint-disable-next-line @typescript-eslint/no-deprecated -- fallback for Obsidian 1.10 to 1.12
	return button.setWarning();
}

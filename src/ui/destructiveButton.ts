import { requireApiVersion, type ButtonComponent } from "obsidian";

/**
 * Styles a button as destructive. `setDestructive()` arrived in Obsidian 1.13.0. Older versions
 * only offer the deprecated `setWarning()`, which the community directory scan rejects, so the
 * fallback applies the same `mod-warning` class that `setWarning()` adds.
 */
export function markDestructive(button: ButtonComponent): ButtonComponent {
	if (requireApiVersion("1.13.0")) return button.setDestructive();
	button.buttonEl.addClass("mod-warning");
	return button;
}

import { Modal, Setting, type App } from "obsidian";

export interface ConfirmOptions {
	title: string;
	message: string;
	confirmText: string;
	onConfirm: () => void | Promise<void>;
}

/** A two-button confirmation dialog for destructive actions. Cancel is the default focus. */
export class ConfirmModal extends Modal {
	private readonly options: ConfirmOptions;

	constructor(app: App, options: ConfirmOptions) {
		super(app);
		this.options = options;
	}

	onOpen(): void {
		const { title, message, confirmText, onConfirm } = this.options;
		this.titleEl.setText(title);
		this.contentEl.createEl("p", { text: message });

		new Setting(this.contentEl)
			.addButton((button) => {
				button.setButtonText("Cancel").onClick(() => this.close());
				button.buttonEl.focus();
			})
			.addButton((button) =>
				button
					.setButtonText(confirmText)
					.setWarning()
					.onClick(async () => {
						this.close();
						await onConfirm();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

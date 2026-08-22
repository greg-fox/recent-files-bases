import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts"],
			// These wire up to a live Obsidian app (DOM rendering, PluginSettingTab, Plugin
			// lifecycle) and can't run under Node; their logic is factored into the pure,
			// fully-tested modules they call into instead.
			exclude: ["src/main.ts", "src/ui/**", "src/bases/recentFilesBasesView.ts", "src/types.ts"],
		},
	},
});


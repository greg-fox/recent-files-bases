import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			// The obsidian package has no runtime; tests load a small stub instead.
			obsidian: decodeURIComponent(new URL("./src/__mocks__/obsidian.ts", import.meta.url).pathname),
		},
	},
	test: {
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts"],
			// These render DOM (settings tab, Bases view) and can't run under Node; their logic is
			// factored into the pure, fully-tested modules they call into instead.
			exclude: ["src/ui/**", "src/bases/recentFilesBasesView.ts", "src/types.ts", "src/__mocks__/**"],
		},
	},
});


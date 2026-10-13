const esbuild = require("esbuild");
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
    const context = await esbuild.context({
        entryPoints: ["src/extension.ts"],

        bundle: true,
        platform: "node",
        format: "cjs",
        target: "node20",
        outfile: "dist-bundle/extension.js",
        external: [ "vscode" ],
        minify: production,
        sourcemap: production ? false : "linked",
        sourcesContent: false,
        logLevel: "info",
        loader: {".wasm": "file"},
        assetNames: "assets/[name]-[hash]"
    });

    if (watch) {
        await context.watch();
        console.log("Extension Host bundle watch started.");

        return;
    }

    await context.rebuild();
    await context.dispose();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});

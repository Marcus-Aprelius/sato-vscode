const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

const options = {
    entryPoints: ["src/webview/client/index.ts"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    outfile: "dist/webviewClient.js",
    sourcemap: false,
    minify: false,
    logLevel: "info"
};

if (watch) {
    esbuild
        .context(options)
        .then((ctx) => ctx.watch())
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
} else {
    esbuild
        .build(options)
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

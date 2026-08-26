import * as fs from "fs";
import * as path from "path";

import { execFileSync } from "child_process";
import { createTemporaryDirectory, removeTemporaryDirectory } from "./tempDirectory";

export function tryInspectCsrWithOpenSsl(
    content: string | Uint8Array,
    encoding: "PEM" | "DER" = "PEM"
): Record<string, string> | undefined {
    let tmp = "";

    try {
        tmp = createTemporaryDirectory("sato-csr-");

        const csrPath = path.join(tmp, encoding === "DER" ? "request.p10" : "request.csr");

        fs.writeFileSync(csrPath, typeof content === "string" ? content : Buffer.from(content) );

        const output = execFileSync(
            "openssl",
            ["req", "-inform", encoding, "-in", csrPath, "-text", "-noout"],
            {encoding: "utf8", timeout: 5000, windowsHide: true}
        );

        return {
            Details: output
        };
    } catch {
        return undefined;
    } finally {
        removeTemporaryDirectory(tmp);
    }
}

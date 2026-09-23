import { escapeHtml } from "./htmlUtils";

export function renderModals(
    logoSrc: string,
    toolbarLogoSrc: string,
    versionLabel: string
): string {
    return `
<div class="modal-backdrop" id="modal-backdrop">
    <div class="modal" id="unlock-modal" style="width:360px;">
        <div class="modal-title">Unlock Database</div>
        <div class="modal-body">
            <label>
                Master password

                <div class="unlock-password-field">
                    <input type="password" id="unlock-password" autocomplete="new-password"/>
                    <span id="unlock-layout" class="keyboard-layout-indicator">ENG</span>
                </div>
            </label>

            <div class="empty" id="unlock-error" style="display:none;"></div>
        </div>

        <div class="modal-footer unlock-modal-footer">
            <div id="unlock-capslock-warning" class="capslock-warning" style="display:none;">Caps Lock is ON</div>

            <div class="unlock-modal-actions">
                <button type="button" class="btn" id="unlock-cancel">Cancel</button>
                <button type="button" class="btn primary" id="unlock-ok">OK</button>
            </div>
        </div>
    </div>

    <div class="modal" id="crypto-unlock-modal" style="width:420px;">
        <div class="modal-title" id="crypto-unlock-title">Unlock Crypto Container</div>

        <div class="modal-body">
            <label>
                <span id="crypto-unlock-password-label">Container password</span>
                <div class="unlock-password-field">
                    <input type="password" id="crypto-unlock-password" autocomplete="new-password"/>
                    <span id="crypto-unlock-layout" class="keyboard-layout-indicator">ENG</span>
                </div>
            </label>

            <div id="crypto-unlock-key-row" style="display:none;">
                <label>
                    OpenPGP private key

                    <div class="row">
                        <input type="text" id="crypto-unlock-key-path" placeholder="Select private-key.asc" readonly/>
                        <button type="button" class="btn" id="crypto-unlock-key-browse">Browse</button>
                    </div>
                </label>
            </div>

            <div class="empty" id="crypto-unlock-error" style="display:none;"></div>
        </div>

        <div class="modal-footer unlock-modal-footer">
            <div id="crypto-unlock-capslock-warning" class="capslock-warning" style="display:none;">Caps Lock is ON</div>

            <div class="unlock-modal-actions">
                <button type="button" class="btn" id="crypto-unlock-cancel">Cancel</button>
                <button type="button" class="btn primary" id="crypto-unlock-ok">OK</button>
            </div>
        </div>
    </div>

    <div class="modal" id="entry-modal">
        <div class="modal-title" id="entry-modal-title">New Entry</div>
        <div class="modal-body">
            <label>Title <input type="text" id="ef-title" /></label>
            <label>Username <input type="text" id="ef-username" /></label>
            <label>Password
                <div class="row">
                    <input type="password" id="ef-password" />
                    <button type="button" class="btn" id="ef-toggle">Show</button>
                    <button type="button" class="btn" id="ef-generate">Generate</button>
                </div>
                <div class="strength" id="ef-strength"><div class="strength-bar" id="ef-strength-bar"></div><span id="ef-strength-label"></span></div>
            </label>
            <label>URL <input type="text" id="ef-url" /></label>
            <label>Notes <textarea id="ef-notes" rows="4"></textarea></label>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn" id="ef-cancel">Cancel</button>
            <button type="button" class="btn primary" id="ef-save">Save</button>
        </div>
    </div>

    <div class="modal" id="gen-modal">
        <div class="modal-title modal-title-with-close">
            <div>
                <img class="toolbar-logo" src="${toolbarLogoSrc}" alt="SATO" title="SATO by Marcus Aprelius"/>Password Generator
            </div>
            <button type="button" class="converter-close-button" id="gen-header-close" title="Close" aria-label="Close">
                <span class="codicon codicon-close" aria-hidden="true"></span>
            </button>
        </div>
        <div class="modal-body">
            <label>Length: <span id="gen-length-val">20</span>
                <input type="range" id="gen-length" min="4" max="64" value="20" />
            </label>
            <label class="checkbox"><input type="checkbox" id="gen-upper" checked> Uppercase (A-Z)</label>
            <label class="checkbox"><input type="checkbox" id="gen-lower" checked> Lowercase (a-z)</label>
            <label class="checkbox"><input type="checkbox" id="gen-digits" checked> Numbers (0-9)</label>
            <label class="checkbox"><input type="checkbox" id="gen-symbols" checked> Special characters</label>
            <label>Generated password
                <div class="row">
                    <input type="text" id="gen-output" readonly />
                    <button type="button" class="btn" id="gen-regen" title="Regenerate">↻</button>
                </div>
                <div class="strength">
                    <div class="strength-bar" id="gen-strength-bar"></div>
                    <span id="gen-strength-label"></span>
                </div>
            </label>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn" id="gen-close">Close</button>
            <button type="button" class="btn primary" id="gen-copy">Copy</button>
        </div>
    </div>

    <div class="modal settings-modal" id="settings-modal">
        <div class="modal-title modal-title-with-close">
            <div>
                <img class="toolbar-logo" src="${toolbarLogoSrc}" alt="SATO" title="SATO by Marcus Aprelius"/>Settings
            </div>
            <button type="button" class="converter-close-button" id="settings-header-close" title="Close" aria-label="Close">
                <span class="codicon codicon-close" aria-hidden="true"></span>
            </button>
        </div>

        <div class="settings-tabs">
            <button type="button" class="settings-tab active" id="settings-tab-general">General</button>
            <button type="button" class="settings-tab" id="settings-tab-password-generator">Password Generator</button>
        </div>

        <div class="modal-body settings-tab-content" id="settings-content-general">

            <label class="settings-number-row">
                <span>Auto-lock timeout (minutes, 0 = disabled)</span>
                <input type="number" id="s-autolock" min="0" max="240" step="1"/>
            </label>

            <label class="settings-number-row">
                <span>Clipboard clear timeout (seconds, 0 = disabled)</span>
                <input type="number" id="s-clipclear" min="0" max="600" step="5"/>
            </label>

            <label class="checkbox"><input type="checkbox" id="s-confirmdel">Confirm before delete</label>
            <label class="checkbox"><input type="checkbox" id="s-showpw">Show passwords by default</label>
            <label class="checkbox"><input type="checkbox" id="s-showempty">Show empty values by default</label>

        </div>

        <div class="modal-body settings-tab-content" id="settings-content-password-generator" style="display:none;">
            <label class="settings-number-row">
                <span>Password generator length</span>
                <input type="number" id="s-genlen" min="4" max="128" step="1"/>
            </label>
        </div>

        <div class="modal-footer">
            <button type="button" class="btn" id="s-cancel">Cancel</button>
            <button type="button" class="btn primary" id="s-save">Save</button>
        </div>
    </div>

    <div class="modal dbinfo-modal" id="dbinfo-modal">
        <div class="modal-title modal-title-with-close" id="dbinfo-title">
            <span id="dbinfo-title-label">Database Info</span>
            <button type="button" class="converter-close-button" id="dbinfo-header-close" title="Close" aria-label="Close">
                <span class="codicon codicon-close" aria-hidden="true"></span>
            </button>
        </div>
            <div class="modal-body" id="dbinfo-body">
                <div class="empty">Loading…</div>
            </div>
        <div class="modal-footer">
            <button type="button" class="btn primary" id="dbinfo-close">Close</button>
        </div>
    </div>

    <div class="modal about-modal" id="about-modal">
        <div class="modal-title modal-title-with-close">
            <div>
                <img class="toolbar-logo" src="${toolbarLogoSrc}" alt="SATO" title="SATO by Marcus Aprelius"/>[SATO] Secure Access Task Operator
            </div>
            <button type="button" class="converter-close-button" id="about-header-close" title="Close" aria-label="Close">
                <span class="codicon codicon-close" aria-hidden="true"></span>
            </button>
        </div>

        <div class="about-tabs">
            <button type="button" class="about-tab active" id="about-tab-about">About</button>
            <button type="button" class="about-tab" id="about-tab-supported-formats">Supported Formats</button>
        </div>

        <div class="modal-body" id="about-content" style="align-items:center; text-align:center; gap:8px; padding:16px;">
        <img class="about-logo" src="${logoSrc}" alt="SATO logo" />
            <div>
                VS Code extension for viewing<br>
                <button type="button" class="about-inline-link" id="about-open-supported-formats">secure storage and cryptographic files</button>
            </div>

            <div class="about-spacer"></div>
            <div class="about-version">
                <span>
                    Version: <span id="about-version-value">${escapeHtml(versionLabel)}</span>
                </span>

                <button type="button" class="icon-btn" id="about-version-copy" title="Copy Version" aria-label="Copy Version">
                    <span class="codicon codicon-copy"></span>
                </button>
            </div>
            <div class="about-spacer"></div>
            <div style="margin-top:12px;">
                © 2026
                <a href="https://github.com/Marcus-Aprelius/sato-vscode"
                    target="_blank" rel="noopener noreferrer" style="color: var(--vscode-textLink-foreground); text-decoration:none;">
                    Marcus-Aprelius
                </a>
            </div>
        </div>

        <div class="modal-body" id="supported-formats-content" style="display:none; align-items:center; padding:16px;">
        <img class="about-logo" src="${logoSrc}" alt="SATO logo" />
            <div class="about-supports">
                <div class="about-supports-row">
                    <strong>Vaults:</strong>
                    <span>.kdbx .psafe3 .ibak .1pif .bcup</span>
                </div>

                <div class="about-supports-row">
                    <strong>SSH:</strong>
                    <span>id_rsa id_ecdsa id_ed25519</span>
                </div>

                <div class="about-supports-row">
                    <strong>Files:</strong>

                    <div class="about-formats-list">
                        <span>.crt .cer .der .pem .csr .p10 .key .gpg .pgp</span>
                        <span>.rsa .ppk .pub .pk8 .p12 .pfx .sig .asc .age</span>
                        <span>.ec  .p8  .p7b .p7c .p7s .p7m .spc .jks .jceks</span>
                    </div>
                </div>

            </div>
        </div>

        <div class="modal-footer">
            <button type="button" class="btn primary" id="about-close">Close</button>
        </div>
    </div>

    <div class="modal converter-modal" id="converter-modal">
        <div class="modal-title converter-modal-title">
            <div class="converter-modal-title-content">
                <img class="toolbar-logo" src="${toolbarLogoSrc}" alt="SATO" title="SATO by Marcus Aprelius"/>Converter

                <button type="button" class="converter-close-button" id="converter-close" title="Close" aria-label="Close">
                    <span class="codicon codicon-close" aria-hidden="true"></span>
                </button>
            </div>
        </div>

        <div class="converter-tabs" id="converter-tabs">
            <button type="button" class="converter-tab active" id="converter-tab-convert" title="Convert the selected file to another supported format" aria-label="Convert the selected file to another supported format">Convert</button>
            <button type="button" class="converter-tab" id="converter-tab-extract" title="Extract available content from the selected file" aria-label="Extract available content from the selected file">Extract</button>
            <button type="button" class="converter-tab" id="converter-tab-base64" title="Encode or decode Base64 text" aria-label="Encode or decode Base64 text">Base64</button>
        </div>

        <div class="modal-body converter-modal-body">
            <div id="converter-file-content">
                <div class="converter-columns">
                <section class="converter-section">
                    <div class="converter-section-header">
                        <h3 title="The source file will not be modified">Source</h3>
                        <button type="button" class="btn" id="converter-source-browse" title="Select source file">Select</button>
                    </div>

                    <div id="converter-source-details">

                        <div class="converter-field converter-field-copy">
                            <span class="converter-label">File</span>
                            <span class="converter-value" id="converter-source-file"></span>
                            <button type="button" class="icon-btn converter-copy-source" data-copy-source="converter-source-file" title="Copy File" aria-label="Copy File">
                                <span class="codicon codicon-copy"></span>
                            </button>
                        </div>

                        <div class="converter-field converter-field-copy">
                            <span class="converter-label">Type</span>
                            <span class="converter-value" id="converter-source-type"></span>
                            <button type="button" class="icon-btn converter-copy-source" data-copy-source="converter-source-type" title="Copy Type" aria-label="Copy Type">
                                <span class="codicon codicon-copy"></span>
                            </button>
                        </div>

                        <div class="converter-field converter-field-copy">
                            <span class="converter-label">Format</span>
                            <span class="converter-value" id="converter-source-format"></span>
                            <button type="button" class="icon-btn converter-copy-source" data-copy-source="converter-source-format" title="Copy Format" aria-label="Copy Format">
                                <span class="codicon codicon-copy"></span>
                            </button>
                        </div>

                        <div class="converter-field converter-field-copy">
                            <span class="converter-label">Subject</span>
                            <span class="converter-value" id="converter-source-subject"></span>
                            <button type="button" class="icon-btn converter-copy-source" data-copy-source="converter-source-subject" title="Copy Subject" aria-label="Copy Subject">
                                <span class="codicon codicon-copy"></span>
                            </button>
                        </div>

                        <div class="converter-field converter-field-copy">
                            <span class="converter-label">Issuer</span>
                            <span class="converter-value" id="converter-source-issuer"></span>
                            <button type="button" class="icon-btn converter-copy-source" data-copy-source="converter-source-issuer" title="Copy Issuer" aria-label="Copy Issuer">
                                <span class="codicon codicon-copy"></span>
                            </button>
                        </div>

                        <div class="converter-field converter-field-copy">
                            <span class="converter-label">Valid to</span>
                            <span class="converter-value" id="converter-source-valid-to"></span>
                            <button type="button" class="icon-btn converter-copy-source" data-copy-source="converter-source-valid-to" title="Copy Valid to" aria-label="Copy Valid to">
                                <span class="codicon codicon-copy"></span>
                            </button>
                        </div>

                        <div class="converter-field converter-field-copy">
                            <span class="converter-label">SHA-256</span>
                            <span class="converter-value" id="converter-source-sha256"></span>
                            <button type="button" class="icon-btn converter-copy-source" data-copy-source="converter-source-sha256" title="Copy SHA-256" aria-label="Copy SHA-256">
                                <span class="codicon codicon-copy"></span>
                            </button>
                        </div>

                    </div>
                </section>

                <section class="converter-section" id="converter-output-section">
                <h3 id="converter-output-title" title="Click [Convert] to create the output file">Destination</h3>

                    <label class="converter-input-field">Format
                        <select id="converter-output-format">
                            <option value="PEM">PEM</option>
                            <option value="DER">DER</option>
                        </select>
                    </label>

                    <div class="converter-input-field">
                        <span>File path</span>

                        <div class="converter-path-row">
                            <input type="text" id="converter-output-file-path" autocomplete="off"/>
                            <button type="button" class="btn converter-browse-btn" id="converter-output-file-path-browse">Browse</button>
                        </div>
                    </div>

                    <div class="converter-input-field">
                        <span>File name</span>

                        <div class="converter-file-name-row">
                            <input type="text" id="converter-output-file-name" autocomplete="off"/>
                            <button type="button" class="icon-btn converter-copy-btn" id="converter-output-file-name-copy" title="Copy File Name" aria-label="Copy File Name">
                                <span class="codicon codicon-copy"></span>
                            </button>
                        </div>
                    </div>

                </section>
            </div>
        </div>

        <div id="converter-base64-content" style="display:none;">
            <div class="base64-toolbar">
                <label class="base64-option">Operation
                    <select id="base64-operation">
                        <option value="encode">Encode</option>
                        <option value="decode">Decode</option>
                    </select>
                </label>

                <label class="base64-option">Format
                    <select id="base64-format">
                        <option value="base64url" selected>Base64URL</option>
                        <option value="base64">Base64</option>
                        <option value="base32">Base32</option>
                        <option value="base32hex">Base32hex</option>
                        <option value="hex">Hex</option>
                    </select>
                </label>

                <button type="button" class="btn primary" id="base64-live-mode" title="Disable automatic Base64 conversion" aria-label="Disable automatic Base64 conversion" aria-pressed="true">Live Mode: ON</button>
                <button type="button" class="btn" id="base64-swap" title="Swap input and output" aria-label="Swap input and output">⇄</button>
            </div>

            <div class="base64-columns">
                <section class="base64-section">
                    <div class="base64-section-header">
                        <h3>Input</h3>
                        <div class="base64-section-actions">
                            <button type="button" class="btn" id="base64-paste">Paste</button>
                            <button type="button" class="btn" id="base64-clear">Clear</button>
                        </div>
                    </div>
                    <textarea id="base64-input" class="base64-textarea" spellcheck="false" placeholder="Enter text or Base64 data"></textarea>
                    <div class="base64-character-count" id="base64-input-count">0 characters</div>
                </section>

                <section class="base64-section">
                    <div class="base64-section-header">
                        <h3>Output</h3>
                        <button type="button" class="btn" id="base64-copy">Copy</button>
                    </div>
                    <textarea id="base64-output" class="base64-textarea" spellcheck="false" placeholder="Result" readonly></textarea>
                    <div class="base64-character-count" id="base64-output-count">0 characters</div>
                </section>
            </div>

            <div class="base64-message" id="base64-message">Encoding transforms data but does not encrypt or protect it.</div>
            <div class="base64-error" id="base64-error" style="display:none;"></div>
        </div>
    </div>

    <div class="modal-footer">
            <button type="button" class="btn" id="converter-cancel">Cancel</button>
            <button type="button" class="btn primary" id="converter-convert">Convert</button>
        </div>
    </div>

</div>`;

}

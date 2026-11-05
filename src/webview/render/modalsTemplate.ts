import { escapeHtml } from "./htmlUtils";

import {
    ARCHIVE_FILE_EXTENSIONS,
    CRYPTO_FILE_EXTENSIONS,
    PASSWORD_VAULT_EXTENSIONS,
    SSH_KEY_FILE_NAMES
} from "../../fileFormats";

export function renderModals(
    logoSrc: string,
    toolbarLogoSrc: string,
    versionLabel: string
): string {
    const vaultFormats = formatExtensionList(PASSWORD_VAULT_EXTENSIONS);
    const archiveFormats = formatExtensionList(ARCHIVE_FILE_EXTENSIONS);
    const cryptoFormats = formatExtensionList(CRYPTO_FILE_EXTENSIONS);
    const sshFormats = SSH_KEY_FILE_NAMES.map(fileName => escapeHtml(fileName)).join(" ");
    const backupFormat = escapeHtml(".<EXT>.bak");

    return `
<div class="modal-backdrop" id="modal-backdrop">
    <div class="modal" id="unlock-modal" style="width:360px;">
        <div class="modal-title">Unlock Database</div>
        <div class="modal-body">
            <label>
                Master password

                <div class="unlock-password-row">
                    <div class="unlock-password-field unlock-password-input">
                        <input type="password" id="unlock-password" autocomplete="current-password"/>
                        <span id="unlock-layout" class="keyboard-layout-indicator">ENG</span>
                    </div>

                    <button type="button" class="icon-btn archive-password-toggle" id="unlock-password-toggle" title="Show password" aria-label="Show password" aria-pressed="false">
                        <span class="codicon codicon-eye" aria-hidden="true"></span>
                    </button>
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

                <div class="crypto-unlock-password-row">
                    <div class="unlock-password-field crypto-unlock-password-input">
                        <input type="password" id="crypto-unlock-password" autocomplete="current-password"/>
                        <span id="crypto-unlock-layout" class="keyboard-layout-indicator">ENG</span>
                    </div>

                    <button type="button" class="icon-btn archive-password-toggle" id="crypto-unlock-password-toggle" title="Show password" aria-label="Show password" aria-pressed="false">
                        <span class="codicon codicon-eye" aria-hidden="true"></span>
                    </button>
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

    <div class="modal" id="archive-unlock-modal" style="width:420px;">
        <div class="modal-title">Unlock Archive</div>

        <div class="modal-body">

            <label>Archive password
                <div class="unlock-password-field">
                    <input type="password" id="archive-unlock-password" autocomplete="new-password"/>
                    <span id="archive-unlock-layout" class="keyboard-layout-indicator">ENG</span>
                </div>
            </label>

            <div class="empty" id="archive-unlock-error" style="display:none;"></div>
        </div>

        <div class="modal-footer unlock-modal-footer">
            <div id="archive-unlock-capslock-warning" class="capslock-warning" style="display:none;">Caps Lock is ON</div>

            <div class="unlock-modal-actions">
                <button type="button" class="btn" id="archive-unlock-cancel">Cancel</button>
                <button type="button" class="btn primary" id="archive-unlock-ok">Unlock</button>
            </div>
        </div>

    </div>

    <div class="modal" id="archive-password-modal" style="width:520px;">
        <div class="modal-title" id="archive-password-title">Change Archive Password</div>
        <div class="modal-body">

        <label>New password

            <div class="archive-password-row">
                <div class="unlock-password-field archive-password-input">
                    <input type="password" id="archive-new-password" autocomplete="new-password"/>
                    <span id="archive-new-password-layout" class="keyboard-layout-indicator">ENG</span>
                </div>

                <button type="button" class="icon-btn archive-password-toggle" id="archive-new-password-toggle" title="Show password" aria-label="Show password" aria-pressed="false">
                    <span class="codicon codicon-eye" aria-hidden="true"></span>
                </button>

                <button type="button" class="btn" id="archive-password-generate" title="Generate a password using the configured password generator length">Generate</button>
            </div>
        </label>

        <label>Confirm new password

            <div class="archive-password-row">
                <div class="unlock-password-field archive-password-input">
                    <input type="password" id="archive-confirm-password" autocomplete="new-password"/>
                    <span id="archive-confirm-password-layout" class="keyboard-layout-indicator">ENG</span>
                </div>

                <button type="button" class="icon-btn archive-password-toggle" id="archive-confirm-password-toggle" title="Show password" aria-label="Show password" aria-pressed="false">
                    <span class="codicon codicon-eye" aria-hidden="true"></span>
                </button>

                <div class="archive-password-action-spacer" aria-hidden="true"></div>
            </div>
        </label>

            <div class="archive-password-strength-row" id="archive-password-strength-row">

                <div class="strength" id="archive-password-strength" style="visibility:hidden;">
                    <div class="strength-bar" id="archive-password-strength-bar"></div>
                    <span id="archive-password-strength-label"></span>
                </div>

                <div class="archive-password-toggle-spacer" aria-hidden="true"></div>
                <div class="archive-password-action-spacer" aria-hidden="true"></div>
            </div>

            <div class="empty" id="archive-password-error" style="display:none;"></div>
        </div>

        <div class="modal-footer unlock-modal-footer">
            <div id="archive-password-capslock-warning" class="capslock-warning" style="display:none;">Caps Lock is ON</div>
            <div class="unlock-modal-actions">
                <button type="button" class="btn" id="archive-password-cancel">Cancel</button>
                <button type="button" class="btn primary" id="archive-password-save">Change Password</button>
            </div>
        </div>

    </div>

    <div class="modal" id="private-key-password-modal" style="width:520px;">
        <div class="modal-title" id="private-key-password-title">Change Private Key Password</div>

        <div class="modal-body">
            <label id="private-key-current-password-row">
                Current password

                <div class="archive-password-row">
                    <div class="unlock-password-field archive-password-input">
                        <input type="password" id="private-key-current-password" autocomplete="current-password"/>
                        <span id="private-key-current-password-layout" class="keyboard-layout-indicator">ENG</span>
                    </div>

                    <button type="button" class="icon-btn archive-password-toggle" id="private-key-current-password-toggle" title="Show password" aria-label="Show password" aria-pressed="false">
                        <span class="codicon codicon-eye" aria-hidden="true"></span>
                    </button>
                    <div class="archive-password-action-spacer" aria-hidden="true"></div>
                </div>
            </label>

            <label>
                New password

                <div class="archive-password-row">
                    <div class="unlock-password-field archive-password-input">
                        <input type="password" id="private-key-new-password" autocomplete="new-password"/>
                        <span id="private-key-new-password-layout" class="keyboard-layout-indicator">ENG</span>
                    </div>

                    <button type="button" class="icon-btn archive-password-toggle" id="private-key-new-password-toggle" title="Show password" aria-label="Show password" aria-pressed="false">
                        <span class="codicon codicon-eye" aria-hidden="true"></span>
                    </button>

                    <button type="button" class="btn" id="private-key-password-generate" title="Generate a password using the configured password generator length">
                        Generate
                    </button>
                </div>
            </label>

            <label>
                Confirm new password

                <div class="archive-password-row">
                    <div class="unlock-password-field archive-password-input">
                        <input type="password" id="private-key-confirm-password" autocomplete="new-password"/>
                        <span id="private-key-confirm-password-layout" class="keyboard-layout-indicator">ENG</span>
                    </div>
                    <button type="button" class="icon-btn archive-password-toggle" id="private-key-confirm-password-toggle" title="Show password" aria-label="Show password" aria-pressed="false">
                        <span class="codicon codicon-eye" aria-hidden="true"></span>
                    </button>
                    <div class="archive-password-action-spacer" aria-hidden="true"></div>
                </div>
            </label>

            <div class="archive-password-strength-row" id="private-key-password-strength-row">
                <div class="strength" id="private-key-password-strength" style="visibility:hidden;">
                    <div class="strength-bar" id="private-key-password-strength-bar"></div>
                    <span id="private-key-password-strength-label"></span>
                </div>
                <div class="archive-password-toggle-spacer" aria-hidden="true"></div>
                <div class="archive-password-action-spacer" aria-hidden="true"></div>
            </div>

            <div class="empty" id="private-key-password-error" style="display:none;"></div>
        </div>

        <div class="modal-footer unlock-modal-footer">
            <div id="private-key-password-capslock-warning" class="capslock-warning" style="display:none;">Caps Lock is ON</div>
            <div class="unlock-modal-actions">
                <button type="button" class="btn" id="private-key-password-cancel">Cancel</button>
                <button type="button" class="btn primary" id="private-key-password-save">Change Password</button>
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
        <div class="modal-footer password-generator-footer">
            <div class="password-generator-actions">
                <button type="button" class="btn" id="gen-show-qr" disabled>Show QR</button>
                <button type="button" class="btn primary" id="gen-copy">Copy</button>
            </div>
            <button type="button" class="btn" id="gen-close">Close</button>
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
            <button type="button" class="settings-tab" id="settings-tab-general">General</button>
            <button type="button" class="settings-tab" id="settings-tab-converter">Converter</button>
            <button type="button" class="settings-tab" id="settings-tab-password-generator">Generator</button>
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

            <label class="settings-number-row"><span>Theme</span>
                <select id="s-theme">
                    <option value="vscode">VS Code Theme</option>
                    <option value="dark">Dark</option>
                    <option value="gray">Gray</option>
                    <option value="light">Light</option>
                </select>
            </label>

            <div class="settings-section-separator" aria-hidden="true"></div>

            <label class="checkbox"><input type="checkbox" id="s-confirmdel">Confirm before delete</label>
            <label class="checkbox"><input type="checkbox" id="s-showpw">Show passwords by default</label>
            <label class="checkbox"><input type="checkbox" id="s-showempty">Show empty values by default</label>
            <label class="checkbox"><input type="checkbox" id="s-showstatus">Show status bar</label>
            <label class="checkbox"><input type="checkbox" id="s-archive-backups">Create archive backups</label>

        </div>

        <div class="modal-body settings-tab-content" id="settings-content-password-generator" style="display:none;">
            <label class="settings-number-row">
                <span>Password generator length</span>
                <input type="number" id="s-genlen" min="4" max="128" step="1"/>
            </label>
        </div>

        <div class="modal-body settings-tab-content" id="settings-content-converter" style="display:none;">
            <h3>Base64</h3>

            <label class="settings-number-row">
                <span>Operation</span>
                <select id="s-base64-default-operation">
                    <option value="encode">Encode</option>
                    <option value="decode">Decode</option>
                </select>
            </label>

            <label class="settings-number-row">
                <span>Default format</span>
                <select id="s-base64-default-format">
                    <option value="base64url">Base64URL</option>
                    <option value="base64">Base64</option>
                    <option value="base32">Base32</option>
                    <option value="base32hex">Base32Hex</option>
                    <option value="hex">Hex</option>
                </select>
            </label>

            <div class="settings-section-separator" aria-hidden="true"></div>
            <h3>YAML / JSON</h3>

            <label class="settings-number-row">
                <span>Default operation</span>
                <select id="s-yaml-json-default-operation">
                    <option value="yaml-to-json">YAML → JSON</option>
                    <option value="json-to-yaml">JSON → YAML</option>
                </select>
            </label>

            <label class="settings-number-row">
                <span>JSON output indentation</span>
                <select id="s-yaml-json-indentation">
                    <option value="spaces-2">Use 2 spaces</option>
                    <option value="spaces-4">Use 4 spaces</option>
                    <option value="tabs">Use tabs</option>
                </select>
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

        <div class="modal-body about-combined-content">
            <div class="about-summary">
                <img class="about-logo about-combined-logo" src="${logoSrc}" alt="SATO logo"/>

                <div class="about-summary-details">
                    <div class="about-description">VSCode/VSCodium extension to manage vaults, archives, crypto files.</div>

                    <div class="about-version">
                        <span>
                            Version: <span id="about-version-value">${escapeHtml(versionLabel)}</span>
                        </span>

                        <button type="button" class="icon-btn" id="about-version-copy" title="Copy Version" aria-label="Copy Version">
                            <span class="codicon codicon-copy" aria-hidden="true"></span>
                        </button>
                    </div>

                    <div class="about-copyright">
                        © 2026
                        <a href="https://github.com/Marcus-Aprelius/sato-vscode" target="_blank" rel="noopener noreferrer">Marcus-Aprelius</a>
                    </div>
                </div>
            </div>

            <div class="about-combined-separator" aria-hidden="true"></div>
            <div class="about-formats-title">Supported Formats</div>
            <div class="about-supports about-combined-formats">
                <div class="about-supports-row">
                    <strong>Vaults:</strong>
                    <span>${vaultFormats}</span>
                </div>

                <div class="about-supports-row">
                    <strong>Archives:</strong>
                    <span>${archiveFormats}</span>
                </div>

                <div class="about-supports-row">
                    <strong>SSH:</strong>
                    <span>${sshFormats}</span>
                </div>

                <div class="about-supports-row">
                    <strong>Crypto:</strong>
                    <span>${cryptoFormats}</span>
                </div>

                <div class="about-supports-row">
                    <strong>Backups:</strong>
                    <span>${backupFormat} (read-only)</span>
                </div>
            </div>
        </div>

        <div class="modal-footer">
            <button type="button" class="btn primary" id="about-close">Close</button>
        </div>
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
            <button type="button" class="converter-tab" id="converter-tab-qr" title="Generate a QR code from text" aria-label="Generate a QR code from text">QR</button>
            <button type="button" class="converter-tab" id="converter-tab-yaml-json" title="Convert between YAML and JSON" aria-label="Convert between YAML and JSON">YAML↔JSON</button>
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
                        <div class="base64-section-actions">
                            <button type="button" class="btn" id="base64-show-qr" title="Show the current output as a QR code" disabled>Show QR</button>
                            <button type="button" class="btn" id="base64-copy">Copy</button>
                        </div>
                    </div>

                    <textarea id="base64-output" class="base64-textarea" spellcheck="false" placeholder="Result" readonly></textarea>
                    <div class="base64-character-count" id="base64-output-count">0 characters</div>
                </section>
            </div>

            <div class="base64-message" id="base64-message">Encoding transforms data but does not encrypt or protect it.</div>
            <div class="base64-error" id="base64-error" style="display:none;"></div>
        </div>

        <div id="converter-qr-content" style="display:none;">
            <div class="base64-columns">
                <section class="base64-section">
                    <div class="base64-section-header">
                        <h3>Input</h3>

                        <div class="base64-section-actions">
                            <button type="button" class="btn" id="qr-upload" title="Open a text file">Upload</button>
                            <button type="button" class="btn" id="qr-paste">Paste</button>
                            <button type="button" class="btn" id="qr-clear">Clear</button>
                        </div>
                    </div>

                    <textarea id="qr-input" class="base64-textarea" spellcheck="false" placeholder="Enter text, URL, password, or other data"></textarea>
                    <div class="base64-character-count" id="qr-input-count">0 characters</div>
                    <div class="base64-message">QR codes may expose sensitive information to anyone who scans or photographs them.</div>
                    <div class="base64-error" id="qr-error" style="display:none;"></div>
                </section>

                <section class="base64-section">
                    <div class="base64-section-header">
                        <h3>QR Code</h3>

                        <div class="base64-section-actions">
                            <button type="button" class="btn" id="qr-copy" disabled>Copy Image</button>
                            <button type="button" class="btn" id="qr-save" disabled>Save PNG</button>
                        </div>
                    </div>

                    <div id="qr-preview" class="qr-preview">
                        <canvas id="qr-canvas" class="qr-preview-image" aria-label="Generated QR code" style="display:none;"></canvas>
                        <div class="empty">Enter text to generate a QR code.</div>
                    </div>
                </section>
            </div>
        </div>

        <div id="converter-yaml-json-content" style="display:none;">
            <div class="base64-toolbar">
                <label class="base64-option">
                    Operation

                    <select id="yaml-json-operation">
                        <option value="yaml-to-json" selected>YAML → JSON</option>

                        <option value="json-to-yaml">
                            JSON → YAML
                        </option>
                    </select>
                </label>

                <button type="button" class="btn primary" id="yaml-json-live-mode" title="Disable automatic YAML and JSON conversion" aria-label="Disable automatic YAML and JSON conversion" aria-pressed="true">Live Mode: ON</button>
                <button type="button" class="btn" id="yaml-json-swap" title="Swap input and output" aria-label="Swap input and output">⇄</button>
            </div>

            <div class="base64-columns">
                <section class="base64-section">
                    <div class="base64-section-header">
                        <h3 id="yaml-json-input-title">YAML Input</h3>

                        <div class="base64-section-actions">
                            <button type="button" class="btn" id="yaml-json-upload" title="Open a YAML or JSON file">Upload</button>
                            <button type="button" class="btn" id="yaml-json-paste">Paste</button>
                            <button type="button" class="btn" id="yaml-json-clear">Clear</button>
                        </div>
                    </div>
                    <textarea id="yaml-json-input" class="base64-textarea" spellcheck="false" placeholder="Enter YAML data"></textarea>
                    <div class="base64-character-count" id="yaml-json-input-count">0 characters</div>
                </section>

                <section class="base64-section">
                    <div class="base64-section-header">
                        <h3 id="yaml-json-output-title">JSON Output</h3>

                        <div class="base64-section-actions">
                            <button type="button" class="btn" id="yaml-json-download" title="Save the converted result" disabled>Download</button>
                            <button type="button" class="btn" id="yaml-json-copy" disabled>Copy</button>
                        </div>
                    </div>

                    <textarea id="yaml-json-output" class="base64-textarea" spellcheck="false" placeholder="Result" readonly></textarea>
                    <div class="base64-character-count" id="yaml-json-output-count">0 characters</div>
                </section>
            </div>

            <div class="base64-message">YAML and JSON conversion runs locally. Input data is not sent anywhere.</div>
            <div class="base64-error" id="yaml-json-error" style="display:none;"></div>
        </div>
    </div>

    <div class="modal-footer">
            <button type="button" class="btn" id="converter-cancel">Cancel</button>
            <button type="button" class="btn primary" id="converter-convert">Convert</button>
        </div>
    </div>

</div>`;

}

const FORMAT_WIKI_PAGES: Record<string, string> = {
    '7z':'7z', 'gz':'Gzip', 'xz':'XZ_Utils', 'zip':'ZIP_(file_format)', 'rar':'RAR_(file_format)', 'gzip':'Gzip',
    'tar':'Tar_(computing)', 'zst':'Zstd', 'bz2':'Bzip2', 'cab':'Cabinet_(file_format)', 'deb':'Deb_(file_format)',
    'rpm':'RPM_Package_Manager', 'jar':'JAR_(file_format)', 'war':'WAR_(file_format)', 'chm':'Microsoft_Compiled_HTML_Help',
    'dmg':'Apple_Disk_Image', 'iso':'ISO_image', 'pem':'Privacy-Enhanced_Mail', 'crt':'X.509#Certificate_filename_extensions', 
    'csr':'Certificate_signing_request', 'pfx':'PKCS_12', 'p12':'PKCS_12', 'arj':'ARJ', 'lha':'LHA_(file_format)', 'epub':'EPUB',
    'lzh':'LHA_(file_format)', 'gpg':'GNU_Privacy_Guard', 'pgp':'GNU_Privacy_Guard','jks':'Java_KeyStore', 'vcf':'VCard', 
    'kdbx':'KeePass', 'lzma':'LZMA', 'zipx':'ZIP_(file_format)', 'alz':'ALZip', 'egg':'ALZip', 'cpio':'Cpio', 'ear':'EAR_(file_format)',
    'tzst':'Zstd', 'z':'Compress_(software)', 'tar.xz':'XZ_Utils', 'txz':'XZ_Utils', 'sb2':'Scratch_(programming_language)#Filetypes',
    'sb3':'Scratch_(programming_language)#Filetypes', 'xpi':'XPInstall', 'pbix': 'Microsoft_Power_BI', 'taz':'Gzip', 'tar.zst':'Zstd',
    'tar.z':'Compress_(software)', 'tar.bz2':'Bzip2', 'tbz2':'Bzip2', 'tar.gz':'Gzip', 'tgz':'Gzip', 'luks':'Linux_Unified_Key_Setup',
    'p7b':'X.509#Certificate_filename_extensions', 'cer':'X.509#Certificate_filename_extensions', 'der':'X.509#Certificate_filename_extensions',
    'p10':'X.509#Certificate_filename_extensions', 'p7c':'X.509#Certificate_filename_extensions', 'p7s':'X.509#Certificate_filename_extensions',
    'p7m':'X.509#Certificate_filename_extensions', 'p8':'X.509#Certificate_filename_extensions', 'pk8':'X.509#Certificate_filename_extensions',
    'tc':'TrueCrypt', 'hc':'VeraCrypt'
};

function formatExtensionList(
    extensions: readonly string[]
): string {
    return extensions.map(extension => {
        const escapedExt = escapeHtml(`.${extension}`);
        const wikiPage = FORMAT_WIKI_PAGES[extension];
        
        if (wikiPage) {
            const url = `https://en.wikipedia.org/wiki/${wikiPage}`;
            return `<a href="${url}" class="format-link" target="_blank">${escapedExt}</a>`;
        }
        
        return escapedExt;
    }).join(" ");
}

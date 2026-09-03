import { escapeHtml } from "./htmlUtils";

export function renderModals(
    logoSrc: string,
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
        <div class="modal-title">Generate Password</div>
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

    <div class="modal" id="settings-modal">
        <div class="modal-title">Settings</div>
        <div class="modal-body">
            <label>Auto-lock timeout (minutes, 0 = disabled)
                <input type="number" id="s-autolock" min="0" max="240" step="1" />
            </label>
            <label>Clipboard clear timeout (seconds, 0 = disabled)
                <input type="number" id="s-clipclear" min="0" max="600" step="5" />
            </label>
            <label>Password generator length
                <input type="number" id="s-genlen" min="4" max="128" step="1" />
            </label>
            <label class="checkbox"><input type="checkbox" id="s-confirmdel"> Confirm before delete</label>
            <label class="checkbox"><input type="checkbox" id="s-showpw"> Show passwords by default</label>
            <label class="checkbox"><input type="checkbox" id="s-showempty"> Show empty values by default</label>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn" id="s-cancel">Cancel</button>
            <button type="button" class="btn primary" id="s-save">Save</button>
        </div>
    </div>

    <div class="modal" id="dbinfo-modal">
        <div class="modal-title" id="dbinfo-title">Database Info</div>
        <div class="modal-body" id="dbinfo-body">
            <div class="empty">Loading…</div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn primary" id="dbinfo-close">Close</button>
        </div>
    </div>

    <div class="modal about-modal" id="about-modal">
        <div class="modal-title">[SATO] Secure Access Task Operator</div>
            <div class="about-tabs">
                <button type="button" class="about-tab active" id="about-tab-about">About</button>
                <button type="button" class="about-tab" id="about-tab-supported-formats">Supported Formats</button>
            </div>

        <div class="modal-body" id="about-content" style="align-items:center; text-align:center; gap:8px; padding:16px;">
        <img class="about-logo" src="${logoSrc}" alt="SATO logo" />
            <div>
                VS Code extension for viewing<br>

                <button type="button" class="about-inline-link" id="about-open-supported-formats">
                    secure storage and cryptographic files
                </button>
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
                    <span>
                        .crt .cer .der .pem .csr .p10 .key .ppk .jks .pgp<br>
                        .p12 .pfx .p7b .p7c .p7s .p7m .gpg .pk8 .asc .jceks<br>
                        .sig .age .p8
                    </span>
                </div>


            </div>
        </div>

        <div class="modal-footer">
            <button type="button" class="btn primary" id="about-close">Close</button>
        </div>
    </div>



</div>`;
}

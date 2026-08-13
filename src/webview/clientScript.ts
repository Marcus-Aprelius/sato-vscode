export const CLIENT_SCRIPT = `
const vscode = acquireVsCodeApi();

let state = initialState;
let selectedGroupId = state.tree.id;
let selectedEntryId = null;
let searchQuery = '';
let settings = state.settings;
let vaultLocked = false;

let groupsWidth = 240;
let entriesWidth = 300;

const groupIndex = new Map();
const entryIndex = new Map();
const parentGroupOf = new Map();

function setLockButtonState(locked) {
    const btn = document.getElementById('btn-lock');
    if (!btn) return;

    btn.dataset.locked = locked ? 'true' : 'false';
    btn.title = locked ? 'Unlock database' : 'Lock database';

    btn.innerHTML = locked
        ? '<span class="codicon codicon-unlock" aria-hidden="true"></span><span>Unlock DB</span>'
        : '<span class="codicon codicon-lock" aria-hidden="true"></span><span>Lock DB</span>';
}

function renderVaultLockedState() {
    vaultLocked = true;
    selectedEntryId = null;
    searchQuery = '';

    const search = document.getElementById('search');
    if (search) {
        search.value = '';
    }

    groupIndex.clear();
    entryIndex.clear();
    parentGroupOf.clear();

    document.getElementById('tree').innerHTML =
        '<div class="empty">Vault is locked.</div>';

    document.getElementById('entries-title').textContent = 'Entries';

    document.getElementById('entry-list').innerHTML =
        '<div class="empty">Unlock database to view secrets.</div>';

    document.getElementById('details').innerHTML =
        '<div class="empty">Unlock database to view details.</div>';

    const bar = document.getElementById('statusbar');
    if (bar) {
        bar.innerHTML = '<span class="item"><strong>Locked</strong></span>';
    }

    setLockButtonState(true);
}

function openUnlockModal() {
    const password = document.getElementById('unlock-password');
    const error = document.getElementById('unlock-error');

    if (password) {
        password.value = '';
        setKeyboardLayout('ENG');

        const capsWarning = document.getElementById('unlock-capslock-warning');
        if (capsWarning) {
            capsWarning.style.display = 'none';
        }

    }

    if (error) {
        error.style.display = 'none';
        error.textContent = '';
    }

    openModal('unlock-modal');

    setTimeout(() => {
        const input = document.getElementById('unlock-password');
        if (input) {
            input.focus();
        }
    }, 0);
}

function closeUnlockModal() {
    const password = document.getElementById('unlock-password');
    const error = document.getElementById('unlock-error');

    if (password) {
        password.value = '';
    }

    if (error) {
        error.style.display = 'none';
        error.textContent = '';
    }

    closeModal();
}

function submitUnlockPassword() {
    const input = document.getElementById('unlock-password');
    if (!input) return;

    const password = input.value;

    if (!password) {
        input.focus();
        return;
    }

    vscode.postMessage({
        type: 'unlockWithPassword',
        password
    });
}

function setKeyboardLayout(layout) {
    const el = document.getElementById('unlock-layout');
    if (!el) return;

    el.textContent = layout;
    el.classList.toggle('ru', layout === 'РУС');
    el.classList.toggle('eng', layout === 'ENG');
}

function detectKeyboardLayoutFromText(value) {
    for (let i = value.length - 1; i >= 0; i--) {
        const ch = value.charAt(i);

        if (/[A-Za-z]/.test(ch)) {
            return 'ENG';
        }

        if (/[А-Яа-яЁёІіЇїЄєҐґ]/.test(ch)) {
            return 'РУС';
        }
    }

    return null;
}

function updateKeyboardLayoutFromEvent(e) {
    const key = e && e.key ? e.key : '';

    if (/^[A-Za-z]$/.test(key)) {
        setKeyboardLayout('ENG');
        return;
    }

    if (/^[А-Яа-яЁёІіЇїЄєҐґ]$/.test(key)) {
        setKeyboardLayout('РУС');
        return;
    }

    const input = document.getElementById('unlock-password');
    if (!input) return;

    const detected = detectKeyboardLayoutFromText(input.value);
    if (detected) {
        setKeyboardLayout(detected);
    }
}

function updateCapsLockWarning(e) {
    const warning = document.getElementById('unlock-capslock-warning');
    if (!warning) return;

    const isOn = e && typeof e.getModifierState === 'function'
        ? e.getModifierState('CapsLock')
        : false;

    warning.style.display = isOn ? '' : 'none';
}

function updateUnlockInputHints(e) {
    updateKeyboardLayoutFromEvent(e);
    updateCapsLockWarning(e);
}

function applyColumnWidths() {
    const layout = document.getElementById('layout');
    if (!layout) return;

    layout.style.gridTemplateColumns =
        groupsWidth + 'px 4px ' + entriesWidth + 'px 4px 1fr';
}

function setupColumnResize() {
    const resizeGroups = document.getElementById('resize-groups');
    const resizeEntries = document.getElementById('resize-entries');

    if (!resizeGroups || !resizeEntries) {
        return;
    }

    const startResize = (kind, e) => {
        e.preventDefault();
        e.stopPropagation();

        const handle = e.currentTarget;
        const startX = e.clientX;
        const startGroupsWidth = groupsWidth;
        const startEntriesWidth = entriesWidth;

        handle.classList.add('active');
        document.body.classList.add('resizing');

        const onMove = (moveEvent) => {
            moveEvent.preventDefault();

            const dx = moveEvent.clientX - startX;

            if (kind === 'groups') {
                groupsWidth = Math.max(160, Math.min(520, startGroupsWidth + dx));
            } else {
                entriesWidth = Math.max(200, Math.min(650, startEntriesWidth + dx));
            }

            applyColumnWidths();
        };

        const onUp = () => {
            handle.classList.remove('active');
            document.body.classList.remove('resizing');

            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    resizeGroups.addEventListener('pointerdown', (e) => startResize('groups', e));
    resizeEntries.addEventListener('pointerdown', (e) => startResize('entries', e));

    applyColumnWidths();
}

function reindex() {
    groupIndex.clear();
    entryIndex.clear();
    parentGroupOf.clear();

    const walk = (g) => {
        groupIndex.set(g.id, g);

        for (const e of g.entries) {
            entryIndex.set(e.id, e);
            parentGroupOf.set(e.id, g.id);
        }

        for (const c of g.groups) {
            parentGroupOf.set(c.id, g.id);
            walk(c);
        }
    };

    walk(state.tree);
}

function setState(newState) {
    vaultLocked = false;
    setLockButtonState(false);
    closeUnlockModal();

    state = newState;

    if (newState.settings) settings = newState.settings;
    reindex();

    if (!groupIndex.has(selectedGroupId)) {
        selectedGroupId = state.tree.id;
    }

    if (selectedEntryId && !entryIndex.has(selectedEntryId)) {
        selectedEntryId = null;
    }

    renderAll();
}

// ---- rendering ----
function renderAll() {
    renderTree();
    renderEntries();
    renderDetails();
    renderStatus();
}

function renderTree() {
    const treeEl = document.getElementById('tree');
    treeEl.innerHTML = '';
    treeEl.appendChild(renderGroupNode(state.tree, 0));
}

function renderGroupNode(g, depth) {
    const wrap = document.createElement('div');
    const row = document.createElement('div');

    row.className = 'group-node' + (g.id === selectedGroupId ? ' active' : '');
    row.style.paddingLeft = (6 + depth * 10) + 'px';
    row.dataset.groupId = g.id;

    const caret = document.createElement('span');
    caret.className = 'group-caret';
    caret.textContent = g.groups.length ? '▸' : '';
    row.appendChild(caret);

    const label = document.createElement('span');
    label.className = 'group-label';
    label.textContent = g.name;
    row.appendChild(label);

    const count = document.createElement('span');
    count.className = 'group-count';
    count.textContent = g.entries.length ? String(g.entries.length) : '';
    row.appendChild(count);

    row.addEventListener('click', (e) => {
        e.stopPropagation();
        selectGroup(g.id);
    });

    row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        selectGroup(g.id);
        openGroupMenu(e.clientX, e.clientY, g.id);
    });

    wrap.appendChild(row);

    if (g.groups.length) {
        const ul = document.createElement('ul');

        for (const child of g.groups) {
            const li = document.createElement('li');
            li.appendChild(renderGroupNode(child, depth + 1));
            ul.appendChild(li);
        }

        wrap.appendChild(ul);
    }

    return wrap;
}

function selectGroup(id) {
    if (vaultLocked) return;

    selectedGroupId = id;
    selectedEntryId = null;
    renderAll();
}

function entryMatches(entry) {
    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();

    return (entry.title + ' ' + entry.username + ' ' + entry.url + ' ' + entry.notes)
    .toLowerCase()
    .indexOf(q) !== -1;
}

function collectMatchingEntries(g, out) {
    for (const e of g.entries) if (entryMatches(e)) out.push(e);

    for (const c of g.groups) collectMatchingEntries(c, out);
}

function renderEntries() {
    const list = document.getElementById('entry-list');
    const titleEl = document.getElementById('entries-title');

    list.innerHTML = '';

    let entries = [];

    if (searchQuery) {
        collectMatchingEntries(state.tree, entries);
        titleEl.textContent = 'Search results (' + entries.length + ')';
    } else {
        const g = groupIndex.get(selectedGroupId);
        entries = g ? g.entries.slice() : [];
        titleEl.textContent = (g ? g.name : 'Entries') + ' (' + entries.length + ')';
    }

    if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = searchQuery ? 'No entries match.' : 'No entries in this group.';
        list.appendChild(empty);
        return;
    }

    for (const entry of entries) {
        const row = document.createElement('div');
        row.className = 'entry-row' + (entry.id === selectedEntryId ? ' active' : '');
        row.dataset.entryId = entry.id;

        const info = document.createElement('div');
        info.style.flex = '1';
        info.style.minWidth = '0';

        const title = document.createElement('div');
        title.className = 'entry-title';
        title.textContent = entry.title;

        const sub = document.createElement('div');
        sub.className = 'entry-sub';
        sub.textContent = entry.username || entry.url || '';

        info.appendChild(title);
        info.appendChild(sub);
        row.appendChild(info);

        if (entry.expired) {
            const b = document.createElement('span');
            b.className = 'badge expired';
            b.textContent = 'expired';
            row.appendChild(b);
        }

        if (entry.weak) {
            const b = document.createElement('span');
            b.className = 'badge weak';
            b.textContent = 'weak';
            row.appendChild(b);
        }

        row.addEventListener('click', () => selectEntry(entry.id));

        row.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            selectEntry(entry.id);
            openEntryMenu(e.clientX, e.clientY, entry.id);
        });

        list.appendChild(row);
    }
}

function selectEntry(id) {
    if (vaultLocked) return;

    selectedEntryId = id;
    renderEntries();
    renderDetails();
}

function renderDetails() {
    const container = document.getElementById('details');
    container.innerHTML = '';

    if (!selectedEntryId) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'Select an entry to view its fields.';
        container.appendChild(empty);
        return;
    }

    const entry = entryIndex.get(selectedEntryId);
    if (!entry) return;

    const h2 = document.createElement('h2');
    h2.textContent = entry.title;
    container.appendChild(h2);

    const table = document.createElement('table');

    const fields = [
    'UserName',
    'URL',
    'Password',
    'Notes',
    ...entry.fields.filter(f => !['Title', 'UserName', 'URL', 'Password', 'Notes'].includes(f))
    ];

    for (const field of fields) {
        const tr = document.createElement('tr');

        const tdLabel = document.createElement('td');
        tdLabel.className = 'label';
        tdLabel.textContent = field;

        const tdValue = document.createElement('td');
        const value = document.createElement('div');
        value.className = 'value';

        if (field === 'Password') {
            const input = document.createElement('input');
            input.type = 'password';
            input.value = entry.hasPassword ? '••••••••' : '';
            input.readOnly = true;
            input.dataset.field = field;
            input.dataset.entryId = entry.id;
            value.appendChild(input);

            const reveal = document.createElement('button');
            reveal.className = 'btn';
            reveal.textContent = 'Show';

            reveal.addEventListener('click', () => {
                if (input.type === 'password') {
                    vscode.postMessage({ type: 'revealSecret', entryId: entry.id, field });
                } else {
                    input.type = 'password';
                    input.value = entry.hasPassword ? '••••••••' : '';
                    reveal.textContent = 'Show';
                }
            });

            value.appendChild(reveal);

            if (settings && settings.showPasswordsByDefault && entry.hasPassword) {
                vscode.postMessage({ type: 'revealSecret', entryId: entry.id, field });
            }
        } else {
            const text = field === 'UserName' ? entry.username
                : field === 'URL' ? entry.url
                : field === 'Notes' ? entry.notes
                : '';

            const span = document.createElement('span');
            span.textContent = text || '(empty)';
            value.appendChild(span);
        }

        const copy = document.createElement('button');
        copy.className = 'btn';
        copy.textContent = 'Copy';

        copy.addEventListener('click', () => {
            vscode.postMessage({ type: 'copySecret', entryId: entry.id, field });
        });

        value.appendChild(copy);

        tdValue.appendChild(value);
        tr.appendChild(tdLabel);
        tr.appendChild(tdValue);
        table.appendChild(tr);
    }

    container.appendChild(table);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn primary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openEntryModal(entry.id));
    actions.appendChild(editBtn);

    const dupBtn = document.createElement('button');
    dupBtn.className = 'btn';
    dupBtn.textContent = 'Duplicate';
    dupBtn.addEventListener('click', () => vscode.postMessage({ type: 'duplicateEntry', entryId: entry.id }));
    actions.appendChild(dupBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => vscode.postMessage({ type: 'deleteEntry', entryId: entry.id }));
    actions.appendChild(delBtn);

    container.appendChild(actions);
}

function renderStatus() {
    const bar = document.getElementById('statusbar');
    const s = state.stats;

    bar.innerHTML = '';

    const item = (label, value, cls) => {
        const el = document.createElement('span');
        el.className = 'item' + (cls ? ' ' + cls : '');
        el.innerHTML = label + ': <strong>' + value + '</strong>';
        bar.appendChild(el);
    };

    item('Groups', s.groups);
    item('Entries', s.entries);
    item('Duplicates', s.duplicates, s.duplicates > 0 ? 'warn' : '');
    item('Weak', s.weak, s.weak > 0 ? 'warn' : '');
    item('Expired', s.expired, s.expired > 0 ? 'err' : '');
    item('Empty groups', s.emptyGroups);

    applyStatusBarVisibility();
}

function applyStatusBarVisibility() {
    const bar = document.getElementById('statusbar');

    if (settings && settings.showStatusBar === false) {
        bar.style.display = 'none';
    } else {
        bar.style.display = '';
    }
}

// ---- context menu ----
const ctxMenu = document.getElementById('ctx-menu');

function closeMenu() {
    ctxMenu.classList.remove('open');
    ctxMenu.innerHTML = '';
    }

document.addEventListener('click', closeMenu);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeMenu();
        closeModal(); 
        }
});

function showMenu(x, y, items) {
    ctxMenu.innerHTML = '';

    for (const it of items) {
        if (it.sep) {
            const s = document.createElement('div');
            s.className = 'ctx-sep';
            ctxMenu.appendChild(s);
            continue;
        }

        const el = document.createElement('div');
        el.className = 'ctx-item';
        el.textContent = it.label;

        if (it.title) {
            el.title = it.title;
        }

        el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        closeMenu();
        it.action();
        });

        ctxMenu.appendChild(el);
    }

    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.add('open');
    // clamp within viewport
    const rect = ctxMenu.getBoundingClientRect();

    if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 4) + 'px';
    if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 4) + 'px';
}

function openEntryMenu(x, y, entryId) {
    if (vaultLocked) return;

    showMenu(x, y, [
        { label: 'Copy Username', action: () => vscode.postMessage({ type: 'copySecret', entryId, field: 'UserName' }) },
        { label: 'Copy Password', action: () => vscode.postMessage({ type: 'copySecret', entryId, field: 'Password' }) },
        { label: 'Copy URL', action: () => vscode.postMessage({ type: 'copySecret', entryId, field: 'URL' }) },
        { sep: true },
        { label: 'Edit Entry', action: () => openEntryModal(entryId) },
        { label: 'Duplicate Entry', action: () => vscode.postMessage({ type: 'duplicateEntry', entryId }) },
        { label: 'Delete Entry', action: () => vscode.postMessage({ type: 'deleteEntry', entryId }) }
    ]);
}

function openGroupMenu(x, y, groupId) {
    if (vaultLocked) return;

    showMenu(x, y, [
        { label: 'New Entry', action: () => openEntryModal(null, groupId) },
        { label: 'New Folder', action: () => vscode.postMessage({ type: 'createGroup', parentId: groupId }) },
        { sep: true },
        { label: 'Rename', action: () => vscode.postMessage({ type: 'renameGroup', groupId }) },
        { label: 'Delete', action: () => vscode.postMessage({ type: 'deleteGroup', groupId }) }
    ]);
}

// ---- modals ----
const backdrop = document.getElementById('modal-backdrop');

function openModal(id) {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    document.getElementById(id).classList.add('open');
    backdrop.classList.add('open');
}

function closeModal() {
    backdrop.classList.remove('open');

    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));

    editingEntryId = null;
    editingGroupId = null;
}

backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

// Entry modal
let editingEntryId = null;
let editingGroupId = null;

function openEntryModal(entryId, groupId) {
    if (vaultLocked) return;

    editingEntryId = entryId || null;
    editingGroupId = groupId || selectedGroupId;

    document.getElementById('entry-modal-title').textContent = entryId ? 'Edit Entry' : 'New Entry';
    document.getElementById('ef-title').value = '';
    document.getElementById('ef-username').value = '';
    document.getElementById('ef-password').value = '';
    document.getElementById('ef-password').type = 'password';
    document.getElementById('ef-toggle').textContent = 'Show';
    document.getElementById('ef-url').value = '';
    document.getElementById('ef-notes').value = '';

    updateEntryStrength();
    openModal('entry-modal');

    if (entryId) {
        vscode.postMessage({ type: 'getEntryDetail', entryId });
    } else {
        document.getElementById('ef-title').focus();
    }
}

function fillEntryModal(detail) {
    document.getElementById('ef-title').value = detail.title;
    document.getElementById('ef-username').value = detail.username;
    document.getElementById('ef-password').value = detail.password;
    document.getElementById('ef-url').value = detail.url;
    document.getElementById('ef-notes').value = detail.notes;

    updateEntryStrength();
    document.getElementById('ef-title').focus();
}

document.getElementById('ef-cancel').addEventListener('click', closeModal);

document.getElementById('ef-toggle').addEventListener('click', () => {
    const p = document.getElementById('ef-password');
    const t = document.getElementById('ef-toggle');

    if (p.type === 'password') { p.type = 'text'; t.textContent = 'Hide'; }
    else { p.type = 'password'; t.textContent = 'Show'; }
});

document.getElementById('ef-password').addEventListener('input', updateEntryStrength);

document.getElementById('ef-generate').addEventListener('click', () => {
    const pw = generateWithDefaults();
    document.getElementById('ef-password').value = pw;
    updateEntryStrength();
});

document.getElementById('ef-save').addEventListener('click', () => {
    const fields = {
        title: document.getElementById('ef-title').value.trim(),
        username: document.getElementById('ef-username').value,
        password: document.getElementById('ef-password').value,
        url: document.getElementById('ef-url').value,
        notes: document.getElementById('ef-notes').value
    };

    if (!fields.title) {
        document.getElementById('ef-title').focus();
        return;
    }

    if (editingEntryId) {
        vscode.postMessage({ type: 'updateEntry', entryId: editingEntryId, fields });
    } else {
        vscode.postMessage({ type: 'createEntry', groupId: editingGroupId, fields });
    }

    closeModal();
});

// Password strength
function strengthOf(pw) {
    if (!pw) return { pct: 0, color: '#666', label: 'empty' };

    let score = 0;

    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const levels = [
        { pct: 15, color: '#d16969', label: 'very weak' },
        { pct: 30, color: '#d19a66', label: 'weak' },
        { pct: 50, color: '#d1c66a', label: 'fair' },
        { pct: 70, color: '#a3d16a', label: 'good' },
        { pct: 85, color: '#6ad189', label: 'strong' },
        { pct: 100, color: '#4ec9b0', label: 'very strong' }
    ];

    const idx = Math.min(score, levels.length - 1);
    return levels[idx];
}

function updateEntryStrength() {
    const pw = document.getElementById('ef-password').value;
    const bar = document.getElementById('ef-strength-bar');
    const label = document.getElementById('ef-strength-label');
    const s = strengthOf(pw);

    bar.style.setProperty('--pct', s.pct + '%');
    bar.style.setProperty('--color', s.color);
    label.textContent = s.label;
}

// Generator modal
function currentGenOptions() {
    return {
        length: parseInt(document.getElementById('gen-length').value, 10),
        upper: document.getElementById('gen-upper').checked,
        lower: document.getElementById('gen-lower').checked,
        digits: document.getElementById('gen-digits').checked,
        symbols: document.getElementById('gen-symbols').checked
    };
}

function generatePassword(opts) {
    let alphabet = '';

    if (opts.upper) alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (opts.lower) alphabet += 'abcdefghijklmnopqrstuvwxyz';
    if (opts.digits) alphabet += '0123456789';
    if (opts.symbols) alphabet += '!@#$%^&*()-_=+[]{};:,.<>?/|~';

    if (!alphabet) alphabet = 'abcdefghijklmnopqrstuvwxyz';

    const len = Math.max(1, Math.min(128, opts.length | 0));
    const buf = new Uint32Array(len);

    crypto.getRandomValues(buf);

    let out = '';

    for (let i = 0; i < len; i++) out += alphabet.charAt(buf[i] % alphabet.length);
    return out;
}

function generateWithDefaults() {
    const len = (settings && settings.passwordGeneratorLength) || 20;

    return generatePassword({ length: len, upper: true, lower: true, digits: true, symbols: true });
}

function regenGen() {
    const pw = generatePassword(currentGenOptions());
    document.getElementById('gen-output').value = pw;

    const s = strengthOf(pw);
    const bar = document.getElementById('gen-strength-bar');

    bar.style.setProperty('--pct', s.pct + '%');
    bar.style.setProperty('--color', s.color);

    document.getElementById('gen-strength-label').textContent = s.label;
}

document.getElementById('gen-length').addEventListener('input', () => {
    document.getElementById('gen-length-val').textContent = document.getElementById('gen-length').value;
    regenGen();
});

document.querySelectorAll('#gen-upper, #gen-lower, #gen-digits, #gen-symbols').forEach(el => {
    el.addEventListener('change', regenGen);
});

document.getElementById('gen-regen').addEventListener('click', regenGen);
document.getElementById('gen-close').addEventListener('click', closeModal);

document.getElementById('gen-copy').addEventListener('click', () => {
    const pw = document.getElementById('gen-output').value;

    if (pw) {
        vscode.postMessage({
            type: 'copyText',
            text: pw
        });
    }
});

document.getElementById('btn-generate').addEventListener('click', () => {
    if (vaultLocked) return;

    const len = (settings && settings.passwordGeneratorLength) || 20;

    document.getElementById('gen-length').value = String(len);
    document.getElementById('gen-length-val').textContent = String(len);

    openModal('gen-modal');
    regenGen();
});

// ---- settings modal ----
function openSettingsModal() {
    document.getElementById('s-autolock').value = String(settings.autoLockTimeout || 0);
    document.getElementById('s-clipclear').value = String(settings.clipboardClearTimeout || 0);
    document.getElementById('s-genlen').value = String(settings.passwordGeneratorLength || 20);
    document.getElementById('s-confirmdel').checked = !!settings.confirmBeforeDelete;
    document.getElementById('s-showpw').checked = !!settings.showPasswordsByDefault;
    document.getElementById('s-showstatusbar').checked = settings.showStatusBar !== false;

    openModal('settings-modal');
}

document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
document.getElementById('s-cancel').addEventListener('click', closeModal);

document.getElementById('s-save').addEventListener('click', () => {
    const next = {
        autoLockTimeout: Math.max(0, Math.min(240, parseInt(document.getElementById('s-autolock').value, 10) || 0)),
        clipboardClearTimeout: Math.max(0, Math.min(600, parseInt(document.getElementById('s-clipclear').value, 10) || 0)),
        passwordGeneratorLength: Math.max(4, Math.min(128, parseInt(document.getElementById('s-genlen').value, 10) || 20)),
        confirmBeforeDelete: document.getElementById('s-confirmdel').checked,
        showPasswordsByDefault: document.getElementById('s-showpw').checked,
        showStatusBar: document.getElementById('s-showstatusbar').checked
    };

    vscode.postMessage({ type: 'updateSettings', settings: next });

    closeModal();
});

// ---- toolbar ----
function openDropdown(button, items) {
    const r = button.getBoundingClientRect();
    showMenu(r.left, r.bottom + 2, items);
}

document.getElementById('btn-add').addEventListener('click', (e) => {
    if (vaultLocked) return;

    e.stopPropagation();

    openDropdown(e.currentTarget, [
        { label: 'Entry', action: () => openEntryModal(null, selectedGroupId) },
        { label: 'Folder', action: () => vscode.postMessage({ type: 'createGroup', parentId: selectedGroupId }) }
    ]);
});

document.getElementById('btn-lock').addEventListener('click', () => {
    const btn = document.getElementById('btn-lock');
    const locked = btn && btn.dataset.locked === 'true';

    if (locked) {
        openUnlockModal();
    } else {
        vscode.postMessage({
            type: 'lock'
        });
    }
});

const unlockCancel = document.getElementById('unlock-cancel');
if (unlockCancel) {
    unlockCancel.addEventListener('click', closeUnlockModal);
}

const unlockOk = document.getElementById('unlock-ok');
if (unlockOk) {
    unlockOk.addEventListener('click', submitUnlockPassword);
}

const unlockPassword = document.getElementById('unlock-password');
if (unlockPassword) {
    unlockPassword.addEventListener('keydown', (e) => {
        updateUnlockInputHints(e);

        if (e.key === 'Enter') {
            submitUnlockPassword();
        }

        if (e.key === 'Escape') {
            closeUnlockModal();
        }
    });

    unlockPassword.addEventListener('keyup', (e) => {
        updateUnlockInputHints(e);
    });

    unlockPassword.addEventListener('input', () => {
        const detected = detectKeyboardLayoutFromText(unlockPassword.value);
        if (detected) {
            setKeyboardLayout(detected);
        }
    });

    unlockPassword.addEventListener('focus', () => {
        setKeyboardLayout(detectKeyboardLayoutFromText(unlockPassword.value) || 'ENG');
    });
}

document.getElementById('btn-database').addEventListener('click', (e) => {
    e.stopPropagation();

    openDropdown(e.currentTarget, [
        {
            label: 'Open DB',
            title: 'Open another KeePass database',
            action: () => {
                vscode.postMessage({ type: 'openDb' });
            }
        },

        {
            label: vaultLocked ? 'Unlock DB' : 'Lock DB',
            title: vaultLocked ? 'Unlock current database' : 'Lock current database',
            action: () => {
                if (vaultLocked) {
                    openUnlockModal();
                } else {
                    vscode.postMessage({ type: 'lock' });
                }
            }
        },

        {
            sep: true
        },

        {
            label: 'Show DB Info',
            title: 'Show current DB info',
            action: () => {
                if (vaultLocked) {
                    return;
                }

                document.getElementById('dbinfo-body').innerHTML =
                    '<div class="empty">Loading...</div>';

                openModal('dbinfo-modal');

                vscode.postMessage({ type: 'getDbInfo' });
            }
        },

        {
            label: 'Refresh',
            title: 'Reload DB file from disk',
            action: () => {
                vscode.postMessage({ type: 'reload' });
            }
        },

        {
            sep: true
        },

        {
            label: 'About SATO',
            title: 'Get information about SATO',
            action: () => {
                openModal('about-modal');
            }
        }
    ]);
});

document.getElementById('dbinfo-close').addEventListener('click', closeModal);
document.getElementById('about-close').addEventListener('click', closeModal);

document.getElementById('search').addEventListener('input', (e) => {
    if (vaultLocked) return;

    searchQuery = e.target.value.trim();
    renderEntries();
});

function renderDbInfo(info) {
    const body = document.getElementById('dbinfo-body');

    body.innerHTML = '';

    const rows = [
        ['Name', info.name || '(unnamed)'],
        ['Description', info.desc || '(empty)'],
        ['KDBX version', info.version],
        ['Generator', info.generator || 'unknown'],
        ['File', info.filePath],
        ['File size', info.fileSize + ' bytes'],
        ['Groups', String(info.groupCount)],
        ['Entries', String(info.entryCount)],
        ['Recycle bin', info.recycleBinEnabled ? 'enabled' : 'disabled']
    ];

    const table = document.createElement('table');
    table.className = 'dbinfo-table';

    for (const [k, v] of rows) {
        const tr = document.createElement('tr');

        const tdK = document.createElement('td');
        tdK.className = 'label';
        tdK.textContent = k;

        const tdV = document.createElement('td');

        if (k === 'File') {
            const wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.alignItems = 'center';
            wrap.style.width = '100%';
            wrap.style.gap = '8px';

            const span = document.createElement('span');
            span.textContent = v;
            span.style.flex = '1';

            const copy = document.createElement('button');
            copy.className = 'icon-btn';
            copy.title = 'Copy';
            copy.setAttribute('aria-label', 'Copy');

            const copyIcon = document.createElement('span');
            copyIcon.className = 'codicon codicon-copy';

            copy.appendChild(copyIcon);

            copy.addEventListener('click', () => {
                vscode.postMessage({
                    type: 'copyText',
                    text: v
                });
            });

            wrap.appendChild(span);
            wrap.appendChild(copy);

            tdV.appendChild(wrap);
        } else {
            tdV.textContent = v;
        }

        tr.appendChild(tdK);
        tr.appendChild(tdV);
        table.appendChild(tr);
    }

    body.appendChild(table);
}

// ---- inbound messages ----
window.addEventListener('message', (ev) => {
    const msg = ev.data;

    if (msg.type === 'openUnlockModal') {
        openUnlockModal();
    } else if (msg.type === 'vaultLocked') {
        renderVaultLockedState();
    } else if (msg.type === 'unlockFailed') {
        const err = document.getElementById('unlock-error');
        const input = document.getElementById('unlock-password');

        if (err) {
            err.textContent = msg.message || 'Unlock failed.';
            err.style.display = '';
        }

        if (input) {
            input.select();
            input.focus();
        }
    } else if (msg.type === 'vaultState') {
        setState(msg.state);
    } else if (msg.type === 'settingsUpdated') {
        settings = msg.settings;
        applyStatusBarVisibility();

        if (selectedEntryId) {
            renderDetails();
        }
    } else if (msg.type === 'secretRevealed') {
        const input = document.querySelector(
            'input[data-entry-id="' + msg.entryId + '"][data-field="' + msg.field + '"]'
        );

        if (input) {
            input.type = 'text';
            input.value = msg.value;

            const container = input.parentElement;
            const reveal = container ? container.querySelector('.btn') : null;

            if (reveal) {
                reveal.textContent = 'Hide';
            }
        }
    } else if (msg.type === 'entryDetail') {
        fillEntryModal(msg.detail);
    } else if (msg.type === 'dbInfo') {
        renderDbInfo(msg.info);
    }
});

reindex();
setupColumnResize();
setLockButtonState(false);
renderAll();
`;

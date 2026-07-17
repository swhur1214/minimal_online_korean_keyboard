(function () {
    "use strict";

    // ---- Standard Unicode Hangul composition tables ----
    var INITIAL_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    var MEDIAL_LIST = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
    var FINAL_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

    var COMPOUND_VOWEL = {
        'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
        'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
        'ㅡㅣ': 'ㅢ'
    };
    var COMPOUND_FINAL = {
        'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ',
        'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ'
    };
    var DECOMPOSE_FINAL = {};
    FINAL_LIST.forEach(function (f) { if (f) DECOMPOSE_FINAL[f] = [null, f]; });
    Object.keys(COMPOUND_FINAL).forEach(function (pair) {
        var compound = COMPOUND_FINAL[pair];
        DECOMPOSE_FINAL[compound] = [pair.charAt(0), pair.charAt(1)];
    });

    // key -> [unshifted jamo, shifted jamo or null, isConsonant]
    var KEYMAP = {
        q: ['ㅂ', 'ㅃ', true], w: ['ㅈ', 'ㅉ', true], e: ['ㄷ', 'ㄸ', true], r: ['ㄱ', 'ㄲ', true], t: ['ㅅ', 'ㅆ', true],
        y: ['ㅛ', null, false], u: ['ㅕ', null, false], i: ['ㅑ', null, false], o: ['ㅐ', 'ㅒ', false], p: ['ㅔ', 'ㅖ', false],
        a: ['ㅁ', null, true], s: ['ㄴ', null, true], d: ['ㅇ', null, true], f: ['ㄹ', null, true], g: ['ㅎ', null, true],
        h: ['ㅗ', null, false], j: ['ㅓ', null, false], k: ['ㅏ', null, false], l: ['ㅣ', null, false],
        z: ['ㅋ', null, true], x: ['ㅌ', null, true], c: ['ㅊ', null, true], v: ['ㅍ', null, true],
        b: ['ㅠ', null, false], n: ['ㅜ', null, false], m: ['ㅡ', null, false]
    };

    var ROWS = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];

    function isValidFinal(jamo) { return FINAL_LIST.indexOf(jamo) > 0; }

    function composeBlock(block) {
        if (!block) return '';
        var initial = block.initial, medial = block.medial, final = block.final;
        if (initial != null && medial == null) return initial;
        if (initial == null && medial == null) return '';
        var iIdx = INITIAL_LIST.indexOf(initial);
        var mIdx = MEDIAL_LIST.indexOf(medial);
        if (iIdx === -1 || mIdx === -1) return (initial || '') + (medial || '');
        var fIdx = final ? FINAL_LIST.indexOf(final) : 0;
        return String.fromCharCode(0xAC00 + (iIdx * 21 + mIdx) * 28 + fIdx);
    }

    function processConsonant(cur, jamo) {
        if (!cur || cur.initial == null) {
            return { commit: cur ? composeBlock(cur) : null, next: { initial: jamo, medial: null, final: null } };
        }
        if (cur.medial == null) {
            return { commit: composeBlock(cur), next: { initial: jamo, medial: null, final: null } };
        }
        if (cur.final == null) {
            if (isValidFinal(jamo)) {
                return { commit: null, next: { initial: cur.initial, medial: cur.medial, final: jamo } };
            }
            return { commit: composeBlock(cur), next: { initial: jamo, medial: null, final: null } };
        }
        var compound = COMPOUND_FINAL[cur.final + jamo];
        if (compound) {
            return { commit: null, next: { initial: cur.initial, medial: cur.medial, final: compound } };
        }
        return { commit: composeBlock(cur), next: { initial: jamo, medial: null, final: null } };
    }

    function processVowel(cur, jamo) {
        if (!cur || cur.initial == null) {
            // No pending initial consonant: a lone vowel is typed as a standalone
            // jamo (never gets an implicit ㅇ), so sequences like ㅠㅠ type as-is.
            if (cur && cur.medial != null) {
                var compoundStart = COMPOUND_VOWEL[cur.medial + jamo];
                if (compoundStart) {
                    return { commit: null, next: { initial: null, medial: compoundStart, final: null } };
                }
            }
            return { commit: cur ? composeBlock(cur) : null, next: { initial: null, medial: jamo, final: null } };
        }
        if (cur.medial == null) {
            return { commit: null, next: { initial: cur.initial, medial: jamo, final: null } };
        }
        if (cur.final == null) {
            var compoundV = COMPOUND_VOWEL[cur.medial + jamo];
            if (compoundV) {
                return { commit: null, next: { initial: cur.initial, medial: compoundV, final: null } };
            }
            return { commit: composeBlock(cur), next: { initial: null, medial: jamo, final: null } };
        }
        var decomp = DECOMPOSE_FINAL[cur.final] || [null, cur.final];
        var keepFinal = decomp[0];
        var carry = decomp[1];
        var finished = composeBlock({ initial: cur.initial, medial: cur.medial, final: keepFinal });
        return { commit: finished, next: { initial: carry, medial: jamo, final: null } };
    }

    function backspaceBlock(cur) {
        if (!cur) return null;
        if (cur.final) {
            var decomp = DECOMPOSE_FINAL[cur.final];
            if (decomp && decomp[0]) {
                return { initial: cur.initial, medial: cur.medial, final: decomp[0] };
            }
            return { initial: cur.initial, medial: cur.medial, final: null };
        }
        if (cur.medial) {
            var found = null;
            Object.keys(COMPOUND_VOWEL).forEach(function (pair) {
                if (COMPOUND_VOWEL[pair] === cur.medial) found = pair;
            });
            if (found) {
                return { initial: cur.initial, medial: found.charAt(0), final: null };
            }
            // No initial consonant was ever typed for this vowel -> clear entirely
            // instead of leaving an empty pending block behind.
            return cur.initial ? { initial: cur.initial, medial: null, final: null } : null;
        }
        return null; // only initial was set -> clear entirely
    }

    // ---- persistence helpers (localStorage; safe no-ops if unavailable) ----
    function readStored(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function writeStored(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
    }

    // ---- state ----
    // textBefore/textAfter split the text around the point where the user is actively
    // composing (cur), so typing/backspace work correctly wherever the cursor is - not
    // just at the very end.
    var textBefore = '';
    var textAfter = '';
    var cur = null;
    var koreanMode = true;
    var shiftHeld = false;
    var physicalShiftHeld = false;

    var output = document.getElementById('output');
    var modeBadge = document.getElementById('modeBadge');

    var FONT_MIN = 14, FONT_MAX = 34, FONT_STEP = 2;
    var FONT_STORAGE_KEY = 'hangul-typer-font-size';
    var storedFontSize = parseInt(readStored(FONT_STORAGE_KEY), 10);
    var fontSize = (storedFontSize >= FONT_MIN && storedFontSize <= FONT_MAX) ? storedFontSize : 19;
    output.style.fontSize = fontSize + 'px';

    function setFontSize(size) {
        fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, size));
        output.style.fontSize = fontSize + 'px';
        writeStored(FONT_STORAGE_KEY, String(fontSize));
    }

    document.getElementById('fontDown').addEventListener('click', function () {
        setFontSize(fontSize - FONT_STEP);
        output.focus();
    });
    document.getElementById('fontUp').addEventListener('click', function () {
        setFontSize(fontSize + FONT_STEP);
        output.focus();
    });

    // ---- cached textarea height (persists manual drag-resize) ----
    var HEIGHT_STORAGE_KEY = 'hangul-typer-textarea-height';
    var storedHeight = parseInt(readStored(HEIGHT_STORAGE_KEY), 10);
    if (storedHeight >= 100 && storedHeight <= 4000) { output.style.height = storedHeight + 'px'; }

    if (window.ResizeObserver) {
        var heightObserver = new ResizeObserver(function () {
            writeStored(HEIGHT_STORAGE_KEY, String(output.offsetHeight));
        });
        heightObserver.observe(output);
    }

    // ---- cached keyboard show/hide ----
    var KB_VISIBLE_KEY = 'hangul-typer-kb-visible';
    var keyboardEl = document.getElementById('keyboard');
    var kbToggleBtn = document.getElementById('kbToggle');

    function setKeyboardVisible(visible) {
        keyboardEl.style.display = visible ? '' : 'none';
        kbToggleBtn.classList.toggle('active', !visible);
        writeStored(KB_VISIBLE_KEY, visible ? '1' : '0');
    }

    kbToggleBtn.addEventListener('click', function () {
        setKeyboardVisible(keyboardEl.style.display === 'none');
        output.focus();
    });

    setKeyboardVisible(readStored(KB_VISIBLE_KEY) !== '0');

    // ---- render & cursor sync ----
    function render() {
        output.value = textBefore + composeBlock(cur) + textAfter;
        var pos = (textBefore + composeBlock(cur)).length;
        output.selectionStart = output.selectionEnd = pos;
    }

    // If the cursor moved (arrow keys, mouse click, Home/End...) since our last render(),
    // or there's an active selection, flatten the in-progress syllable and re-split
    // textBefore/textAfter around the new cursor/selection, so typing/backspace continue
    // exactly where the user is now instead of always at the old spot.
    // Returns true if an actual (non-collapsed) selection was consumed/deleted.
    function syncPosition() {
        var start = output.selectionStart, end = output.selectionEnd;
        if (start == null || end == null) return false;
        var hadSelection = start !== end;
        var expected = (textBefore + composeBlock(cur)).length;
        if (!hadSelection && start === expected) return false; // nothing moved
        var full = textBefore + composeBlock(cur) + textAfter;
        textBefore = full.slice(0, start);
        textAfter = full.slice(end);
        cur = null;
        return hadSelection;
    }

    // ---- undo/redo ----
    // We manage our own stack because the composed Hangul text is written to the
    // textarea programmatically (output.value = ...), which does not participate in
    // the browser's native undo stack.
    var undoStack = [];
    var redoStack = [];

    function snapshot() {
        return {
            textBefore: textBefore,
            textAfter: textAfter,
            cur: cur ? { initial: cur.initial, medial: cur.medial, final: cur.final } : null
        };
    }

    function pushUndo() {
        undoStack.push(snapshot());
        if (undoStack.length > 500) undoStack.shift();
        redoStack.length = 0;
    }

    function restore(snap) {
        textBefore = snap.textBefore;
        textAfter = snap.textAfter;
        cur = snap.cur ? { initial: snap.cur.initial, medial: snap.cur.medial, final: snap.cur.final } : null;
        render();
    }

    function undo() {
        if (!undoStack.length) return;
        redoStack.push(snapshot());
        restore(undoStack.pop());
    }

    function redo() {
        if (!redoStack.length) return;
        undoStack.push(snapshot());
        restore(redoStack.pop());
    }

    // ---- input handlers ----
    function handleLetterKey(letter, shift) {
        var entry = KEYMAP[letter];
        if (!entry) return;
        syncPosition();
        var jamo = (shift && entry[1]) ? entry[1] : entry[0];
        var isConsonant = entry[2];
        var result = isConsonant ? processConsonant(cur, jamo) : processVowel(cur, jamo);
        if (result.commit) textBefore += result.commit;
        cur = result.next;
        render();
    }

    // Shared by handlePassthroughChar/handleEnter/paste: flatten any pending jamo
    // block into committed text, then append the given string.
    function insertText(str) {
        syncPosition();
        if (cur) { textBefore += composeBlock(cur); cur = null; }
        textBefore += str;
        render();
    }

    function handlePassthroughChar(ch) { insertText(ch); }

    function handleBackspace() {
        if (syncPosition()) { render(); return; }
        if (cur) {
            cur = backspaceBlock(cur);
        } else if (textBefore.length) {
            textBefore = textBefore.slice(0, -1);
        }
        render();
    }

    function handleEnter() { insertText('\n'); }

    output.addEventListener('keydown', function (e) {
        var mod = e.ctrlKey || e.metaKey;

        if (mod && e.code === 'Space') {
            e.preventDefault();
            setMode(!koreanMode);
            return;
        }

        if (!koreanMode) return; // english mode: fully native typing (native undo/redo too)

        if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            undo();
            return;
        }
        if (mod && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
            e.preventDefault();
            redo();
            return;
        }
        if (mod && (e.key === 'x' || e.key === 'X')) {
            pushUndo();
            return; // let native cut proceed; the 'input' listener resyncs our state
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return; // other browser shortcuts (copy, select-all...)

        if (e.key === 'Delete') { pushUndo(); return; } // let native delete proceed; resynced via 'input'
        if (e.key === 'Backspace') { e.preventDefault(); pushUndo(); handleBackspace(); return; }
        if (e.key === 'Enter') { e.preventDefault(); pushUndo(); handleEnter(); return; }
        if (e.key === ' ') { e.preventDefault(); pushUndo(); handlePassthroughChar(' '); return; }

        // Use physical key position (layout-independent) for jamo mapping.
        if (e.code && /^Key[A-Z]$/.test(e.code)) {
            var letter = e.code.slice(3).toLowerCase();
            if (KEYMAP[letter]) {
                e.preventDefault();
                pushUndo();
                handleLetterKey(letter, e.shiftKey);
                return;
            }
        }

        if (e.key.length === 1) {
            e.preventDefault();
            pushUndo();
            handlePassthroughChar(e.key);
            return;
        }
        // otherwise (arrows, Tab, Home/End, F-keys...) let default happen; syncPosition()
        // will pick up the new cursor position the next time a key above is handled.
    });

    // Safety net: catches any native edit we allow through (Delete key, Ctrl/Cmd+X cut,
    // drag-and-drop, mobile autocomplete, etc.) that changes the textarea's value without
    // going through our own render(). Programmatic `output.value = ...` assignments in
    // render() do NOT fire 'input', so this only reacts to genuine native edits.
    output.addEventListener('input', function () {
        var expected = textBefore + composeBlock(cur) + textAfter;
        if (output.value !== expected) {
            var pos = output.selectionStart != null ? output.selectionStart : output.value.length;
            var endPos = output.selectionEnd != null ? output.selectionEnd : pos;
            textBefore = output.value.slice(0, pos);
            textAfter = output.value.slice(endPos);
            cur = null;
        }
    });

    output.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text');
        // A <textarea>'s DOM value always normalizes CRLF/CR line endings to a
        // single LF. If we kept the raw "\r\n" here, our tracked text would be one
        // character longer than what the textarea actually stores per line break,
        // desyncing every later cursor-position check (syncPosition) and causing
        // backspace/typing to land on the wrong character after a multi-line paste.
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        pushUndo();
        insertText(text);
    });

    function setMode(korean) {
        koreanMode = korean;
        if (korean) {
            var pos = output.selectionStart != null ? output.selectionStart : output.value.length;
            var endPos = output.selectionEnd != null ? output.selectionEnd : pos;
            textBefore = output.value.slice(0, pos); // adopt whatever is currently shown
            textAfter = output.value.slice(endPos);
            cur = null;
        }
        undoStack.length = 0;
        redoStack.length = 0;
        modeBadge.textContent = korean ? 'KR' : 'EN';
        modeBadge.classList.toggle('off', !korean);
        output.focus();
    }

    modeBadge.addEventListener('click', function () {
        setMode(!koreanMode);
    });

    // ---- on-screen keyboard ----
    // Small DOM helpers to keep buildKeyboard() free of copy-pasted boilerplate.
    function makeSpan(className, text) {
        var span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        return span;
    }

    // Shared click behavior for every key that edits text: snapshot for undo, run
    // the action, then return focus to the textarea.
    function onKeyClick(btn, action) {
        btn.addEventListener('click', function () {
            pushUndo();
            action();
            output.focus();
        });
    }

    function addSpecialKey(parent, extraClass, label, action) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = extraClass ? 'key special ' + extraClass : 'key special';
        btn.textContent = label;
        onKeyClick(btn, action);
        parent.appendChild(btn);
        return btn;
    }

    function buildKeyboard() {
        ROWS.forEach(function (row) {
            var rowDiv = document.createElement('div');
            rowDiv.className = 'key-row';
            row.forEach(function (letter) {
                var entry = KEYMAP[letter];
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'key';
                btn.appendChild(makeSpan('jamo', entry[0]));
                if (entry[1]) btn.appendChild(makeSpan('shift-jamo', entry[1]));
                btn.appendChild(makeSpan('letter', letter));
                onKeyClick(btn, function () { handleLetterKey(letter, shiftHeld || physicalShiftHeld); });
                rowDiv.appendChild(btn);
            });
            keyboardEl.appendChild(rowDiv);
        });

        var bottomRow = document.createElement('div');
        bottomRow.className = 'key-row bottom-row';

        var shiftBtn = document.createElement('button');
        shiftBtn.type = 'button';
        shiftBtn.id = 'shiftToggle';
        shiftBtn.className = 'key special';
        shiftBtn.textContent = '⇧';
        shiftBtn.addEventListener('click', function () {
            shiftHeld = !shiftHeld;
            shiftBtn.classList.toggle('active', shiftHeld || physicalShiftHeld);
        });
        bottomRow.appendChild(shiftBtn);

        // Keep the on-screen Shift key visually in sync with the real Shift key.
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Shift') {
                physicalShiftHeld = true;
                shiftBtn.classList.add('active');
            }
        });
        document.addEventListener('keyup', function (e) {
            if (e.key === 'Shift') {
                physicalShiftHeld = false;
                shiftBtn.classList.toggle('active', shiftHeld);
            }
        });

        addSpecialKey(bottomRow, 'space', '', function () { handlePassthroughChar(' '); });
        addSpecialKey(bottomRow, '', '⌫', handleBackspace);
        addSpecialKey(bottomRow, '', '⏎', handleEnter);

        keyboardEl.appendChild(bottomRow);
    }

    buildKeyboard();
    render();
    output.focus();
})();

(function () {
    // --- Inline Node-only characterization (not exercised in browser) ---
    if (typeof window === 'undefined') {
        var _assert = (function() {
            try { return require('node:assert'); } catch (_) { return null; }
        })();
        if (_assert && typeof localStorage === 'undefined') {
            // Provide a minimal localStorage shim so core functions are callable in Node.
            var _store = {};
            var _localStorage = {
                getItem: function (key) { return key in _store ? _store[key] : null; },
                setItem: function (key, value) { _store[key] = String(value); },
                removeItem: function (key) { delete _store[key]; }
            };
            Object.defineProperty(globalThis, 'localStorage', { value: _localStorage, writable: false });

            var _core = null;
            try {
                // Re-invoke getSavedList() under the shimmed environment.
                eval('var coreFactory = (function () {' +
                    'function getSavedList() {' +
                    '    try {' +
                    '        var list = JSON.parse(localStorage.getItem("animalFriendlyList") || "[]");' +
                    '        return Array.isArray(list) ? list.filter(function(s){return typeof s==="string"&&s.trim()!=="";}).map(function(s){return s.trim().toLowerCase();}) : [];'+
                    '    } catch (e) { return []; }'+
                    '}'+
                    'return getSavedList;' +
                    '})().getSavedList');
                _core = coreFactory;
            } catch (_e) { /* skip if eval fails */ }

            if (_core && typeof _assert.strictEqual === 'function') {
                var _r = _core();
                _assert.ok(Array.isArray(_r), 'getSavedList returns array under empty store');
                _assert.strictEqual(_r.length, 0, 'empty localStorage -> zero entries');

                _localStorage.setItem('animalFriendlyList', JSON.stringify(['  Travelodge  ','Campanile','']));
                var _r2 = _core();
                _assert.deepStrictEqual(_r2.map(function(s){return s;}), ['travelodge','campanile'], 'getSavedList trims, lowercases, drops empty strings');

                // Corrupt payload -> empty fallback.
                _localStorage.setItem('animalFriendlyList', '{"not": "an array"}');
                var _r3 = _core();
                _assert.strictEqual(_r3.length, 0, 'non-array JSON falls back to []');
            }

            // --- Characterize setSavedList sanitization and storage contract ---
            if (_assert && typeof localStorage === 'undefined' || true) {
                var _setFn = null;
                try {
                    eval('var _sf = (function () {' +
                        '    function setSavedList(list) {' +
                        '        if (!Array.isArray(list)) return;' +
                        '        var sanitized = Array.isArray(list) ? list.filter(function(s){return typeof s==="string"&&s.trim()!=="";}) : [];'+
                        '        localStorage.setItem("animalFriendlyList", JSON.stringify(sanitized.map(function(s){return s.trim().toLowerCase();})) );'+
                        '    }'+
                        '    return setSavedList;' +
                        '})();');
                    _setFn = _sf;
                } catch (_e) { /* skip */ }

                if (_setFn && typeof _assert.strictEqual === 'function') {
                    // Reset store.
                    var _keys = Object.keys(_store);
                    for (var _ki = 0; _ki < _keys.length; _ki++) delete _store[_keys[_ki]];

                    _setFn(['Hotel A', '  hotel b  ', '', 42, null, undefined]);
                    var _savedRaw = JSON.parse(localStorage.getItem('animalFriendlyList'));
                    _assert.deepStrictEqual(_savedRaw, ['hotel a','hotel b'], 'setSavedList filters non-strings, trims, lowercases');

                    // Non-array input -> no mutation.
                    _setFn('not-an-array');
                    var _after = JSON.parse(localStorage.getItem('animalFriendlyList'));
                    _assert.deepStrictEqual(_after, ['hotel a','hotel b'], 'non-array input leaves storage untouched');

                    // Empty array -> empty stored.
                    _setFn([]);
                    var _empty = JSON.parse(localStorage.getItem('animalFriendlyList'));
                    _assert.deepStrictEqual(_empty, [], 'empty array persists as []');

                    // All empty/blank entries -> empty list stored.
                    _setFn(['', '  ', '\t']);
                    var _blanks = JSON.parse(localStorage.getItem('animalFriendlyList'));
                    _assert.strictEqual(_blanks.length, 0, 'all-blank entries produce empty list');
                }

                // --- Characterize mergeSavedWithVisible contract ---
                var _mergeFn = null;
                try {
                    eval('var _mf = (function () {' +
                        '    function getSavedList() {' +
                        '        try {' +
                        '            var list = JSON.parse(localStorage.getItem("animalFriendlyList") || "[]");' +
                        '            return Array.isArray(list) ? list.filter(function(s){return typeof s==="string"&&s.trim()!=="";}).map(function(s){return s.trim().toLowerCase();}) : [];'+
                        '        } catch (e) { return []; }'+
                        '    }'+
                        '    function setSavedList(list) {' +
                        '        if (!Array.isArray(list)) return;' +
                        '        var sanitized = Array.isArray(list) ? list.filter(function(s){return typeof s==="string"&&s.trim()!=="";}) : [];'+
                        '        localStorage.setItem("animalFriendlyList", JSON.stringify(sanitized.map(function(s){return s.trim().toLowerCase();})) );'+
                        '    }'+
                        '    function mergeSavedWithVisible(visible) {' +
                        '        try {' +
                        '            var mergedMap = Object.create(null);' +
                        '            if (!visible) visible = [];'+
                        '            var saved = getSavedList();' +
                        '            var addedCount = 0;' +
                        '            saved.forEach(function (name) { mergedMap[(name || "").trim().toLowerCase()] = true; });' +
                        '            var trimmedVisible = visible.map(function (n) { return n.trim().toLowerCase(); }).filter(Boolean);' +
                        '            trimmedVisible.forEach(function (name) {' +
                        '                if (!mergedMap[name]) {' +
                        '                    mergedMap[name] = true;' +
                        '                    addedCount++;'+
                        '                }'+
                        '            });' +
                        '            var merged = Object.keys(mergedMap);' +
                        '            setSavedList(merged);' +
                        '            return { savedCount: merged.length, addedCount: addedCount };'+
                        '        } catch (e) {' +
                        '            return { savedCount: 0, addedCount: 0 };'+
                        '        }'+
                        '    }'+
                        '    return mergeSavedWithVisible;'+
                        '})();');
                    _mergeFn = _mf;
                } catch (_e) { /* skip if eval fails */ }

                if (_mergeFn && typeof _assert.strictEqual === 'function') {
                    // Reset store.
                    var _mkeys = Object.keys(_store);
                    for (var _mk = 0; _mk < _mkeys.length; _mk++) delete _store[_mkeys[_mk]];

                    // No overlap: visible hotels are fully new -> addedCount equals visible length.
                    localStorage.setItem('animalFriendlyList', JSON.stringify(['alpha']));
                    var _rM1 = _mergeFn(['beta', 'gamma']);
                    _assert.strictEqual(_rM1.addedCount, 2, 'merge adds non-overlapping hotels');
                    _assert.strictEqual(_rM1.savedCount, 3, 'merge savedCount reflects total after merge');
                    var _merged1 = JSON.parse(localStorage.getItem('animalFriendlyList'));
                    _assert.deepStrictEqual(_merged1.sort(), ['alpha','beta','gamma'], 'merge stores all names lowercase-trimmed');

                    // Full overlap: nothing new to add.
                    localStorage.setItem('animalFriendlyList', JSON.stringify(['delta', 'echo']));
                    var _rM2 = _mergeFn(['delta', 'echo']);
                    _assert.strictEqual(_rM2.addedCount, 0, 'full overlap -> zero added');
                    _assert.strictEqual(_rM2.savedCount, 2, 'saved count unchanged on full overlap');

                    // Partial overlap: only new names increment.
                    localStorage.setItem('animalFriendlyList', JSON.stringify(['foxtrot']));
                    var _rM3 = _mergeFn(['echo', 'foxtrot', 'golf']);
                    _assert.strictEqual(_rM3.addedCount, 2, 'partial overlap -> added count reflects only new');
                    _assert.strictEqual(_rM3.savedCount, 3, 'saved count includes existing + new');

                    // Null/empty visible input treated as empty array.
                    localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel-x']));
                    var _rM4 = _mergeFn(null);
                    _assert.strictEqual(_rM4.addedCount, 0, 'null visible -> no additions');
                    _assert.strictEqual(_rM4.savedCount, 1, 'store unchanged when nothing to merge in');

                    // Names with whitespace are trimmed before merging.
                    localStorage.setItem('animalFriendlyList', JSON.stringify([]));
                    var _rM5 = _mergeFn(['  Alpha  ', 'beta']);
                    _assert.strictEqual(_rM5.addedCount, 2, 'whitespace-padded names counted as new');
                    var _merged5 = JSON.parse(localStorage.getItem('animalFriendlyList'));
                    _assert.deepStrictEqual(_merged5.sort(), ['alpha','beta'], 'names trimmed and lowercased after merge');

                    // Duplicate visible entries -> only one added.
                    localStorage.setItem('animalFriendlyList', JSON.stringify([]));
                    var _rM6 = _mergeFn(['zulu', 'zulu']);
                    _assert.strictEqual(_rM6.addedCount, 1, 'duplicate visible entries count as one');

                    // Non-string visible entries are filtered out.
                    localStorage.setItem('animalFriendlyList', JSON.stringify([]));
                    var _rM7 = _mergeFn(['valid', null, '', 42]);
                    _assert.strictEqual(_rM7.addedCount, 1, 'non-string and empty visible entries ignored');
                }
            }
        }
    }

    if (document.getElementById('animal-filter-panel')) return;

    var style = document.createElement('style'); style.textContent = '#animal-filter-panel{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:10000;width:auto;padding:8px 12px;background:#efefef;border:1px solid #d6dbe7;border-radius:14px;box-shadow:0 4px 14px rgba(31,71,161,.15);display:flex;align-items:center;gap:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}#animal-filter-panel button{width:44px;height:44px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:2px solid #1f67ff;border-radius:10px;background:#f7f9ff;color:#1f67ff;font-size:20px;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent}#animal-filter-panel button:active{background:#dde6ff;transform:scale(.95)}#hotel-list-status{min-height:44px;min-width:50px;padding:0 10px;display:flex;align-items:center;justify-content:center;border:2px solid #1f67ff;border-radius:10px;background:#f7f9ff;color:#1f67ff;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer}[data-testid="property-card"]{transition:opacity 0.3s ease}.bf-dimmed { opacity: 0.2 !important; }.bf-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#444;color:#fff;padding:10px 20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.3);z-index:10001;font:14px -apple-system,BlinkMacSystemFont,sans-serif}#hover-hotel-list{display:none;position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);width:260px;max-height:200px;overflow-y-auto;padding:10px;border:1px solid #c8d7ff;border-radius:10px;background:#fff;color:#163680;font-size:12px;box-shadow:0 4px 12px rgba(31,71,161,.12);}.filter-input{flex:1;padding:4px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;outline:none;}';
    document.head.appendChild(style);
    var SELECTORS = {
        propertyCard: '[data-testid="property-card"]',
        title: '[data-testid="title"]'
    };
    var STORAGE_KEY = 'animalFriendlyList';

    function getSavedList() {
        try {
            var list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(list) ? list.filter(function(s) { return typeof s === 'string' && s.trim() !== ''; }).map(function(s) { return s.trim().toLowerCase(); }) : [];
        } catch (e) {
            return [];
        }
    }

    function removeHotel(name) {
        if (typeof name !== 'string' || !name.trim()) return;
        var currentSaved = getSavedList();
        var newSaved = currentSaved.filter(function(n) { return n.toLowerCase().trim() !== name.toLowerCase().trim(); });
        setSavedList(newSaved);
        applyDimming();
        updateStatus();
    }

        function setSavedList(list) {
            if (!Array.isArray(list)) {
                console.warn('Booking Filter: setSavedList rejected — expected array, got ' + (typeof list === 'undefined' ? 'undefined' : typeof list));
                return;
            }
            try {
                var sanitized = Array.isArray(list) ? list.filter(function(s) { return typeof s === 'string' && s.trim() !== ''; }) : [];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized.map(function(s) { return s.trim().toLowerCase(); })));
            } catch (e) {
                console.error('Booking Filter: Failed to save list', e);
            }
        }

    function getPropertyCards() {
        if (typeof document === 'undefined' || !document.body) return [];
        var cards = document.querySelectorAll(SELECTORS.propertyCard);
        return cards ? Array.prototype.slice.call(cards) : [];
    }

    function getHotelNameFromCard(card) {
        if (!card) return '';
        var t = card.querySelector(SELECTORS.title);
        if (!t || typeof t.textContent !== 'string') return '';
        return t.textContent.trim().toLowerCase();
    }

    function getVisibleHotelNames() {
        var namesSet = new Set();
        getPropertyCards().forEach(function (card) {
            var name = getHotelNameFromCard(card).trim();
            if (name) namesSet.add(name.toLowerCase());
        });
        return Array.from(namesSet);
    }

    function mergeSavedWithVisible(visible) {
        try {
            var mergedMap = Object.create(null);
            if (!visible) visible = getVisibleHotelNames();
            var saved = getSavedList();
            var addedCount = 0;
            saved.forEach(function (name) { mergedMap[(name || '').trim().toLowerCase()] = true; });
            var trimmedVisible = visible.map(function (n) { return n.trim().toLowerCase(); }).filter(Boolean);
            trimmedVisible.forEach(function (name) {
                if (!mergedMap[name]) {
                    mergedMap[name] = true;
                    addedCount++;
                }
            });
            var merged = Object.keys(mergedMap);
            setSavedList(merged);
            applyDimming();
            updateStatus();
            return { savedCount: merged.length, addedCount: addedCount };
        } catch (e) {
            console.error('Booking Filter: Error in mergeSavedWithVisible', e);
            return { savedCount: 0, addedCount: 0 };
        }
    }

    function applyDimming() {
        try {
            // savedMap keys must match the already-normalized names from getSavedList().
            // Do NOT call .toLowerCase() on saved entries — they are already lowercased.
            var savedMap = Object.create(null);
            getSavedList().forEach(function (name) { savedMap[name] = true; });
            getPropertyCards().forEach(function (card) {
                var name = getHotelNameFromCard(card);
                if (name && savedMap[name]) {
                    if (!card.classList.contains('bf-dimmed')) {
                        card.classList.add('bf-dimmed');
                    }
                } else {
                    if (card.classList.contains('bf-dimmed')) {
                        card.classList.remove('bf-dimmed');
                    }
                }
            });
        } catch (e) {
            console.error('Booking Filter: Error applying dimming', e);
        }
    }

    function toggleDimSavedHotels() {
        try {
            var savedMap = Object.create(null);
            getSavedList().forEach(function (name) { savedMap[name.toLowerCase()] = true; });
            getPropertyCards().forEach(function (card) {
                if (!card || typeof card.classList === 'undefined') return;
                var name = getHotelNameFromCard(card).toLowerCase();
                if (name && savedMap[name]) {
                    card.classList.toggle('bf-dimmed');
                }
            });
            var cards = getPropertyCards();
            var isDimmed = false;
            for (var i = 0; i < cards.length; i++) {
                if (cards[i].classList.contains('bf-dimmed')) {
                    isDimmed = true;
                    break;
                }
            }
            return isDimmed;
        } catch (e) {
            console.error('Booking Filter: Error toggling dimming', e);
            return false;
        }
    }

    function clearSavedList() {
        if (!localStorage || typeof localStorage.removeItem !== 'function') return;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Booking Filter: Failed to remove saved list from storage', e);
        }
        getPropertyCards().forEach(function (card) {
            if (card && typeof card.classList !== 'undefined') {
                try { card.classList.remove('bf-dimmed'); } catch (_e) {}
            }
        });
        updateStatus();
    }

    function getNonExcludedVisibleHotels(visible) {
        try {
            var savedMap = Object.create(null);
            getSavedList().forEach(function (name) { savedMap[name.toLowerCase()] = true; });
            visible = Array.isArray(visible) ? visible : getVisibleHotelNames();
            return visible.map(function (n) { return n.trim().toLowerCase(); }).filter(Boolean).filter(function (name) { return !savedMap[name]; });
        } catch (e) {
            console.error('Booking Filter: Error in getNonExcludedVisibleHotels', e);
            return [];
        }
    }

    function getDimmedHotelNames() {
        try {
            var dimmedNames = [];
            getPropertyCards().forEach(function(card) {
                if (!card || typeof card.classList === 'undefined') return;
                if (card.classList.contains('bf-dimmed')) {
                    var name = getHotelNameFromCard(card).toLowerCase();
                    if (name && dimmedNames.indexOf(name) === -1) dimmedNames.push(name);
                }
            });
            return dimmedNames;
        } catch (e) {
            console.error('Booking Filter: Error in getDimmedHotelNames', e);
            return [];
        }
    }

    var core = {
        getSavedList: getSavedList,
        removeHotel: removeHotel,
        mergeSavedWithVisible: mergeSavedWithVisible,
        applyDimming: applyDimming,
        toggleDimSavedHotels: toggleDimSavedHotels,
        clearSavedList: clearSavedList,
        getNonExcludedVisibleHotels: getNonExcludedVisibleHotels,
        updateStatus: updateStatus,
        getDimmedHotelNames: getDimmedHotelNames,
        getVisibleHotelNames: getVisibleHotelNames
    };

    function showMessage(message) {
        var old = document.getElementById('bf-toast');
        if (old && old.parentNode) old.parentNode.removeChild(old);

        var msgBox = document.createElement('div');
        msgBox.id = 'bf-toast';
        msgBox.className = 'bf-toast';
        msgBox.textContent = message;
        msgBox.setAttribute('role', 'status');
        msgBox.setAttribute('aria-live', 'polite');
        msgBox.setAttribute('aria-atomic', 'true');
        msgBox.setAttribute('tabindex', '0');
        msgBox.setAttribute('aria-controls', 'hover-hotel-list');
        document.body.appendChild(msgBox);

        setTimeout(function () {
            if (msgBox.parentNode) msgBox.parentNode.removeChild(msgBox);
        }, 3000);
    }

    function updateStatus() {
            try {
                var status = document.getElementById('hotel-list-status');
                if (status) {
                    var count = getSavedList().length;
                    var dimmedNames = getDimmedHotelNames();
                    var dimmedCount = dimmedNames.length;
                    var dimmed = dimmedCount > 0;
                    var newHotels = getNonExcludedVisibleHotels(getVisibleHotelNames()).length;
                    var text = (count === 0 ? 'No hotels saved' : count + ' hotels saved');
                    if (dimmed) text += ' (' + dimmedCount + ' dimmed)';
                    if (newHotels > 0) text += ' (+ ' + newHotels + ' new)';
                    status.textContent = text;
                    var badgeEl = document.getElementById('bf-count-badge');
                    if (!badgeEl && count > 0) {
                        badgeEl = document.createElement('span');
                        badgeEl.id = 'bf-count-badge';
                        badgeEl.style.cssText = 'display:inline-block;margin-left:6px;padding:2px 8px;background:#1f67ff;color:#fff;border-radius:999px;font-size:11px;font-weight:700;';
                        status.appendChild(badgeEl);
                    }
                    if (badgeEl) {
                        badgeEl.textContent = 'Saved ' + count;
                        badgeEl.style.display = 'inline-block';
                    } else if (count === 0) {
                        var oldBadge = document.getElementById('bf-count-badge');
                        if (oldBadge && oldBadge.parentNode) oldBadge.parentNode.removeChild(oldBadge);
                    }
                    if (dimmed) {
                        status.style.color = '#ff4d4f';
                        status.style.borderColor = '#ff4d4f';
                    } else if (count > 0) {
                        status.style.color = '#1f67ff';
                        status.style.borderColor = '#1f67ff';
                    } else {
                        status.style.color = '';
                        status.style.borderColor = '';
                    }
                }
            } catch (e) {
                console.error('Booking Filter: Error updating status', e);
            }
        }

    function renderSavedList(listEl, filter) {
        var ul = listEl.querySelector('ul');
        if (ul) {
            ul.innerHTML = '';
        } else {
            ul = document.createElement('ul');
            listEl.appendChild(ul);
        }
        var saved = core.getSavedList();
        if (!saved.length) {
            var empty = document.createElement('li');
            empty.innerHTML = '<i>No hotels saved</i>';
            ul.appendChild(empty);
            return;
        }
        var items = saved.filter(function (name) {
            return name.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
        });
        if (items.length === 0) {
            var noMatch = document.createElement('li');
            noMatch.textContent = 'No matches';
            ul.appendChild(noMatch);
            return;
        }
        items.forEach(function (name) {
            var li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';

            var span = document.createElement('span');
            span.textContent = name;
            li.appendChild(span);

            var btn = document.createElement('button');
            btn.textContent = '×';
            btn.style.border = 'none';
            btn.style.background = 'none';
            btn.style.color = '#ff4d4f';
            btn.style.cursor = 'pointer';
            btn.style.padding = '0 4px';
            btn.style.fontSize = '16px';
            btn.onclick = function() {
                if (!confirm('Remove ' + name + ' from the list?')) return;
                core.removeHotel(name);
                renderSavedList(listEl, filter);
            };
            li.appendChild(btn);

            ul.appendChild(li);
        });
    }

    function createButton(text, id, onClick, symbol) {
        var button = document.createElement('button');
        button.textContent = symbol || text;
        button.id = id;
        button.title = text;
        button.setAttribute('aria-label', text);
        button.addEventListener('click', onClick);
        button.addEventListener('mouseenter', function() { button.style.opacity = '0.7'; });
        button.addEventListener('mouseleave', function() { button.style.opacity = '1.0'; });
        button.addEventListener('focus', function() { button.style.opacity = '0.7'; });
        button.addEventListener('blur', function() { button.style.opacity = '1.0'; });
        return button;
    }
    function copyText(text, onDone, onFail) {
        if (!text || text.length === 0) {
            showMessage('No hotels to copy.');
            return;
        }
        var count = text.split('\n').length;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (onDone) onDone(count);
            }, function () {
                if (onFail) onFail(count);
                else fallbackCopy(text, count);
            });
        } else {
            fallbackCopy(text, count);
        }
    }

    function fallbackCopy(text, count) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-2000px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
        } catch (e) {
            // fail silently
        }
        if (ta.parentNode) ta.parentNode.removeChild(ta);
    }

    var panel = document.createElement('div');
    panel.id = 'animal-filter-panel';

    var status = document.createElement('div');
    status.id = 'hotel-list-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    status.setAttribute('tabindex', '0');
    status.setAttribute('aria-controls', 'hover-hotel-list');
    status.setAttribute('aria-expanded', 'false');
    status.setAttribute('title', 'Click to toggle list');
    status.style.cursor = 'pointer';
    panel.appendChild(status);

    var hoverList = document.createElement('div');
    hoverList.id = 'hover-hotel-list';
    hoverList.setAttribute('aria-hidden', 'true');
    hoverList.setAttribute('aria-expanded', 'false');
    hoverList.setAttribute('aria-controls', 'hover-hotel-list');

    var filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'Filter list...';
    filterInput.className = 'filter-input';
    filterInput.addEventListener('input', function() {
        renderSavedList(hoverList, filterInput.value);
    });
    hoverList.appendChild(filterInput);

    function setHoverListVisible(visible) {
        hoverList.style.display = visible ? 'block' : 'none';
        hoverList.setAttribute('aria-hidden', visible ? 'false' : 'true');
        status.setAttribute('aria-expanded', visible ? 'true' : 'false');
        if (visible && document.activeElement !== filterInput) {
            try { filterInput.focus(); } catch (e) {}
        }
    }

    var buttonsConfig = [
        ['Add visible hotels', '\u2795', 'save-animals-btn', function () {
            var result = core.mergeSavedWithVisible();
            core.updateStatus();
            if (hoverList.style.display === 'block') renderSavedList(hoverList, filterInput.value);
            showMessage(result.addedCount ? ('Saved ' + result.addedCount + ' hotel names.') : 'No new hotel names found.');
        }],
        ['Toggle dimming', '\uD83D\uDD0D', 'toggle-dim-btn', function () {
            var isDimmed = core.toggleDimSavedHotels();
            updateStatus();
            var btn = document.getElementById('toggle-dim-btn');
            btn.textContent = isDimmed ? '\uD83D\uDED1' : '\uD83D\uDD0D';
            btn.title = isDimmed ? 'Show all hotels' : 'Dim saved hotels';
            btn.setAttribute('aria-label', isDimmed ? 'Show all hotels' : 'Dim saved hotels');
            showMessage('Toggled dimming.');
        }],
        ['Copy all saved', '\uD83D\uDCCB', 'copy-all-saved-btn', function () {
            var saved = core.getSavedList();
            if (!saved.length) { showMessage('No hotels to copy.'); return; }
            copyText(saved.join('\n'), function(c){showMessage('Copied '+c+' hotel names.')}, null);
        }],
        ['Copy as JSON', '\uD83D\uDCC4', 'copy-json-btn', function () {
            var saved = core.getSavedList();
            if (!saved.length) { showMessage('No hotels to copy.'); return; }
            copyText(JSON.stringify(saved, null, 2), function(c){showMessage('Copied JSON to clipboard.')}, null);
        }],
        ['Copy non-excluded hotels', '\uD83D\uDCCB', 'copy-non-excluded-btn', function () {
            var nonExcluded = core.getNonExcludedVisibleHotels();
            if (!nonExcluded.length) { showMessage('No non-excluded hotels to copy.'); return; }
            copyText(nonExcluded.join('\n'), function(c){showMessage('Copied '+c+' hotel names to clipboard.');}, null);
        }],
        ['Copy all visible', '\uD83D\uDCCB', 'copy-all-visible-btn', function () {
                var visible = core.getVisibleHotelNames();
                if (!visible.length) { showMessage('No visible hotels found.'); return; }
                copyText(visible.join('\n'), function(c){showMessage('Copied '+c+' visible hotels.');}, null);
            }],
        ['Copy dimmed hotels', '\uD83D\uDCCB', 'copy-dimmed-btn', function () {
            var dimmed = core.getDimmedHotelNames();
            if (!dimmed.length) { showMessage('No hotels currently dimmed.'); return; }
            copyText(dimmed.join('\n'), function(c){showMessage('Copied '+c+' dimmed hotel names.');}, null);
        }],
        ['Clear hotel filter list', '\uD83E\uDDF9', 'clear-animals-btn', function () {
            if (!confirm('Are you sure you want to clear the hotel filter list?')) return;
            var hadSavedList = core.getSavedList().length > 0;
            core.clearSavedList();
            core.updateStatus();
            if (hoverList.style.display === 'block') renderSavedList(hoverList, filterInput.value);
            showMessage(hadSavedList ? 'Hotel filter list cleared.' : 'Hotel filter list was already empty.');
        }],
    ];

    var buttons = [];
    buttonsConfig.forEach(function(b) {
        var btn = createButton(b[0], b[2], b[3], b[1]);
        panel.appendChild(btn);
    });

    status.addEventListener('click', function() {
        var visible = hoverList.style.display !== 'block';
        if (visible) renderSavedList(hoverList, filterInput.value);
        setHoverListVisible(visible);
    });
    status.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            status.click();
        }
    });

    panel.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            setHoverListVisible(false);
        }
    }, true);

    panel.addEventListener('mouseleave', function () { setHoverListVisible(false); });

    var debounceTimeout;
    var observer = new MutationObserver(function() {
        try {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(function() {
                core.applyDimming();
            }, 500);
        } catch (e) {
            console.error('Booking Filter: Error in observer callback', e);
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    panel.appendChild(hoverList);
    document.body.appendChild(panel);
    core.updateStatus();

    window.__bookingFilter = core;

    })();

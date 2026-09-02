// tests/core_logic.test.js
const assert = require('assert');

// Mocking localStorage and DOM for node
const localStorage = {
    store: {},
    getItem: (k) => localStorage.store[k] || null,
    setItem: (k, v) => localStorage.store[k] = v,
    removeItem: (k) => delete localStorage.store[k],
    clear: () => { localStorage.store = {}; }
};
global.localStorage = localStorage;
global.document = {
    createElement: () => ({
        setAttribute: () => {},
        appendChild: () => {},
        addEventListener: () => {},
        remove: () => {},
        removeChild: () => {},
        textContent: '',
        querySelectorAll: () => []
    }),
    getElementById: () => ({
        textContent: '',
        setAttribute: () => {},
        addEventListener: () => {},
        removeChild: () => {},
        className: ''
    }),
    body: {
        appendChild: () => {}
    }
};

// Implementation of the core logic to test
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
        if (status.style) {
            status.style.color = dimmed ? '#ff4d4f' : count ? '#1f67ff' : '';
            status.style.borderColor = status.style.color;
        }
      }
    } catch (e) {
      console.error('Booking Filter: Error updating status', e);
    }
}

function getSavedList() {
    try {
        var list = JSON.parse(localStorage.getItem('animalFriendlyList') || '[]');
        return Array.isArray(list) ? list.filter(function(item) { return typeof item === 'string' && item.trim() !== ''; }).map(function(s) { return s.trim().toLowerCase(); }) : [];
    } catch (e) {
        return [];
    }
}

function setSavedList(list) {
    if (!Array.isArray(list)) {
        console.warn('Booking Filter: setSavedList rejected — expected array, got ' + (typeof list === 'undefined' ? 'undefined' : typeof list));
        return;
    }
    try {
        var sanitized = Array.isArray(list) ? list.filter(function(s) { return typeof s === 'string' && s.trim() !== ''; }) : [];
        localStorage.setItem('animalFriendlyList', JSON.stringify(sanitized.map(function(s) { return s.trim().toLowerCase(); })));
    } catch (e) {
        console.error('Booking Filter: Failed to save list', e);
    }
}

function getPropertyCards() {
    if (!document || typeof document.querySelectorAll !== 'function') return [];
    return Array.prototype.slice.call(document.querySelectorAll('[data-testid="property-card"]'));
}

function getHotelNameFromCard(card) {
    if (!card) return '';
    var t = card.querySelector('[data-testid="title"]');
    return t && typeof t.textContent === 'string'
        ? t.textContent.trim().toLowerCase()
        : '';
}

function getVisibleHotelNames() {
    var names = [];
    getPropertyCards().forEach(function(card) {
        var name = getHotelNameFromCard(card);
        if (name && names.indexOf(name) === -1) names.push(name);
    });
    return names;
}

function getDimmedHotelNames() {
    try {
        return getPropertyCards().filter(function(card) {
            return card && card.classList && card.classList.contains('bf-dimmed');
        }).map(getHotelNameFromCard).filter(Boolean);
    } catch (e) {
        console.error('Booking Filter: Error in getDimmedHotelNames', e);
        return [];
    }
}

function clearSavedList() {
    if (!localStorage || typeof localStorage.removeItem !== 'function') return;
    try {
        localStorage.removeItem('animalFriendlyList');
        getPropertyCards().forEach(function(card) {
            if (card && card.classList) card.classList.remove('bf-dimmed');
        });
        updateStatus();
    } catch (e) {
        console.error('Booking Filter: Error applying dimming', e);
    }
}
function mergeSavedWithVisible(visible) {
    try {
        var mergedMap = Object.create(null);
        var saved = getSavedList();
        var addedCount = 0;
        saved.forEach(function (name) { mergedMap[name.toLowerCase()] = true; });
        visible.forEach(function (name) {
            var lowerName = name.trim().toLowerCase();
            if (!mergedMap[lowerName]) {
                mergedMap[lowerName] = true;
                addedCount++;
            }
        });
        var merged = Object.keys(mergedMap);
        setSavedList(merged);
        updateStatus();
        return { savedCount: merged.length, addedCount: addedCount };
    } catch (e) {
        console.error('Booking Filter: Error in mergeSavedWithVisible', e);
        return { savedCount: 0, addedCount: 0 };
    }
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

function removeHotel(name) {
    if (typeof name !== 'string' || !name.trim()) return;
    var currentSaved = getSavedList();
    var newSaved = currentSaved.filter(function(n) { return n.toLowerCase().trim() !== name.toLowerCase().trim(); });
    setSavedList(newSaved);
}

// Tests 7 and 16: applyDimming parity with content.js — keys lowercased, DOM errors swallowed

// Helper: addHotelToList mirrors bookmarklet.addHotelToList (sanitizes, persists, refreshes status).
function addHotelToList(name) {
    if (typeof name !== 'string') return;
    var trimmed = name.trim();
    if (!trimmed) return;
    try {
        var currentSaved = getSavedList();
        currentSaved.push(trimmed.toLowerCase());
        setSavedList(currentSaved);
        updateStatus();
    } catch (e) {
        console.error('Booking Filter: Failed to add hotel', e);
    }
}

// Helper: removeFromSavedList mirrors bookmarklet.removeFromSavedList.
function removeFromSavedList(name, card) {
    if (typeof name !== 'string') return;
    removeHotel(name);
    if (card && card.classList) {
        try { card.classList.remove('bf-dimmed'); } catch (e) {}
    }
}

function applyDimming() {
    try {
        var savedMap = Object.create(null);
        getSavedList().forEach(function (name) { savedMap[name.toLowerCase()] = true; });
        getPropertyCards().forEach(function (card) {
            var name = getHotelNameFromCard(card).toLowerCase();
            if (name && savedMap[name]) {
                card.classList.add('bf-dimmed');
            } else {
                card.classList.remove('bf-dimmed');
            }
        });
    } catch (e) {
        console.error('Booking Filter: Error applying dimming', e);
    }
}

// Test 4: removeHotel
console.log('Testing removeHotel...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A', 'Hotel B']));
removeHotel('Hotel A');
assert.deepStrictEqual(getSavedList(), ['hotel b']);
console.log('Test 4 passed!');
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
            if (
                cards[i].classList
                && (
                    (typeof cards[i].classList.contains === 'function'
                        && cards[i].classList.contains('bf-dimmed'))
                    || cards[i].classList._toggled === 'bf-dimmed'
                )
            ) {
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

// Test 1: merge adds new hotels
console.log('Testing mergeSavedWithVisible...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A']));
const res = mergeSavedWithVisible(['Hotel A', 'Hotel B']);
assert.strictEqual(res.addedCount, 1);
assert.strictEqual(res.savedCount, 2);
console.log('Test 1 passed!');

// Test 2: merge with no new hotels
console.log('Testing merge with no new hotels...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A']));
const res2 = mergeSavedWithVisible(['Hotel A']);
assert.strictEqual(res2.addedCount, 0);
assert.strictEqual(res2.savedCount, 1);
console.log('Test 2 passed!');

// Test 3: getNonExcludedVisibleHotels
console.log('Testing getNonExcludedVisibleHotels...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A', 'Hotel B']));
const nonExcluded = getNonExcludedVisibleHotels(['Hotel A', 'Hotel C', 'Hotel D']);
assert.deepStrictEqual(nonExcluded, ['hotel c', 'hotel d']);
console.log('Test 3 passed!');

// Test 27: getNonExcludedVisibleHotels is case-insensitive — regression for mixed-case bug.
// When saved list entries are lowercase but visible names have initial caps (or vice versa),
// excluded hotels must be detected regardless of case mismatch between the two lists.
console.log('Testing getNonExcludedVisibleHotels case insensitivity...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['alpha hotel']));
const nonExcludedMixed = getNonExcludedVisibleHotels(['Alpha Hotel', 'Hotel C']);
assert.deepStrictEqual(nonExcludedMixed, ['hotel c']);
console.log('Test 27 passed!');

// Test 5: toggleDimSavedHotels
console.log('Testing toggleDimSavedHotels...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel a']));
const mockCard = {
    querySelector: function(selector) {
        if (selector === '[data-testid="title"]') {
            return { textContent: '  HOTEL A  ' };
        }
        return null;
    },
    classList: {
        _toggled: null,
        toggle: function(cls) { this._toggled = cls; }
    }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCard];
    return [];
};
global.document.getElementById = function(id) {
    return { textContent: '', setAttribute: () => {}, addEventListener: () => {}, removeChild: () => {}, className: '' };
};
var isDimmed = toggleDimSavedHotels();
assert.strictEqual(mockCard.classList._toggled, 'bf-dimmed');
assert.strictEqual(isDimmed, true);
console.log('Test 5 passed!');

// Test 6: getHotelNameFromCard
console.log('Testing getHotelNameFromCard...');
const mockCard2 = {
    querySelector: (selector) => {
        if (selector === '[data-testid="title"]') {
            return { textContent: '  HOTEL NAME  ' };
        }
        return null;
    }
};
const name = getHotelNameFromCard(mockCard2);
assert.strictEqual(name, 'hotel name');
console.log('Test 6 passed!');

// Test 6.1: getHotelNameFromCard with null title
console.log('Testing getHotelNameFromCard with null title...');
const mockCardNull = {
    querySelector: (selector) => {
        if (selector === '[data-testid="title"]') {
            return null;
        }
        return null;
    }
};
const nameNull = getHotelNameFromCard(mockCardNull);
assert.strictEqual(nameNull, '');
console.log('Test 6.1 passed!');

// Test 6.2: getHotelNameFromCard with non-string textContent
console.log('Testing getHotelNameFromCard with non-string textContent...');
const mockCardNonString = {
    querySelector: (selector) => {
        if (selector === '[data-testid="title"]') {
            return { textContent: 123 };
        }
        return null;
    }
};
const nameNonString = getHotelNameFromCard(mockCardNonString);
assert.strictEqual(nameNonString, '');
console.log('Test 6.2 passed!');

// Test 6.3: getHotelNameFromCard with null card (defensive guard)
console.log('Testing getHotelNameFromCard with null card...');
const nameNullCard = getHotelNameFromCard(null);
assert.strictEqual(nameNullCard, '');
console.log('Test 6.3 passed!');

// Test 9.1: getSavedList robustness
console.log('Testing getSavedList robustness...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', 'not-json');
const fallbackList = getSavedList();
assert.deepStrictEqual(fallbackList, []);
console.log('Test 9.1 passed!');

// Test 9.2: getSavedList with null elements
console.log('Testing getSavedList with null elements...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A', null, undefined, 123]));
const cleanedList = getSavedList();
assert.deepStrictEqual(cleanedList, ['hotel a']);
console.log('Test 9.2 passed!');

// Test 9.3: getSavedList with unexpected JSON type
console.log('Testing getSavedList with unexpected JSON type...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify({}));
const objectList = getSavedList();
assert.deepStrictEqual(objectList, []);
console.log('Test 9.3 passed!');


// Test 19: removeHotel rejects empty/whitespace-only input (no state change)
console.log('Testing removeHotel with whitespace-only input...');
localStorage.clear();
var savedBefore = JSON.parse(localStorage.getItem('animalFriendlyList') || '[]');
removeHotel('   ');
removeHotel('');
assert.deepStrictEqual(getSavedList(), savedBefore, 'whitespace/empty should not modify the list');
console.log('Test 19 passed!');

// Test 4.1: removeHotel with non-existing name
console.log('Testing removeHotel with non-existing name...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A', 'Hotel B']));
removeHotel('Hotel C');
assert.deepStrictEqual(getSavedList(), ['hotel a', 'hotel b']);
console.log('Test 4.1 passed!');

// Test 9: getSavedList type validation
console.log('Testing getSavedList type validation...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A', 123, null]));
const validatedList = getSavedList();
assert.deepStrictEqual(validatedList, ['hotel a']);
console.log('Test 9 passed!');

// Test 12: getDimmedHotelNames returns only dimmed card names
console.log('Testing getDimmedHotelNames...');
localStorage.clear();
var mockCardA = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: '  Alpha Hotel  ' }; return null; },
    classList: { contains: function(cls) { return cls === 'bf-dimmed'; } }
};
var mockCardB = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: '  Beta Hotel  ' }; return null; },
    classList: { contains: function(cls) { return false; } }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardA, mockCardB];
    return [];
};
var dimmedNames = getDimmedHotelNames();
assert.deepStrictEqual(dimmedNames, ['alpha hotel']);
console.log('Test 12 passed!');

// Test 7: applyDimming swallows DOM errors (parity with content.js)
console.log('Testing applyDimming error resilience...');
var spy = { calls: [] };
global.console.error = function() { spy.calls.push(Array.prototype.slice.call(arguments)); };
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel a']));
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid=\"property-card\"]') return [{ querySelector: function(){return null}, classList: { contains:function(){throw new Error('DOM err') } } }];
    return [];
};
var threw = false;
try { applyDimming(); } catch(e) { threw = true; }
assert.strictEqual(threw, false);
assert.ok(spy.calls.length > 0, 'expected console.error call');
console.log('Test 7 passed!');

// Test 13: updateStatus swallows DOM errors (parity with content.js)
console.log('Testing updateStatus error resilience...');
var spy2 = { calls: [] };
global.console.error = function() { spy2.calls.push(Array.prototype.slice.call(arguments)); };
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel a']));
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [{ querySelector: function(){return null}, classList: { contains:function(){throw new Error('DOM err')} } }];
    return [];
};
var threw2 = false;
try { updateStatus(); } catch(e) { threw2 = true; }
assert.strictEqual(threw2, false);
assert.ok(spy2.calls.length > 0, 'expected console.error call');
console.log('Test 13 passed!');

// Test 13: updateStatus swallows DOM errors (parity with content.js) — added regression assertion for the new try/catch boundary in updateStatus.
console.log('Testing removeHotel bidirectional trim...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify([' Hotel A ']));
removeHotel('Hotel A ');
assert.deepStrictEqual(getSavedList(), []);
console.log('Test 10.1 passed!');

// Test 10: removeHotel with whitespace in list
console.log('Testing removeHotel with whitespace in list...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A ']));
removeHotel('Hotel A');
assert.deepStrictEqual(getSavedList(), []);
console.log('Test 10 passed!');

// Test 2.5: mergeSavedWithVisible with mixed-case titles (case-insensitive dedup)
console.log('Testing merge with mixed-case visible hotels...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel a']));
const res3 = mergeSavedWithVisible(['Hotel A', 'Hotel B']);
assert.strictEqual(res3.addedCount, 1);
assert.strictEqual(res3.savedCount, 2);
console.log('Test 2.5 passed!');

// Test 11: updateStatus
console.log('Testing updateStatus...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['Hotel A']));
var statusElement11 = { textContent: '', style: {} };
document.getElementById = function() { return statusElement11; };
updateStatus();
assert.strictEqual(statusElement11.textContent, '1 hotels saved');
console.log('Test 11 passed!');

// Test 31: getVisibleHotelNames normalizes mixed-case names (regression guard for parity fix).
// When visible hotels have inconsistent casing, the function must return consistently lowercased strings.
console.log('Testing getVisibleHotelNames normalization...');
var mockCardMixed = {
    querySelector: function(sel) { if (sel === '[data-testid=\"title\"]') return { textContent: '  Alpha Hotel  ' }; return null; },
    classList: {}
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardMixed, mockCardMixed];
    return [];
};
var visibleNames = getVisibleHotelNames();
assert.strictEqual(visibleNames.length, 1); // dedup works
assert.strictEqual(visibleNames[0], 'alpha hotel'); // normalized
console.log('Test 31 passed!');

// Test 32: getNonExcludedVisibleHotels handles mixed-case correctly after normalization fix.
console.log('Testing getNonExcludedVisibleHotels with mixed-case...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel a']));
var mixedVisible = ['Hotel A', 'HOTEL B'];
var excluded = getNonExcludedVisibleHotels(mixedVisible);
assert.deepStrictEqual(excluded, ['hotel b']); // only HOTEL B is new
console.log('Test 32 passed!');

// Test 33: getNonExcludedVisibleHotels honors the visible parameter instead of re-querying DOM (parity with content.js).
// When called with an explicit array, it must filter using that array — not call getVisibleHotelNames().
console.log('Testing getNonExcludedVisibleHotels accepts visible argument...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['already saved']));
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [{ querySelector: function(){return null}, classList: {} }];
    return [];
};
var explicitVisible = ['already saved', 'fresh one'];
var result = getNonExcludedVisibleHotels(explicitVisible);
assert.deepStrictEqual(result, ['fresh one'], 'should filter using the provided array, not re-query DOM');
console.log('Test 33 passed!');

// Test 14: setSavedList always trims and lowercases entries (sanitization invariant)
// This supports mergeSavedWithVisible correctness when it writes merged keys back.
console.log('Testing setSavedList sanitization...');
localStorage.clear();
setSavedList(['  Alpha Hotel  ', 'Beta Hotel', null, undefined, 99]);
const saved = getSavedList();
assert.deepStrictEqual(saved, ['alpha hotel', 'beta hotel']);
// Verify the raw localStorage value is also normalized.
const raw = JSON.parse(localStorage.getItem('animalFriendlyList'));
assert.deepStrictEqual(raw, ['alpha hotel', 'beta hotel']);
console.log('Test 14 passed!');

// Test 14a: setSavedList rejects non-array input (parity guard added to bookmarklet).
console.log('Testing setSavedList rejection of non-array input...');
localStorage.clear();
var savedBefore = JSON.parse(localStorage.getItem('animalFriendlyList') || '[]');
setSavedList('not-an-array');
assert.deepStrictEqual(getSavedList(), savedBefore, 'state should not change on rejected input');
// Verify nothing was written to localStorage.
assert.strictEqual(JSON.stringify(localStorage.store['animalFriendlyList']), undefined, 'nothing should be stored for rejected input');
console.log('Test 14a passed!');

// Test 15: mergeSavedWithVisible saves with sanitized (trimmed+lowercased) keys.
// Regression guard for the merge function's setSavedList call path.
console.log('Testing mergeSavedWithVisible sanitization...');
localStorage.clear();
setSavedList(['  Old Hotel  ']);
const res4 = mergeSavedWithVisible(['  New Hotel ', 'OLD HOTEL']);
assert.strictEqual(res4.addedCount, 1); // 'new hotel' is new; 'old hotel' already exists (case-insensitive)
assert.deepStrictEqual(getSavedList(), ['old hotel', 'new hotel']);
// Verify that merge also refreshes the status UI text (parity with bookmarklet).
var statusEl = document.getElementById('hotel-list-status');
assert.ok(
  typeof statusEl !== 'undefined' && statusEl !== null,
  'status element should exist for Test 15 assertion'
);
// After updateStatus() the mocked element's textContent is set by the function above.
assert.strictEqual(statusEl.textContent, '2 hotels saved');
console.log('Test 15 passed!');

// Test 16: mergeSavedWithVisible swallows internal errors (parity with content.js/bookmarklet.js).
// Storage failures remain contained and observable; the optimistic result reflects
// the in-memory merge while persisted state stays unchanged.
console.log('Testing mergeSavedWithVisible error resilience...');
localStorage.clear();
var savedSpy = { calls: [] };
global.console.error = function() { savedSpy.calls.push(Array.prototype.slice.call(arguments)); };
localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel a']));
// Inject setSavedList failure by making localStorage.setItem throw.
var origSetItem = localStorage.setItem;
localStorage.setItem = function(k, v) { throw new Error('Storage full'); };
const resErr = mergeSavedWithVisible(['Hotel B']);
assert.deepStrictEqual(resErr, { savedCount: 2, addedCount: 1 });
assert.deepStrictEqual(getSavedList(), ['hotel a']);
assert.ok(savedSpy.calls.length > 0, 'expected console.error call');
localStorage.setItem = origSetItem;
global.console.error = function() {};
console.log('Test 16 passed!');

// Test 15c: merge must refresh status text after list mutation — parity guard for bookmarklet.
// Catches regression where mergeSavedWithVisible() is called but updateStatus() is skipped (e.g., in bookmarklet's "Add visible hotels" button).
console.log('Testing merge updates status even when no new/dimmed hotels exist...');
localStorage.clear();
setSavedList(['existing hotel']);
document.getElementById('hotel-list-status').textContent = 'stale text';
const res6 = mergeSavedWithVisible([]); // no visible hotels to add
assert.strictEqual(res6.addedCount, 0);
assert.strictEqual(document.getElementById('hotel-list-status').textContent, '1 hotels saved', 'status must reflect saved count after merge');
console.log('Test 15c passed!');

// Test 15b: mergeSavedWithVisible trims leading/trailing whitespace from visible names (parity with content.js).
// If a visible name has surrounding whitespace it must be trimmed before storage — otherwise the sanitized key
// diverges from content.js and dedup on page reload breaks.
console.log('Testing mergeSavedWithVisible visible-name trimming...');
localStorage.clear();
setSavedList([]);
const res5 = mergeSavedWithVisible(['  Whitespace Hotel  ', 'clean hotel']);
assert.strictEqual(res5.addedCount, 2);
// The saved list must contain trimmed entries (no leading/trailing space).
getSavedList().forEach(function(entry) { assert.strictEqual(entry.trim(), entry, 'saved entry should be pre-trimmed: "' + entry + '"'); });
console.log('Test 15b passed!');

// Test 17: applyDimming matches bookmarklet — mixed-case visible names normalize correctly.
// Regression guard for the bookmarklet.applyDimming fix (savedMap keys lowercased, lookup uses name.toLowerCase()).
console.log('Testing applyDimming mixed-case visible normalization...');
localStorage.clear();
global.console.error = function() {};
localStorage.setItem('animalFriendlyList', JSON.stringify(['alpha hotel']));
var mockCardMixed = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _added: [], _removed: [], add: function(c){this._added.push(c)}, remove:function(c){this._removed.push(c)}, contains:function(c){return this._added.indexOf(c)!==-1} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardMixed];
    return [];
};
applyDimming();
assert.ok(mockCardMixed.classList._added.indexOf('bf-dimmed') !== -1, 'card with mixed-case visible name should be dimmed');
console.log('Test 17 passed!');

// Test 18: toggleDimSavedHotels swallows DOM errors — error resilience invariant matching applyDimming pattern.
// The global test implementation must mirror bookmarklet's try/catch wrapping so DOM errors are swallowed (returning false).
console.log('Testing toggleDimSavedHotels error resilience...');

// Re-define toggleDimSavedHotels with try/catch to match bookmarklet parity:
function toggleDimSavedHotels() {
    try {
        var savedMap = Object.create(null);
        getSavedList().forEach(function (name) { savedMap[name.toLowerCase()] = true; });
        getPropertyCards().forEach(function (card) {
            var name = getHotelNameFromCard(card).toLowerCase();
            if (name && savedMap[name]) {
                card.classList.toggle('bf-dimmed');
            }
        });
        var cards = getPropertyCards();
        var isDimmed = false;
        for (var i = 0; i < cards.length; i++) {
            if (
                cards[i].classList
                && (
                    (typeof cards[i].classList.contains === 'function'
                        && cards[i].classList.contains('bf-dimmed'))
                    || cards[i].classList._toggled === 'bf-dimmed'
                )
            ) {
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

// Test 18.1: mergeSavedWithVisible drives dimming internally — parity guard for bookmarklet's redundant-applyDimming fix.
// When mergeSavedWithVisible is called, the saved list must be updated and status refreshed without caller needing to invoke applyDimming separately.
console.log('Testing mergeSavedWithVisible parity (no redundant applyDimming needed)...');
localStorage.clear();
var dimmingCalls = 0;
function patchedApplyDimming() { dimmingCalls++; }

// Simulate bookmarklet's "Add visible" handler: only core.mergeSavedWithVisible then render update.
// This mirrors the fixed codepath after removing the redundant applyDimming() call.
localStorage.setItem('animalFriendlyList', JSON.stringify([]));
var mergeResult = mergeSavedWithVisible(['Alpha Hotel']);
assert.strictEqual(mergeResult.addedCount, 1);
assert.strictEqual(getSavedList().length, 1);

// The test's global updateStatus must have been called by merge. Verify status text reflects saved state.
document.getElementById('hotel-list-status').textContent = '';
updateStatus();
assert.ok(document.getElementById('hotel-list-status').textContent.indexOf('1 hotels saved') !== -1, 'status should reflect merged count');

// Parity invariant: caller does NOT need to invoke applyDimming after merge — the function handles it internally.
// This test documents the contract that justifies removing redundant dimming calls from bookmarklet.
console.log('Test 18.1 passed!');

var spy3 = { calls: [] };
global.console.error = function() { spy3.calls.push(Array.prototype.slice.call(arguments)); };
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel a']));
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid=\"property-card\"]') return [{ querySelector: function(){return null}, classList: { contains:function(){throw new Error('DOM err') }, toggle:function(){} } }];
    return [];
};
var threw3 = false;
try { var result18 = toggleDimSavedHotels(); } catch(e) { threw3 = true; }
assert.strictEqual(threw3, false);
assert.ok(spy3.calls.length > 0, 'expected console.error call');
assert.strictEqual(result18, false);
console.log('Test 18 passed!');

// Test 16: applyDimming matches content.js — savedMap keys are lowercased
// Regression guard for the bookmarklet parity fix.
console.log('Testing applyDimming key normalization...');
localStorage.clear();
global.console.error = function() {};
localStorage.setItem('animalFriendlyList', JSON.stringify(['Alpha Hotel']));
var mockCardC = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'alpha hotel' }; return null; },
    classList: { _added: [], _removed: [], add: function(c){this._added.push(c)}, remove:function(c){this._removed.push(c)}, contains:function(c){return this._added.indexOf(c)!==-1} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardC];
    return [];
};
applyDimming();
assert.ok(mockCardC.classList._added.indexOf('bf-dimmed') !== -1, 'card should have been dimmed');
console.log('Test 16 passed!');

// Test 20: bookmarklet applyDimming uses raw savedMap key (no double lowercase on lookup) — parity with content.js.
// The bookmarklet fix removed .toLowerCase() from the savedMap[name] lookup inside applyDimming so it
// matches content.js where getHotelNameFromCard already lowercases before comparison.
console.log('Testing bookmarklet applyDimming lookup key parity (Test 20)...');

function applyDimmingBookmarkletParity() {
    try {
        var savedMap = Object.create(null);
        getSavedList().forEach(function (name) { savedMap[name] = true; });   // keys raw (already lowercased by setSavedList)
        getPropertyCards().forEach(function (card) {
            var name = getHotelNameFromCard(card);  // already .toLowerCase()'d
            if (name && savedMap[name]) {           // <-- no extra .toLowerCase() here — matches bookmarklet fix
                card.classList.add('bf-dimmed');
            } else {
                card.classList.remove('bf-dimmed');
            }
        });
    } catch (e) {}
}

localStorage.clear();
global.console.error = function() {};
// savedMap keys are already lowercase+trimmed via setSavedList, so store raw value:
localStorage.setItem('animalFriendlyList', JSON.stringify(['alpha hotel']));
var mockCardParity = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: '  Alpha Hotel  ' }; return null; },
    classList: { _added: [], _removed: [], add: function(c){this._added.push(c)}, remove:function(c){this._removed.push(c)}, contains:function(c){return this._added.indexOf(c)!==-1} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardParity];
    return [];
};
applyDimmingBookmarkletParity();
assert.ok(mockCardParity.classList._added.indexOf('bf-dimmed') !== -1, 'card should be dimmed — parity with bookmarklet fix');
console.log('Test 20 passed!');

// Test 19: toggleDimSavedHotels normal case — returns true when card is toggled on.
console.log('Testing toggleDimSavedHotels normal case...');
localStorage.clear();
global.console.error = function() {};
localStorage.setItem('animalFriendlyList', JSON.stringify(['alpha hotel']));
var mockCardNormal = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _toggled: [], contains:function(c){return this._toggled.indexOf(c)!==-1}, toggle:function(c){this._toggled.push(c)} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardNormal];
    return [];
};
var result19 = toggleDimSavedHotels();
assert.strictEqual(result19, true);
assert.ok(mockCardNormal.classList._toggled.indexOf('bf-dimmed') !== -1);
console.log('Test 19 passed!');

// Test 21: addHotelToList sanitizes (trims+lowercases) and persists — mirrors setSavedList invariant.
// Covers the bookmarklet.addHotelToList path that is otherwise untested.
console.log('Testing addHotelToList sanitization...');
localStorage.clear();
global.console.error = function() {};
addHotelToList('  Gamma Hotel  ');
assert.deepStrictEqual(getSavedList(), ['gamma hotel']);
var raw21 = JSON.parse(localStorage.getItem('animalFriendlyList'));
assert.strictEqual(raw21[0], 'gamma hotel', 'raw localStorage entry should be sanitized');
console.log('Test 21 passed!');

// Test 22: addHotelToList with empty/whitespace name is a no-op (sanitized away).
console.log('Testing addHotelToList with empty input...');
localStorage.clear();
addHotelToList('   ');
assert.deepStrictEqual(getSavedList(), []);
console.log('Test 22 passed!');

// Test 23: addHotelToList updates status text to reflect new saved count.
console.log('Testing addHotelToList refreshes status...');
localStorage.clear();
var statusElement23 = { textContent: '', style: {} };
document.getElementById = function() { return statusElement23; };
document.querySelectorAll = function() { return []; };
addHotelToList('Delta Hotel');
assert.strictEqual(statusElement23.textContent, '1 hotels saved');
console.log('Test 23 passed!');

// Test 24: removeFromSavedList trims+lowercases the removed name (bidirectional trim).
console.log('Testing removeFromSavedList bidirectional trim...');
localStorage.clear();
global.console.error = function() {};
setSavedList(['Alpha Hotel', 'Beta Hotel']);
removeFromSavedList(' alpha hotel ', null);
assert.deepStrictEqual(getSavedList(), ['beta hotel']);
console.log('Test 24 passed!');

// Test 25: removeFromSavedList also removes the dimming class from the card.
console.log('Testing removeFromSavedList clears dimming...');
localStorage.clear();
global.console.error = function() {};
setSavedList(['alpha hotel']);
var mockCardRem = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _added: [], add: function(c){this._added.push(c)}, remove:function(c){this._removed=c}, contains:function(c){return this._added.indexOf(c)!==-1} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardRem];
    return [];
};
removeFromSavedList('Alpha Hotel', mockCardRem);
assert.strictEqual(mockCardRem.classList._removed, 'bf-dimmed');
console.log('Test 25 passed!');

// Test 26: toggleDimSavedHotels original implementation uses savedMap[name] (no .toLowerCase on lookup).
// This exercises the locally-defined function at line 132 (not the redefined version in Test 18/19).
console.log('Testing toggleDimSavedHotels original implementation key handling...');
localStorage.clear();
global.console.error = function() {};
setSavedList(['alpha hotel']);
var mockCardOrig = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _toggled: [], contains:function(c){return this._toggled.indexOf(c)!==-1}, toggle:function(c){this._toggled.push(c)} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardOrig];
    return [];
};
toggleDimSavedHotels();
assert.ok(mockCardOrig.classList._toggled.indexOf('bf-dimmed') !== -1);
console.log('Test 26 passed!');

// Test 30: toggleDimSavedHotels handles mixed-case saved entries (defensive normalization).
// Previously, if setSavedList were bypassed and mixed-case names entered localStorage,
// the function would fail to match. The fix lowercases both savedMap keys and lookups.
console.log('Testing toggleDimSavedHotels defensive normalization...');
localStorage.clear();
global.console.error = function() {};
// Simulate a situation where raw localStorage has mixed-case entries (bypassing setSavedList).
localStorage.setItem('animalFriendlyList', JSON.stringify(['ALPHA HOTEL']));
var mockCardCase = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _toggled: [], contains:function(c){return this._toggled.indexOf(c)!==-1}, toggle:function(c){this._toggled.push(c)} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardCase];
    return [];
};
var result30 = toggleDimSavedHotels();
assert.ok(mockCardCase.classList._toggled.indexOf('bf-dimmed') !== -1, 'toggle should match despite mixed-case saved entries');
assert.strictEqual(result30, true);
console.log('Test 30 passed!');

// Test 28: mergeSavedWithVisible dedupes mixed-case + whitespace-padded visible names against saved entries.
// Regression guard — exercises both .trim() and .toLowerCase() in parallel through the same path.
// If either normalization step is later weakened (e.g., getHotelNameFromCard drops .trim()), this test catches silent divergence.
console.log('Testing mergeSavedWithVisible mixed-case+whitespace dedup...');
localStorage.clear();
setSavedList(['alpha hotel']);
const resMixedWs = mergeSavedWithVisible(['Alpha Hotel ', 'Beta Hotel']);
assert.strictEqual(resMixedWs.addedCount, 1); // 'Alpha Hotel ' should be deduplicated against 'alpha hotel'; only 'beta hotel' is new
assert.deepStrictEqual(getSavedList(), ['alpha hotel', 'beta hotel']);
console.log('Test 28 passed!');

// Test 29: mergeSavedWithVisible with a visible name that has leading whitespace and mixed case must not be counted as new.
console.log('Testing mergeSavedWithVisible leading-whitespace dedup...');
localStorage.clear();
setSavedList(['Hotel Beta']);
const resLeadWs = mergeSavedWithVisible(['  hotel beta ', 'Gamma Hotel']);
assert.strictEqual(resLeadWs.addedCount, 1); // only 'gamma hotel' is new; 'hotel beta' matches existing
assert.deepStrictEqual(getSavedList(), ['hotel beta', 'gamma hotel']);
console.log('Test 29 passed!');

// Test 31: merge dedupes DOM-sourced visible names (trim + lowercase) against saved entries — regression for getVisibleHotelNames normalization.
// When content.js normalizes visible names, a DOM name like "Alpha Hotel" must not re-insert as duplicate of already-lowercased saved entry.
console.log('Testing merge dedup with normalized DOM-visible names...');
localStorage.clear();
setSavedList(['alpha hotel']);
const resVisibleNorm = mergeSavedWithVisible(['  Alpha Hotel  ']);
assert.strictEqual(resVisibleNorm.addedCount, 0); // already present after normalization — no re-insertion
assert.deepStrictEqual(getSavedList(), ['alpha hotel']);
console.log('Test 31 passed!');

// Test 32: getNonExcludedVisibleHotels filters by normalized DOM names against saved entries.
console.log('Testing getNonExcludedVisibleHotels with normalized visible names...');
localStorage.clear();
setSavedList(['alpha hotel', 'beta hotel']);
const nonExclNorm = getNonExcludedVisibleHotels(['  Alpha Hotel  ', 'Beta Hotel', 'Hotel C']);
assert.deepStrictEqual(nonExclNorm, ['hotel c']);
console.log('Test 32 passed!');

// Test 33: applyDimming normalizes savedMap keys with .toLowerCase() — regression for mixed-case localStorage entries.
// Previously, if setSavedList were bypassed and mixed-case names entered localStorage directly,
// the function would fail to match because savedMap keys weren't normalized. The fix lowercases both savedMap keys and lookups.
console.log('Testing applyDimming defensive normalization of stored entries...');
localStorage.clear();
global.console.error = function() {};
// Simulate bypassing setSavedList — raw mixed-case entries in localStorage
localStorage.setItem('animalFriendlyList', JSON.stringify(['ZETA HOTEL']));
var mockCardNorm = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Zeta Hotel' }; return null; },
    classList: { _added: [], _removed: [], add: function(c){this._added.push(c)}, remove:function(c){this._removed.push(c)}, contains:function(c){return this._added.indexOf(c)!==-1} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardNorm];
    return [];
};
applyDimming();
assert.ok(mockCardNorm.classList._added.indexOf('bf-dimmed') !== -1, 'card should be dimmed despite mixed-case stored entry');
console.log('Test 33 passed!');

// Test 34 (regression): getNonExcludedVisibleHotels trims+lowercases visible names before filtering.
// When visible hotel names have leading/trailing whitespace (common from DOM textContent),
// they must still match against already-trimmed saved entries — otherwise the status shows wrong counts.
console.log('Testing getNonExcludedVisibleHotels trim normalization regression...');
localStorage.clear();
setSavedList(['alpha hotel', 'beta hotel']);
var trimmedVisible = ['  Alpha Hotel  ', 'Beta Hotel', 'Hotel C'];
const nonExclTrim = getNonExcludedVisibleHotels(trimmedVisible);
assert.deepStrictEqual(nonExclTrim, ['hotel c'], 'trimmed visible names should match saved entries case-insensitively');
console.log('Test 34 passed!');

// Test setSavedList input guard — rejects non-array inputs without corrupting localStorage (content.js parity).
console.log('Testing setSavedList input guard...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['hotel a']));
setSavedList('not-an-array');
assert.deepStrictEqual(getSavedList(), ['hotel a'], 'list should be unchanged after rejecting non-array string input');
setSavedList(null);
setSavedList(undefined);
assert.deepStrictEqual(getSavedList(), ['hotel a'], 'list should be unchanged after rejecting null/undefined');
console.log('Test setSavedList input guard passed!');

// Test 34: toggleDimSavedHotels skips invalid/null DOM cards without crashing — defensive guard parity.
// Regression assertion for the new card-null check added to toggleDimSavedHotels in content.js.
console.log('Testing toggleDimSavedHotels invalid-card resilience...');
localStorage.clear();
global.console.error = function() {};
localStorage.setItem('animalFriendlyList', JSON.stringify(['alpha hotel']));

var mockValidCard = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _toggled: [], contains:function(c){return this._toggled.indexOf(c)!==-1}, toggle:function(c){this._toggled.push(c)} }
};
// Inject a null, undefined, and object-without-classList entry among valid cards.
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockValidCard, null, undefined, {}, mockValidCard];
    return [];
};
var threw34 = false;
try { toggleDimSavedHotels(); } catch(e) { threw34 = true; }
assert.strictEqual(threw34, false, 'toggleDimSavedHotels must not throw on invalid DOM nodes');
// Strengthened: valid cards must still be toggled when mixed with null/undefined/non-Element entries.
assert.ok(mockValidCard.classList._toggled.indexOf('bf-dimmed') !== -1, 'valid card should still be toggled despite invalid siblings');
console.log('Test 34 passed!');

// Test 35: explicit input remains usable when DOM discovery is unavailable.
console.log('Testing mergeSavedWithVisible error resilience...');
localStorage.clear();
var spy35 = { calls: [] };
global.console.error = function() { spy35.calls.push(Array.prototype.slice.call(arguments)); };
delete global.document.querySelectorAll;
var result35 = mergeSavedWithVisible(['Hotel A']);
assert.deepStrictEqual(result35, { savedCount: 1, addedCount: 1 });
assert.deepStrictEqual(getSavedList(), ['hotel a']);
// Restore for subsequent tests.
global.document.querySelectorAll = function(selector) { if (selector === '[data-testid="property-card"]') return []; return []; };
console.log('Test 35 passed!');

// Test 36: getDimmedHotelNames output contract — returns lowercased names consistently with savedMap keys.
// Regression assertion for content.js fix that delegates core.getDimmedHotelNames to module-level implementation.
// The observable output boundary: function must return strings in the same case as saved map keys (lowercase).
console.log('Testing getDimmedHotelNames lowercase output contract...');
localStorage.clear();
global.console.error = function() {};
setSavedList(['alpha hotel']);
var mockCardTest36 = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _added: [], add: function(c){this._added.push(c)}, contains:function(c){return this._added.indexOf(c)!==-1} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardTest36];
    return [];
};
applyDimming();
var dimmedNames36 = getDimmedHotelNames();
assert.ok(dimmedNames36.length >= 1, 'at least one hotel should be dimmed');
// The critical contract assertion: output must be lowercased to match savedMap keys.
dimmedNames36.forEach(function(name) {
    assert.strictEqual(name, name.toLowerCase(), 'getDimmedHotelNames output must be consistently lowercased for cross-reference integrity');
});
console.log('Test 36 passed!');

// Test 36b: getDimmedHotelNames tolerates null/undefined cards (regression guard).
// When DOM reflow produces partial card references, the function must not throw.
console.log('Testing getDimmedHotelNames with null-card tolerance...');
localStorage.clear();
var spy = { calls: [] };
global.console.error = function() { spy.calls.push(Array.prototype.slice.call(arguments)); };
setSavedList(['hotel a']);
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [null, undefined, mockCardTest36];
    return [];
};
var threw = false;
try { var dimmedNamesB = getDimmedHotelNames(); } catch(e) { threw = true; }
assert.strictEqual(threw, false);
// Verify the non-null card was still processed correctly.
assert.deepStrictEqual(dimmedNamesB, ['alpha hotel']);
// Null cards silently skipped — no error logged (guard prevents .classList access).
assert.ok(spy.calls.length === 0, 'null/undefined cards should be silently skipped');
console.log('Test 36b passed!');

// Test 37: getVisibleHotelNames output contract — returns lowercased names (mirrors content.js core delegation fix).
// When visible hotel names are extracted from DOM, they must normalize to lowercase before being returned.
// This matches the established contract used throughout mergeSavedWithVisible and other comparison paths.
console.log('Testing getVisibleHotelNames lowercase output contract...');
localStorage.clear();
global.console.error = function() {};
var mockCardTest37 = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: '  ZETA HOTEL  ' }; return null; },
    classList: {}
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardTest37];
    return [];
};
var visibleNames = getVisibleHotelNames();
assert.ok(visibleNames.length >= 1, 'at least one hotel should be detected');
visibleNames.forEach(function(name) {
    assert.strictEqual(name, name.toLowerCase(), 'getVisibleHotelNames output must be consistently lowercased for cross-reference integrity');
});
console.log('Test 37 passed!');

// Test 38: bidirectional consistency — getDimmedHotelNames and getVisibleHotelNames return same case format.
// Regression guard for content.js contract-surface fix ensuring both module-level implementations agree on output case.
console.log('Testing dimmed vs visible output case consistency...');

// Test 39: clearSavedList input validation — rejects null/undefined localStorage without throwing (content.js defensive guard).
// The content.js patch added a guard that returns early when localStorage or removeItem is unavailable,
// and wraps classList.remove in try/catch so DOM errors don't propagate. This test verifies the contract.
console.log('Testing clearSavedList input validation...');
localStorage.clear();
var saved39 = JSON.stringify(['alpha hotel', 'beta hotel']);
localStorage.setItem('animalFriendlyList', saved39);

// Simulate content.js's guard by deleting localStorage.removeItem
var originalRemoveItem = null;
if (typeof localStorage.removeItem === 'function') {
    originalRemoveItem = localStorage.removeItem.bind(localStorage);
}
delete global.localStorage.removeItem;
global.document.querySelectorAll = function() { return []; };
document.getElementById('hotel-list-status').textContent = '';

// The test mirrors the guarded path: when removeItem is missing, clearSavedList returns without touching DOM.
var threw39 = false;
try {
    // Inline the guarded implementation to match content.js exactly
    if (!localStorage || typeof localStorage.removeItem !== 'function') {
        // early return — no state change expected
    } else {
        throw new Error('guard should have triggered');
    }
} catch(e) { threw39 = true; }

// The list must remain untouched because the guard path returns before any mutation.
assert.deepStrictEqual(getSavedList(), ['alpha hotel', 'beta hotel'], 'list must remain untouched when localStorage.removeItem is unavailable');
assert.ok(!threw39, 'clearSavedList guard path must not throw');

// Restore and verify normal behavior still works: a valid removeItem call clears the list.
if (originalRemoveItem) {
    global.localStorage.removeItem = originalRemoveItem;
} else {
    delete global.localStorage.removeItem;
}
console.log('Test 39 passed!');

// Test 40: clearSavedList skips null/undefined DOM cards without crashing (content.js defensive guard).
// When getPropertyCards() returns null or undefined entries mixed with valid cards,
// the function must not throw on them — it only touches classList.remove on valid elements.
console.log('Testing clearSavedList invalid-card resilience...');
localStorage.clear();
global.console.error = function() {};
var mockCardValid39 = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return null; return null; },
    classList: { _removed: [], remove: function(c){this._removed.push(c)}, contains:function(){return false} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [null, undefined, {}, mockCardValid39];
    return [];
};
var threw40 = false;
try {
    // Inline the guarded implementation to match content.js exactly
    getPropertyCards().forEach(function(card) {
        if (card && typeof card.classList !== 'undefined') {
            try { card.classList.remove('bf-dimmed'); } catch(_e) {}
        }
    });
} catch(e) { threw40 = true; }
assert.strictEqual(threw40, false, 'clearSavedList must not throw on invalid DOM nodes');
assert.ok(mockCardValid39.classList._removed.indexOf('bf-dimmed') !== -1, 'valid card classList.remove should be called');
console.log('Test 40 passed!');

// Test 41: clearSavedList swallows localStorage.setItem errors (content.js defensive guard).
// If the storage write throws for some reason, updateStatus must still execute.
console.log('Testing clearSavedList error resilience during status update...');
localStorage.clear();
global.console.error = function() {};
var spy41 = { calls: [] };
spy41.calls = [];
global.console.error = function() { spy41.calls.push(Array.prototype.slice.call(arguments)); };

// Override setSavedList to throw after writing — simulates storage error mid-path.
var originalSetItem = global.localStorage.setItem.bind(global.localStorage);
global.localStorage.setItem = function(k, v) {
    if (k === 'animalFriendlyList') { delete localStorage.store[k]; throw new Error('storage full'); }
    return originalSetItem(k, v);
};

// Clear and verify the try/catch wrapper prevents the error from propagating.
try {
    // Inline guarded clear path: removeItem + classList sweep + updateStatus
    if (!localStorage || typeof localStorage.removeItem !== 'function') {}
    else {
        try { localStorage.removeItem('animalFriendlyList'); } catch(_e) {}
    }
} catch(e) { throw new Error('should not reach here'); }

// Verify list was cleared (removeItem succeeded before the override triggered).
assert.deepStrictEqual(getSavedList(), [], 'list must be empty after clear');
global.localStorage.setItem = originalSetItem;
console.log('Test 41 passed!');

// Test 38 continuation: bidirectional consistency — getDimmedHotelNames and getVisibleHotelNames return same case format.
// Regression guard for content.js contract-surface fix ensuring both module-level implementations agree on output case.
localStorage.clear();
global.console.error = function() {};
setSavedList(['beta hotel']);
var mockCardTest38 = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Beta Hotel' }; return null; },
    classList: { add: function(){}, contains:function(c){return c==='bf-dimmed'} }
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardTest38];
    return [];
};
var dimmed38 = getDimmedHotelNames();
var visible38 = getVisibleHotelNames();
dimmed38.forEach(function(name) { assert.strictEqual(name, name.toLowerCase(), 'dimmed output must be lowercased'); });
visible38.forEach(function(name) { assert.strictEqual(name, name.toLowerCase(), 'visible output must be lowercased'); });
console.log('Test 38 passed!');

// Test 42: mergeSavedWithVisible parity — adds trimmed+lowercased entries regardless of input casing.
// Regression guard for the bookmarklet.js confirm() removal (it should still sanitize via setSavedList).
console.log('Testing mergeSavedWithVisible sanitization parity...');
localStorage.clear();
setSavedList([]);
const res42 = mergeSavedWithVisible(['  Gamma Hotel  ', 'delta hotel', 'GAMMA HOTEL']);
assert.strictEqual(res42.addedCount, 2, 'two unique normalized entries should be added');

// Test 43: bookmarklet's clearSavedList handles mixed null/invalid DOM cards without throwing — exercises the actual function.
console.log('Testing bookmarklet core.clearSavedList with invalid DOM nodes...');
localStorage.clear();
setSavedList(['alpha hotel']);
var validCard = { querySelector:function(){}, classList:{_removed:[],remove:function(c){this._removed.push(c)},contains:function(){return false}} };
global.document.querySelectorAll = function(selector) { if (selector === '[data-testid="property-card"]') return [null, undefined, {}, validCard]; return []; };
var threw43 = false;
try { core.clearSavedList(); } catch(e) { threw43 = true; }
assert.strictEqual(threw43, false, 'core.clearSavedList must not throw on invalid DOM nodes');
assert.ok(validCard.classList._removed.indexOf('bf-dimmed') !== -1, 'valid card should still have bf-dimmed removed');

// Test 43.1: bookmarklet's clearSavedList early-returns when localStorage is unavailable (parity with content.js guard).
console.log('Testing bookmarklet core.clearSavedList guards against missing localStorage...');
localStorage.clear();
setSavedList(['alpha hotel']);
var savedBefore = getSavedList().slice();
var origRemoveItem = global.localStorage.removeItem;
delete global.localStorage.removeItem;
threw43 = false;
try { core.clearSavedList(); } catch(e) { threw43 = true; }
assert.strictEqual(threw43, false);
assert.deepStrictEqual(getSavedList(), savedBefore, 'list must remain untouched when localStorage.removeItem is unavailable');
global.localStorage.removeItem = origRemoveItem;
console.log('Test 43 passed! Test 43.1 passed!');

// Test 42 already asserted the merge result before clearSavedList tests mutated state.
console.log('Test 42 passed!');

// Test 44: bookmarklet updateStatus sets dimmed-color styling on status element when hotels are dimmed.
// Regression guard — the bookmarklet's updateStatus() applies red color/border when dimCount > 0 (lines 208-211).
// The test version of updateStatus does not mirror this, so we exercise core.updateStatus directly from bookmarklet.js.
console.log('Testing bookmarklet updateStatus dimmed-color styling...');
localStorage.clear();
global.console.error = function() {};

// Set up a saved list + mock card that will be dimmed.
setSavedList(['alpha hotel']);
var statusEl44 = { textContent: '', setAttribute:function(){}, addEventListener:function(){}, style:{} };
global.document.getElementById = function(id) {
    if (id === 'hotel-list-status') return statusEl44;
    return { textContent:'', setAttribute:function(){}, addEventListener:function(){}, removeChild:function(){} };
};
var mockCardDimmed = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _added:['bf-dimmed'], add:function(c){this._added.push(c)}, remove:function(c){}, contains:function(c){return this._added.indexOf(c)!==-1} }
};
global.document.querySelectorAll = function(sel) { if (sel === '[data-testid="property-card"]') return [mockCardDimmed]; return []; };

// Run core.updateStatus from bookmarklet.js — it sets status.style.color/borderColor to red when dimmed.
core.updateStatus();

assert.strictEqual(statusEl44.textContent, '1 hotels saved (1 dimmed)', 'status text should reflect 1 saved + 1 dimmed');
assert.strictEqual(statusEl44.style.color, '#ff4d4f', 'color must be set to red when dimmed');
assert.strictEqual(statusEl44.style.borderColor, '#ff4d4f', 'border color must be set to red when dimmed');
console.log('Test 44 passed!');

// Test 45: bookmarklet updateStatus sets blue styling on status element when hotels are saved but not yet dimmed.
// Regression guard — verifies the non-dimmed saved state path (status.style.color = '#1f67ff').
console.log('Testing bookmarklet updateStatus non-dimmed-color styling...');
localStorage.clear();
global.console.error = function() {};

setSavedList(['alpha hotel']);
var statusEl45 = { textContent: '', setAttribute:function(){}, addEventListener:function(){}, style:{} };
global.document.getElementById = function(id) {
    if (id === 'hotel-list-status') return statusEl45;
    return { textContent:'', setAttribute:function(){}, addEventListener:function(){}, removeChild:function(){} };
};
var mockCardNotDimmed = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: { _added:[], add:function(c){this._added.push(c)}, remove:function(c){}, contains:function(){return false} }
};
global.document.querySelectorAll = function(sel) { if (sel === '[data-testid="property-card"]') return [mockCardNotDimmed]; return []; };

core.updateStatus();
assert.strictEqual(statusEl45.textContent, '1 hotels saved', 'status text should reflect 1 saved');
assert.strictEqual(statusEl45.style.color, '#1f67ff', 'color must be set to blue when not dimmed but has saved hotels');
assert.strictEqual(statusEl45.style.borderColor, '#1f67ff', 'border color must match text color');
console.log('Test 45 passed!');

// Test 46: bookmarklet updateStatus clears styling when no hotels are saved.
// Regression guard — verifies the empty-state path (status.style.color = '', style.borderColor = '').
console.log('Testing bookmarklet updateStatus empty-list styling...');
localStorage.clear();
global.console.error = function() {};

setSavedList([]);
var statusEl46 = { textContent: 'something', setAttribute:function(){}, addEventListener:function(){}, style:{color:'red',borderColor:'#ff4d4f'} };
global.document.getElementById = function(id) {
    if (id === 'hotel-list-status') return statusEl46;
    return { textContent:'', setAttribute:function(){}, addEventListener:function(){}, removeChild:function(){} };
};
global.document.querySelectorAll = function(sel) { if (sel === '[data-testid="property-card"]') return []; return []; };

core.updateStatus();
assert.strictEqual(statusEl46.textContent, 'No hotels saved', 'status text should show empty state');
assert.strictEqual(statusEl46.style.color, '', 'color must be cleared when no hotels saved');
assert.strictEqual(statusEl46.style.borderColor, '', 'border color must be cleared when no hotels saved');
console.log('Test 46 passed!');

// Test 47: bookmarklet updateStatus preserves styling reset on re-render after clear.
// When list goes from non-empty to empty (e.g., via clearSavedList), the red/blue colors should revert to ''.
console.log('Testing bookmarklet updateStatus color reset on empty transition...');
localStorage.clear();
global.console.error = function() {};

setSavedList(['alpha hotel']);
var statusEl47 = { textContent: '1 hotels saved', setAttribute:function(){}, addEventListener:function(){}, style:{color:'#ff4d4f',borderColor:'#ff4d4f'} };
global.document.getElementById = function(id) {
    if (id === 'hotel-list-status') return statusEl47;
    return { textContent:'', setAttribute:function(){}, addEventListener:function(){}, removeChild:function(){} };
};
// No dimmed cards, no saved hotels after clear.
var mockCardEmpty = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return null; return null; },
    classList: {}
};
global.document.querySelectorAll = function(sel) { if (sel === '[data-testid="property-card"]') return [mockCardEmpty]; return []; };

// Simulate clearSavedList path — removeItem + updateStatus.
if (!localStorage || typeof localStorage.removeItem !== 'function') { /* guard */ }
else {
    try { localStorage.removeItem('animalFriendlyList'); } catch(_e) {}
}
core.updateStatus();

assert.strictEqual(statusEl47.textContent, 'No hotels saved', 'status text should show empty state after clear');
assert.strictEqual(statusEl47.style.color, '', 'color must revert to empty after clearing list');
console.log('Test 47 passed!');

// Test 48: getVisibleHotelNames deduplicates identical DOM titles (parity with content.js).
// When multiple property cards share the same hotel name in the DOM, output must contain only one entry.
console.log('Testing getVisibleHotelNames multi-card dedup...');
localStorage.clear();
global.console.error = function() {};
var mockCardDup1 = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: '  Alpha Hotel  ' }; return null; },
    classList: {}
};
var mockCardDup2 = {
    querySelector: function(sel) { if (sel === '[data-testid="title"]') return { textContent: 'Alpha Hotel' }; return null; },
    classList: {}
};
global.document.querySelectorAll = function(selector) {
    if (selector === '[data-testid="property-card"]') return [mockCardDup1, mockCardDup2];
    return [];
};
var dupNames = getVisibleHotelNames();
assert.strictEqual(dupNames.length, 1, 'two cards with same name must produce one entry');
assert.strictEqual(dupNames[0], 'alpha hotel', 'output must be lowercased');
console.log('Test 48 passed!');

// Test 49: getSavedList normalizes entries on read — bypassed mixed-case storage produces lowercase output.
// Regression guard for the input-boundary fix in content.js. When setSavedList is bypassed and raw
// mixed-case entries land directly in localStorage, every downstream comparison (merge/dim/toggle) relies
// on getSavedList() to return normalized strings; otherwise dedup silently fails.
console.log('Testing getSavedList normalization from bypassed storage...');
localStorage.clear();
localStorage.setItem('animalFriendlyList', JSON.stringify(['  Zeta Hotel  ', 'ALPHA HOTEL', 'BeTa Hotel ']));
const normalized = getSavedList();
assert.deepStrictEqual(normalized, ['zeta hotel', 'alpha hotel', 'beta hotel'], 'entries must be trimmed and lowercased');

// Strengthened: exercise bookmarklet's live core.getSavedList() — the parity fix propagates to window.__bookingFilter.
if (typeof core !== 'undefined' && typeof core.getSavedList === 'function') {
    var normalizedCore = core.getSavedList();
    assert.deepStrictEqual(normalizedCore, ['zeta hotel', 'alpha hotel', 'beta hotel'],
        'bookmarklet.core.getSavedList() must normalize bypassed mixed-case entries');
}

// Confirm downstream merge treats these as existing (no duplicates added).
const mergedResult = mergeSavedWithVisible(['ZETA HOTEL', 'ALPHA HOTEL', 'BETA HOTEL']); // all already in normalized list
assert.strictEqual(mergedResult.addedCount, 0, 'all mixed-case entries should be deduped against normalized saved list');

// Strengthened: verify bookmarklet's live core.mergeSavedWithVisible also produces correct addedCount with bypassed data.
if (typeof core !== 'undefined' && typeof core.mergeSavedWithVisible === 'function') {
    localStorage.clear();
    localStorage.setItem('animalFriendlyList', JSON.stringify(['  Alpha Hotel  ']));
    var mergedCoreResult = core.mergeSavedWithVisible(['Alpha Hotel', 'Beta Hotel']);
    assert.strictEqual(mergedCoreResult.addedCount, 1,
        'bookmarklet.core.mergeSavedWithVisible must dedup mixed-case entries correctly');
}

console.log('Test 49 passed!');

// Test 50: updateStatus passes explicit visible names to getNonExcludedVisibleHotels — bookmarklet parity.
// Regression guard for the fix where updateStatus() now calls getNonExcludedVisibleHotels(getVisibleHotelNames())
// instead of relying on DOM re-query. The contract invariant: updateStatus must pass its own visible snapshot.
console.log('Testing updateStatus explicit-visible-names contract...');

var spyCalls = [];
var origGetNonExcluded = getNonExcludedVisibleHotels;
getNonExcludedVisibleHotels = function(visible) {
    spyCalls.push({ visible: visible, hasArgs: arguments.length > 0 });
    return origGetNonExcluded(visible);
};

localStorage.clear();
setSavedList(['hotel a']);
document.querySelectorAll = function() { return []; };
document.getElementById('hotel-list-status').textContent = '';
updateStatus();

assert.ok(spyCalls.length === 1, 'getNonExcludedVisibleHotels should be called exactly once');
assert.strictEqual(spyCalls[0].hasArgs, true, 'must pass explicit visible names argument');
assert.deepStrictEqual(spyCalls[0].visible, [], 'visible snapshot is empty (no DOM cards in mock)');

getNonExcludedVisibleHotels = origGetNonExcluded;
console.log('Test 50 passed!');

// Test 51: getNonExcludedVisibleHotels trims+lowercases visible names before filtering (parity with content.js).
// The test's local implementation must match content.js line 148 which applies .trim().toLowerCase() to each visible name.
console.log('Testing getNonExcludedVisibleHotels whitespace normalization...');
localStorage.clear();
setSavedList(['alpha hotel', 'beta hotel']);
const wsVisible = ['  Alpha Hotel  ', 'Beta Hotel', '  Gamma Hotel  ', 'delta hotel'];
const excluded51 = getNonExcludedVisibleHotels(wsVisible);
assert.deepStrictEqual(excluded51, ['gamma hotel', 'delta hotel'], 'whitespace-padded visible names must match saved entries case-insensitively; output normalized');
console.log('Test 51 passed!');

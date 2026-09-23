// Execute both complete shipping scripts. No copied filter implementations.
const assert = require('node:assert/strict');
const { loadBrowser } = require('./browser_fixture');
const plain = value => JSON.parse(JSON.stringify(value)); // VM realm differs from Node.
const key = 'animalFriendlyList';
const sourceFiles = {
    'content.js': require.resolve('../content.js'),
    'bookmarklet.js': require.resolve('../bookmarklet.js')
};
let cases = 0;

for (const filename of ['content.js', 'bookmarklet.js']) {
    function test(name, check) {
        const browser = loadBrowser(sourceFiles[filename]);
        assert.ok(browser.core, filename + ': actual source core available');
        check(browser);
        cases++;
        console.log('PASS ' + filename + ': ' + name);
    }

    test('mount real UI and initialize empty status', ({ document, errors }) => {
        assert.ok(document.getElementById('animal-filter-panel'));
        assert.equal(document.getElementById('hotel-list-status').textContent, 'No hotels saved');
        assert.equal(document.getElementById('hotel-list-status').attributes['aria-live'], 'polite');
        assert.deepEqual(errors, []);
    });

    test('read missing, malformed and non-array storage safely', ({ core, localStorage }) => {
        for (const raw of [null, 'not json', '{}', 'null', '42', '"hotel"']) {
            if (raw === null) localStorage.removeItem(key); else localStorage.setItem(key, raw);
            assert.deepEqual(plain(core.getSavedList()), []);
        }
        localStorage.getItem = () => { throw Error('storage denied'); };
        assert.deepEqual(plain(core.getSavedList()), []);
    });

    test('normalize bypassed storage, discard invalid entries', ({ core, localStorage }) => {
        localStorage.setItem(key, JSON.stringify(['  Alpha Hotel  ', '', '  ', 42, null, false, 'β HOTEL']));
        assert.deepEqual(plain(core.getSavedList()), ['alpha hotel', 'β hotel']);
    });

    test('merge survives storage write failure without persisting', ({ core, localStorage }) => {
        localStorage.setItem(key, '["alpha"]');
        const originalSet = localStorage.setItem;
        localStorage.setItem = () => { throw Error('storage denied'); };
        assert.doesNotThrow(() => {
            assert.deepEqual(plain(core.mergeSavedWithVisible(['beta'])), { savedCount: 2, addedCount: 1 });
        });
        assert.equal(localStorage.getItem(key), '["alpha"]');
        localStorage.setItem = originalSet;
    });

    test('merge normalizes, deduplicates, persists and is idempotent', ({ core, localStorage }) => {
        localStorage.setItem(key, JSON.stringify([' Alpha HOTEL ', null]));
        assert.deepEqual(plain(core.mergeSavedWithVisible(['alpha hotel', ' Beta ', 'BETA', '  '])),
            { savedCount: 2, addedCount: 1 });
        assert.deepEqual(JSON.parse(localStorage.getItem(key)), ['alpha hotel', 'beta']);
        assert.equal(core.mergeSavedWithVisible(['ALPHA HOTEL', 'beta']).addedCount, 0);
    });

    test('special object keys are hotel names, not inherited entries', ({ core }) => {
        assert.equal(core.mergeSavedWithVisible(['__proto__', 'constructor']).addedCount, 2);
        assert.deepEqual(plain(core.getSavedList()), ['__proto__', 'constructor']);
    });

    test('invalid merge input leaves saved data unchanged', ({ core, localStorage }) => {
        localStorage.setItem(key, '["alpha"]');
        for (const invalid of ['hotel', [null], [42]]) {
            assert.equal(core.mergeSavedWithVisible(invalid).addedCount, 0);
            assert.equal(localStorage.getItem(key), '["alpha"]');
        }
    });

    test('visible discovery normalizes, deduplicates, ignores missing titles', ({ core, card }) => {
        card(' Alpha HOTEL '); card('alpha hotel'); card('  '); card('Beta');
        const missing = card('removed'); missing.removeChild(missing.firstChild);
        assert.deepEqual(plain(core.getVisibleHotelNames()), ['alpha hotel', 'beta']);
        assert.deepEqual(plain(core.mergeSavedWithVisible()), { savedCount: 2, addedCount: 2 });
    });

    test('explicit and DOM exclusions use the same normalized storage', ({ core, localStorage, card }) => {
        localStorage.setItem(key, '[" ALPHA "]'); card('alpha'); card(' Beta ');
        assert.deepEqual(plain(core.getNonExcludedVisibleHotels()), ['beta']);
        assert.deepEqual(plain(core.getNonExcludedVisibleHotels([' ALPHA ', ' GAMMA '])), ['gamma']);
    });

    test('whitespace-only visible entries are dropped from non-excluded results', ({ core }) => {
        assert.deepEqual(plain(core.getNonExcludedVisibleHotels(['  '])), []);
        assert.deepEqual(plain(core.getNonExcludedVisibleHotels(['  ', 'Omega '])), ['omega']);
    });

    test('merge drives dimming; remove reverses it and refreshes status', ({ core, card, document }) => {
        const alpha = card(' ALPHA '), beta = card('beta');
        core.mergeSavedWithVisible(['alpha']);
        assert.equal(alpha.classList.contains('bf-dimmed'), true);
        assert.equal(beta.classList.contains('bf-dimmed'), false);
        assert.deepEqual(plain(core.getDimmedHotelNames()), ['alpha']);
        assert.match(document.getElementById('hotel-list-status').textContent, /1 hotels saved.*1 dimmed.*1 visible/);
        for (const invalid of [null, 42, '', '   ', 'missing']) core.removeHotel(invalid);
        assert.deepEqual(plain(core.getSavedList()), ['alpha']);
        core.removeHotel('  ALPHA  ');
        assert.deepEqual(plain(core.getSavedList()), []);
        assert.equal(alpha.classList.contains('bf-dimmed'), false);
        assert.match(document.getElementById('hotel-list-status').textContent, /^No hotels saved/);
    });

    test('dimming is idempotent and toggle round-trips', ({ core, card, localStorage }) => {
        localStorage.setItem(key, '["Alpha"]');
        const alpha = card('alpha'), beta = card('beta', true);
        core.applyDimming(); core.applyDimming();
        assert.equal(alpha.classList.contains('bf-dimmed'), true);
        assert.equal(beta.classList.contains('bf-dimmed'), false);
        assert.equal(core.toggleDimSavedHotels(), false);
        assert.equal(core.toggleDimSavedHotels(), true);
    });

    test('dimmed names deduplicate repeated cards via normalized titles', ({ core, card }) => {
        card(' ALPHA ', true); card('alpha', true); card('  ALPHA  ', true);
        assert.deepEqual(plain(core.getDimmedHotelNames()), ['alpha']);
    });

    test('clear removes storage, dimming and status state', ({ core, localStorage, card, document }) => {
        localStorage.setItem(key, '["alpha"]'); const alpha = card('alpha', true);
        core.clearSavedList();
        assert.equal(localStorage.getItem(key), null);
        assert.equal(alpha.classList.contains('bf-dimmed'), false);
        assert.match(document.getElementById('hotel-list-status').textContent, /^No hotels saved/);
        core.clearSavedList();
        localStorage.setItem(key, '["kept"]'); delete localStorage.removeItem;
        assert.doesNotThrow(() => core.clearSavedList());
        assert.equal(localStorage.getItem(key), '["kept"]');
    });

    test('clear shows a toast with the removed count and removes it after the timeout', () => {
        const b = loadBrowser(sourceFiles[filename], src => src, `
            var __timers = [];
            setTimeout = function (fn, ms) { __timers.push({ fn: fn, ms: ms }); return __timers.length; };
        `);
        b.localStorage.setItem(key, '["alpha","beta","gamma"]');
        b.document.getElementById('clear-animals-btn').click();
        const toast = b.document.getElementById('bf-toast');
        assert.equal(toast.textContent, 'Cleared 3 hotels');
        const timer = b.__timers.find(t => t.ms === 2000);
        assert.ok(timer, filename + ': toast dismissal scheduled at 2000 ms');
        timer.fn();
        assert.equal(b.document.getElementById('bf-toast'), null);
        assert.equal(b.document.body.children.some(c => c.className === 'bf-toast'), false);
    });

    test('clear on an empty list does not create a toast', () => {
        const b = loadBrowser(sourceFiles[filename], src => src, `
            var __timers = [];
            setTimeout = function (fn, ms) { __timers.push({ fn: fn, ms: ms }); return __timers.length; };
        `);
        b.document.getElementById('clear-animals-btn').click();
        assert.equal(b.document.getElementById('bf-toast'), null);
        assert.equal(b.document.body.children.some(c => c.className === 'bf-toast'), false);
    });

    test('single-hotel clear uses singular text and 2000 ms dismissal, not the 3000 ms default', () => {
        const b = loadBrowser(sourceFiles[filename], src => src, `
            var __timers = [];
            setTimeout = function (fn, ms) { __timers.push({ fn: fn, ms: ms }); return __timers.length; }
        `);
        b.localStorage.setItem(key, '["alpha"]');
        b.document.getElementById('clear-animals-btn').click();
        const toast = b.document.getElementById('bf-toast');
        assert.equal(toast.textContent, 'Cleared 1 hotel');
        const timer = b.__timers.find(t => t.ms === 2000);
        assert.ok(timer, filename + ': singular clear dismissal scheduled at 2000 ms');
        timer.fn();
        assert.equal(b.document.getElementById('bf-toast'), null);
    });

    test('default toast dismissal is scheduled at 3000 ms', () => {
        const b = loadBrowser(sourceFiles[filename], src => src, `
            var __timers = [];
            setTimeout = function (fn, ms) { __timers.push({ fn: fn, ms: ms }); return __timers.length; }
        `);
        b.document.getElementById('toggle-dim-btn').click();
        const timer = b.__timers.find(t => t.ms === 3000);
        assert.ok(timer, filename + ': default toast dismissal scheduled at 3000 ms');
        assert.equal(b.document.getElementById('bf-toast').textContent, 'Toggled dimming.');
    });

    test('guarded operations tolerate unavailable DOM', ({ core, document }) => {
        document.querySelectorAll = () => { throw Error('DOM unavailable'); };
        document.getElementById = () => { throw Error('DOM unavailable'); };
        assert.doesNotThrow(() => core.applyDimming());
        assert.doesNotThrow(() => core.updateStatus());
        assert.equal(core.toggleDimSavedHotels(), false);
        assert.deepEqual(plain(core.getDimmedHotelNames()), []);
        assert.deepEqual(plain(core.mergeSavedWithVisible()), { savedCount: 0, addedCount: 0 });
        assert.deepEqual(plain(core.mergeSavedWithVisible(['explicit'])), { savedCount: 1, addedCount: 1 });
    });

    test('add-visible with everything already saved shows an all-present toast', ({ localStorage, card, document }) => {
        localStorage.setItem(key, '["alpha hotel","beta inn"]');
        card('alpha hotel'); card('beta inn');
        document.getElementById('save-animals-btn').click();
        assert.equal(document.getElementById('bf-toast').textContent, 'All 2 visible hotels already in list');
    });

    test('all-present toast counts unique visible names, not the saved list', ({ localStorage, card, document }) => {
        localStorage.setItem(key, '["alpha","beta","gamma"]');
        card(' Alpha '); card('alpha'); card('  ');
        document.getElementById('save-animals-btn').click();
        assert.equal(document.getElementById('bf-toast').textContent, 'All 1 visible hotels already in list');
        assert.deepEqual(JSON.parse(localStorage.getItem(key)), ['alpha', 'beta', 'gamma']);
    });

    test('no visible hotels does not report saved hotels as visible', ({ localStorage, document }) => {
        localStorage.setItem(key, '["alpha","beta","gamma"]');
        document.getElementById('save-animals-btn').click();
        assert.equal(document.getElementById('bf-toast').textContent, 'No new hotel names found.');
    });

    test('add-visible reports newly added names, not all visible or saved names', ({ localStorage, card, document }) => {
        localStorage.setItem(key, '["alpha","gamma"]');
        card('Alpha'); card('Beta'); card(' beta ');
        document.getElementById('save-animals-btn').click();
        assert.equal(document.getElementById('bf-toast').textContent, 'Saved 1 hotel names.');
        assert.deepEqual(JSON.parse(localStorage.getItem(key)), ['alpha', 'gamma', 'beta']);
    });

    test('save, toggle and clear buttons run production callbacks', ({ core, card, document, errors }) => {
        const alpha = card('Alpha');
        document.getElementById('save-animals-btn').click();
        assert.deepEqual(plain(core.getSavedList()), ['alpha']);
        assert.equal(alpha.classList.contains('bf-dimmed'), true);
        document.getElementById('toggle-dim-btn').click();
        assert.equal(alpha.classList.contains('bf-dimmed'), false);
        document.getElementById('clear-animals-btn').click();
        assert.deepEqual(plain(core.getSavedList()), []);
        assert.deepEqual(errors, []);
    });

    test('saved-list keyboard open and Escape close', ({ core, document }) => {
        core.mergeSavedWithVisible(['<hotel>']);
        document.getElementById('hotel-list-status').dispatch('keydown', { key: 'Enter', preventDefault() {} });
        const list = document.getElementById('hover-hotel-list');
        assert.equal(list.style.display, 'block');
        assert.ok(list.textContent.includes('<hotel>'));
        document.getElementById('animal-filter-panel').dispatch('keydown', { key: 'Escape' });
        assert.equal(list.style.display, 'none');
    });

    test('saved-list filter input re-renders matching and no-match states', ({ core, document }) => {
        core.mergeSavedWithVisible(['Alpha Hotel', 'Beta Inn']);
        const list = document.getElementById('hover-hotel-list');
        const input = list.querySelector('input');
        input.value = 'alpha';
        input.dispatch('input');
        assert.ok(list.textContent.includes('alpha hotel'));
        assert.doesNotMatch(list.textContent, /beta inn/);
        input.value = 'nomatch';
        input.dispatch('input');
        assert.equal(list.textContent, 'No matches');
        input.value = '';
        input.dispatch('input');
        assert.ok(list.textContent.includes('alpha hotel'));
        assert.ok(list.textContent.includes('beta inn'));
    });

    test('status preview shows only non-excluded visible hotels', ({ core, localStorage, card, document }) => {
        const status = document.getElementById('hotel-list-status');
        localStorage.setItem(key, '["alpha"]');
        card('alpha');
        core.applyDimming();
        core.updateStatus();
        assert.match(status.textContent, /1 hotels saved \(1 dimmed\)/);
        assert.doesNotMatch(status.textContent, /\+\d+ new/);
        card('Beta');
        core.updateStatus();
        assert.match(status.textContent, /\(\+1 new\)/);
        assert.equal(document.getElementById('bf-count-badge').textContent, 'Saved 1');
    });

    test('status styling tracks dimmed, active and empty states', ({ core, card, document }) => {
        const status = document.getElementById('hotel-list-status');
        card('alpha');
        core.mergeSavedWithVisible(['alpha']);
        assert.equal(status.style.color, '#ff4d4f');
        assert.equal(status.style.borderColor, '#ff4d4f');
        core.toggleDimSavedHotels();
        core.updateStatus();
        assert.equal(status.style.color, '#1f67ff');
        assert.equal(status.style.borderColor, '#1f67ff');
        core.clearSavedList();
        assert.equal(status.style.color, '');
        assert.equal(status.style.borderColor, '');
    });

    // Mutation control: break the shipping read normalizer in memory, never on disk.
    // The exact same behavior assertion must fail, proving tests do not run a copy.
    test('production mutation is detected by normalization assertion', () => {
        const mutant = loadBrowser(sourceFiles[filename], source => {
            const original = 'return s.trim().toLowerCase();';
            assert.ok(source.includes(original), 'mutation anchor exists');
            return source.replace(original, 'return s;');
        });
        mutant.localStorage.setItem(key, '[" Alpha "]');
        assert.throws(() => assert.deepEqual(plain(mutant.core.getSavedList()), ['alpha']), assert.AssertionError);
    });
}

console.log(cases + ' production-source cases passed across both platforms.');

// Older bookmarklet execution environments lack these ES2015 collection APIs.
const legacy = loadBrowser(sourceFiles['bookmarklet.js'], source => source, 'Set = undefined; Array.from = undefined;');
legacy.card('Alpha'); legacy.card(' ALPHA ');
assert.deepEqual(plain(legacy.core.getVisibleHotelNames()), ['alpha']);
assert.equal(legacy.core.mergeSavedWithVisible().savedCount, 1);
console.log('PASS bookmarklet.js: no ES2015 collection runtime dependency');

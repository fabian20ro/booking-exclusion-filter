// Minimal browser boundaries, not copies of Booking Filter behavior.
const fs = require('node:fs');
const vm = require('node:vm');

function element(tag) {
    const listeners = {};
    const classes = new Set();
    const node = {
        tagName: tag, children: [], attributes: {}, style: {}, value: '',
        parentNode: null, _text: '',
        setAttribute(name, value) { this.attributes[name] = value; },
        appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
        removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; },
        remove() { if (this.parentNode) this.parentNode.removeChild(this); },
        addEventListener(name, callback) { (listeners[name] ||= []).push(callback); },
        dispatch(name, event = {}) { for (const fn of listeners[name] || []) fn(event); },
        click() { this.dispatch('click', { stopPropagation() {}, preventDefault() {} }); if (this.onclick) this.onclick(); },
        focus() {}, select() {},
        classList: {
            add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
            contains(name) { return classes.has(name); },
            toggle(name) { if (classes.has(name)) classes.delete(name); else classes.add(name); }
        },
        querySelectorAll(selector) {
            const matches = child => selector.startsWith('#') ? child.id === selector.slice(1)
                : selector.startsWith('[data-testid=')
                    ? child.attributes['data-testid'] === selector.match(/"(.*?)"/)[1]
                    : child.tagName === selector;
            return this.children.flatMap(child => [ ...(matches(child) ? [child] : []), ...child.querySelectorAll(selector) ]);
        },
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    };
    Object.defineProperties(node, {
        textContent: { get() { return this._text + this.children.map(child => child.textContent).join(''); },
            set(value) { this._text = String(value); this.children = []; } },
        innerHTML: { set(value) { this._text = String(value); this.children = []; } },
        firstChild: { get() { return this.children[0] || null; } }
    });
    return node;
}

function loadBrowser(filename, transform = source => source, beforeLoad = '') {
    const root = element('html');
    const document = {
        head: root.appendChild(element('head')), body: root.appendChild(element('body')),
        createElement: element,
        getElementById(id) { return root.querySelector('#' + id); },
        querySelectorAll(selector) { return root.querySelectorAll(selector); },
        execCommand() { return true; }
    };
    const store = new Map();
    const errors = [];
    const localStorage = {
        getItem(key) { return store.has(key) ? store.get(key) : null; },
        setItem(key, value) { store.set(key, String(value)); },
        removeItem(key) { store.delete(key); }, clear() { store.clear(); }
    };
    const context = {
        window: {}, document, localStorage,
        console: { log() {}, warn() {}, error(...args) { errors.push(args); } },
        navigator: {}, confirm: () => true, setTimeout: () => 1, clearTimeout() {},
        MutationObserver: function(callback) { this.observe = () => {}; this.callback = callback; }
    };
    const source = fs.readFileSync(filename, 'utf8');
    vm.createContext(context);
    if (beforeLoad) vm.runInContext(beforeLoad, context, { timeout: 2000 });
    vm.runInContext(transform(source), context, { filename, timeout: 2000 });
    return {
        ...context, errors, core: context.window.__bookingFilter,
        card(name, dimmed = false) {
            const card = element('article'); card.setAttribute('data-testid', 'property-card');
            const title = element('h3'); title.setAttribute('data-testid', 'title'); title.textContent = name;
            card.appendChild(title); if (dimmed) card.classList.add('bf-dimmed');
            document.body.appendChild(card); return card;
        }
    };
}

module.exports = { loadBrowser };

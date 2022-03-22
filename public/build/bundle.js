
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.46.4 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let t0;
    	let div2;
    	let button0;
    	let t2;
    	let div1;
    	let button1;
    	let t4;
    	let button2;
    	let t6;
    	let button3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "↑";
    			t2 = space();
    			div1 = element("div");
    			button1 = element("button");
    			button1.textContent = "←";
    			t4 = space();
    			button2 = element("button");
    			button2.textContent = "↓";
    			t6 = space();
    			button3 = element("button");
    			button3.textContent = "→";
    			attr_dev(div0, "id", "app");
    			attr_dev(div0, "class", "w-full flex flex-wrap justify-center m-10");
    			add_location(div0, file, 208, 1, 6052);
    			attr_dev(button0, "id", "w");
    			attr_dev(button0, "class", "text-red-300 active:text-yellow-300 active:bg-gray-600 bg-gray-500 m-1 w-7 h-7");
    			add_location(button0, file, 210, 2, 6184);
    			attr_dev(button1, "id", "a");
    			attr_dev(button1, "class", "text-red-300 active:text-yellow-300 active:bg-gray-600 bg-gray-500 m-1 w-7 h-7");
    			add_location(button1, file, 212, 3, 6388);
    			attr_dev(button2, "id", "s");
    			attr_dev(button2, "class", "text-red-300 active:text-yellow-300 active:bg-gray-600 bg-gray-500 m-1 w-7 h-7");
    			add_location(button2, file, 213, 3, 6535);
    			attr_dev(button3, "id", "d");
    			attr_dev(button3, "class", "text-red-300 active:text-yellow-300 active:bg-gray-600 bg-gray-500 m-1 w-7 h-7");
    			add_location(button3, file, 214, 3, 6682);
    			attr_dev(div1, "id", "controlrow");
    			attr_dev(div1, "class", "flex justify-center w-full");
    			add_location(div1, file, 211, 2, 6328);
    			attr_dev(div2, "id", "controls");
    			attr_dev(div2, "class", "flex justify-center flex-wrap");
    			add_location(div2, file, 209, 1, 6124);
    			attr_dev(main, "class", "flex justify-center flex-wrap text-xs");
    			add_location(main, file, 207, 0, 5998);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(main, t0);
    			append_dev(main, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button1);
    			append_dev(div1, t4);
    			append_dev(div1, button2);
    			append_dev(div1, t6);
    			append_dev(div1, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[14], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[15], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[16], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[17], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function randomNumber(min, max) {
    	return Math.floor(Math.random() * (max - min) + min);
    }

    function buildgame(a, b) {
    	let templistA;
    	let templistB = [];

    	for (let i = 0; i < b; i++) {
    		templistA = [];

    		for (let j = 0; j < a; j++) {
    			templistA.push(0);
    		}

    		templistB.push(templistA);
    	}

    	return templistB;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const size = [23, 11];
    	let { coords = [11, 5] } = $$props;
    	let { generatorcoords = [] } = $$props;
    	let { tempintA = 0 } = $$props;
    	let { tempintB = 0 } = $$props;
    	let { target = 0 } = $$props;
    	let { temptarget = 0 } = $$props;
    	const movementInputs = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
    	let { frozen = false } = $$props;
    	let { gameboard = buildgame(size[0], size[1]) } = $$props;

    	function generategame(a, b) {
    		for (let i in gameboard) {
    			for (let j in gameboard[i]) {
    				$$invalidate(11, gameboard[i][j] = randomNumber(a, b), gameboard);
    			}
    		}
    	}

    	function generategameOLD(a, b) {
    		$$invalidate(5, generatorcoords = [randomNumber(0, size[0]), randomNumber(0, size[1])]);
    		$$invalidate(4, coords = generatorcoords);
    		$$invalidate(9, temptarget = randomNumber(a, b));
    		$$invalidate(11, gameboard[generatorcoords[1]][generatorcoords[0]] = temptarget, gameboard);
    		$$invalidate(8, target += temptarget);

    		do {
    			$$invalidate(6, tempintA = Math.random() >= 0.5 ? 1 : -1);
    			$$invalidate(7, tempintB = randomNumber(0, 2));
    			$$invalidate(5, generatorcoords[tempintB] += tempintA, generatorcoords);
    			console.log(gameboard);
    			console.log(generatorcoords);

    			if (gameboard[generatorcoords[0]][generatorcoords[1]] == 0) {
    				$$invalidate(9, temptarget = randomNumber(a, b));
    				$$invalidate(11, gameboard[generatorcoords[1]][generatorcoords[0]] = temptarget, gameboard);
    				$$invalidate(8, target += temptarget);
    			} else {
    				$$invalidate(5, generatorcoords[tempintB] -= tempintA, generatorcoords);
    			}

    			console.log(generatorcoords);
    		} while (generatorcoords[0] > 0 && generatorcoords[0] < size[0] - 1 && generatorcoords[1] > 0 && generatorcoords[1] < size[1] - 1);

    		$$invalidate(8, target -= temptarget);
    		console.log(temptarget);
    		$$invalidate(11, gameboard[generatorcoords[1]][generatorcoords[0]] = target, gameboard);
    		console.log('generatorcoords');
    	}

    	function game(id) {
    		const container = document.getElementById(id);
    		container.innerHTML = '';
    		let temp = '';
    		generategame(1, 5);

    		for (let i in gameboard) {
    			for (let j in gameboard[i]) {
    				temp += `<div id="block${i}-${j}" class="h-5 w-5 m-2 text-sm bg-red-300 hover:bg-yellow-200 flex flex-wrap justify-center items-center">${!isNaN(gameboard[i][j]) ? gameboard[i][j] : ""}</div>`;
    			}

    			temp += '<div class="w-full"></div>';
    		}

    		container.innerHTML += temp;
    		stoggle();
    	}
    	let body = document.getElementsByTagName('body')[0];
    	body.addEventListener("keydown", onkeydown_handler);
    	body.addEventListener("keyup", onkeyup_handler);

    	function onkeydown_handler(event) {
    		if (movementInputs.includes(event.key) && !frozen) {
    			let id;

    			if (('wasd').includes(event.key)) {
    				id = event.key;
    			} else {
    				id = event.key == 'ArrowUp'
    				? 'w'
    				: event.key == 'ArrowLeft'
    					? 'a'
    					: event.key == 'ArrowDown' ? 's' : 'd';
    			}

    			let button = document.getElementById(id);
    			button.classList.toggle('text-red-300');
    			button.classList.toggle('bg-gray-500');
    			button.classList.toggle('text-yellow-300');
    			button.classList.toggle('bg-gray-600');

    			if (event.key === 'w' || event.key === 'ArrowUp') {
    				up();
    			} else if (event.key === 'a' || event.key === 'ArrowLeft') {
    				left();
    			} else if (event.key === 's' || event.key === 'ArrowDown') {
    				down();
    			} else if (event.key === 'd' || event.key === 'ArrowRight') {
    				right();
    			}
    		} else if (event.key === 'Enter' || event.key === ' ') {
    			let item = document.getElementById(`block${coords[1]}-${coords[0]}`);
    			item.classList.toggle('m-2');
    			item.classList.toggle('h-5');
    			item.classList.toggle('w-5');
    			item.classList.toggle('text-sm');
    			item.classList.toggle('m-1');
    			item.classList.toggle('h-7');
    			item.classList.toggle('w-7');
    			item.classList.toggle('text-base');
    			item.classList.toggle('font-semibold');
    			$$invalidate(10, frozen = true);
    		} else {
    			console.log('keydown: ' + event.key);
    		}
    	}

    	function onkeyup_handler(event) {
    		if (movementInputs.includes(event.key) && !frozen) {
    			let id;

    			if (('wasd').includes(event.key)) {
    				id = event.key;
    			} else {
    				id = event.key === 'ArrowUp'
    				? 'w'
    				: event.key === 'ArrowLeft'
    					? 'a'
    					: event.key === 'ArrowDown' ? 's' : 'd';
    			}

    			let button = document.getElementById(id);
    			button.classList.toggle('text-red-300');
    			button.classList.toggle('bg-gray-500');
    			button.classList.toggle('text-yellow-300');
    			button.classList.toggle('bg-gray-600');
    		} else if (event.key === 'Enter' || event.key === ' ') {
    			let item = document.getElementById(`block${coords[1]}-${coords[0]}`);
    			item.classList.toggle('m-2');
    			item.classList.toggle('h-5');
    			item.classList.toggle('w-5');
    			item.classList.toggle('text-sm');
    			item.classList.toggle('m-1');
    			item.classList.toggle('h-7');
    			item.classList.toggle('w-7');
    			item.classList.toggle('text-base');
    			item.classList.toggle('font-semibold');
    			$$invalidate(10, frozen = false);
    		} else {
    			console.log('keyup: ' + event.key);
    		}
    	}

    	function stoggle() {
    		let item = document.getElementById(`block${coords[1]}-${coords[0]}`);
    		item.classList.toggle('bg-red-300');
    		item.classList.toggle('hover:bg-yellow-200');
    		item.classList.toggle('m-2');
    		item.classList.toggle('h-5');
    		item.classList.toggle('w-5');
    		item.classList.toggle('text-sm');
    		item.classList.toggle('bg-gray-300');
    		item.classList.toggle('hover:bg-gray-400');
    		item.classList.toggle('m-1');
    		item.classList.toggle('h-7');
    		item.classList.toggle('w-7');
    		item.classList.toggle('text-base');
    		item.classList.toggle('font-semibold');
    	}

    	function up() {
    		stoggle();

    		if (coords[1] > 0) {
    			$$invalidate(4, coords[1] -= 1, coords);
    		}

    		stoggle();
    	}

    	function left() {
    		stoggle();

    		if (coords[0] > 0) {
    			$$invalidate(4, coords[0] -= 1, coords);
    		}

    		stoggle();
    	}

    	function down() {
    		stoggle();

    		if (coords[1] < size[1] - 1) {
    			$$invalidate(4, coords[1] += 1, coords);
    		}

    		stoggle();
    	}

    	function right() {
    		stoggle();

    		if (coords[0] < size[0] - 1) {
    			$$invalidate(4, coords[0] += 1, coords);
    		}

    		stoggle();
    	}

    	onMount(() => game('app'));

    	const writable_props = [
    		'coords',
    		'generatorcoords',
    		'tempintA',
    		'tempintB',
    		'target',
    		'temptarget',
    		'frozen',
    		'gameboard'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => up();
    	const click_handler_1 = () => left();
    	const click_handler_2 = () => down();
    	const click_handler_3 = () => right();

    	$$self.$$set = $$props => {
    		if ('coords' in $$props) $$invalidate(4, coords = $$props.coords);
    		if ('generatorcoords' in $$props) $$invalidate(5, generatorcoords = $$props.generatorcoords);
    		if ('tempintA' in $$props) $$invalidate(6, tempintA = $$props.tempintA);
    		if ('tempintB' in $$props) $$invalidate(7, tempintB = $$props.tempintB);
    		if ('target' in $$props) $$invalidate(8, target = $$props.target);
    		if ('temptarget' in $$props) $$invalidate(9, temptarget = $$props.temptarget);
    		if ('frozen' in $$props) $$invalidate(10, frozen = $$props.frozen);
    		if ('gameboard' in $$props) $$invalidate(11, gameboard = $$props.gameboard);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		size,
    		coords,
    		generatorcoords,
    		tempintA,
    		tempintB,
    		target,
    		temptarget,
    		movementInputs,
    		frozen,
    		gameboard,
    		randomNumber,
    		buildgame,
    		generategame,
    		generategameOLD,
    		game,
    		body,
    		onkeydown_handler,
    		onkeyup_handler,
    		stoggle,
    		up,
    		left,
    		down,
    		right
    	});

    	$$self.$inject_state = $$props => {
    		if ('coords' in $$props) $$invalidate(4, coords = $$props.coords);
    		if ('generatorcoords' in $$props) $$invalidate(5, generatorcoords = $$props.generatorcoords);
    		if ('tempintA' in $$props) $$invalidate(6, tempintA = $$props.tempintA);
    		if ('tempintB' in $$props) $$invalidate(7, tempintB = $$props.tempintB);
    		if ('target' in $$props) $$invalidate(8, target = $$props.target);
    		if ('temptarget' in $$props) $$invalidate(9, temptarget = $$props.temptarget);
    		if ('frozen' in $$props) $$invalidate(10, frozen = $$props.frozen);
    		if ('gameboard' in $$props) $$invalidate(11, gameboard = $$props.gameboard);
    		if ('body' in $$props) body = $$props.body;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		up,
    		left,
    		down,
    		right,
    		coords,
    		generatorcoords,
    		tempintA,
    		tempintB,
    		target,
    		temptarget,
    		frozen,
    		gameboard,
    		size,
    		movementInputs,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			size: 12,
    			coords: 4,
    			generatorcoords: 5,
    			tempintA: 6,
    			tempintB: 7,
    			target: 8,
    			temptarget: 9,
    			movementInputs: 13,
    			frozen: 10,
    			gameboard: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get size() {
    		return this.$$.ctx[12];
    	}

    	set size(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get coords() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set coords(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get generatorcoords() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set generatorcoords(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tempintA() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tempintA(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tempintB() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tempintB(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get target() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set target(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get temptarget() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set temptarget(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get movementInputs() {
    		return this.$$.ctx[13];
    	}

    	set movementInputs(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get frozen() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set frozen(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gameboard() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameboard(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map

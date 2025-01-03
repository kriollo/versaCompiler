import { app } from '/public/dashboard/js/vue-instancia.js';
import { ref } from 'vue';
const message = ref('Hello, World!');
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
function render(_ctx, _cache, $props, $setup, $data, $options) {
    return (_openBlock(), _createElementBlock(_Fragment, null, [
        _cache[0] || (_cache[0] = _createElementVNode("div", null, [
            _createElementVNode("h1", null, "Simple Component")
        ], -1 /* HOISTED */)),
        _createElementVNode("div", null, [
            _createElementVNode("p", null, _toDisplayString(_ctx.message), 1 /* TEXT */)
        ])
    ], 64 /* STABLE_FRAGMENT */));
}
simpleComponent_component.render = render;
simpleComponent_component.__file = 'simpleComponent';
export const simpleComponent = app.component('simpleComponent', simpleComponent_component);
//# sourceMappingURL=module.js.map
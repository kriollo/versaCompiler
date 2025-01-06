import { app } from '/public/vue-instancia.js';
(function () {
    let styleTag = document.createElement('style');
    styleTag.setAttribute('data-v-t2gga5j29q', '');
    styleTag.innerHTML = `
h1[data-v-t2gga5j29q] {
        color: red;
        font-size: 24px;
        text-align: center;
}
`;
    document.head.appendChild(styleTag);
})();
import { defineComponent as _defineComponent } from "vue";
import { add } from '/public/sampleFile.js';
import { toRefs } from 'vue';
const vComponent_component = /*@__PURE__*/ _defineComponent({
    __name: 'vComponent',
    props: {
        message: { type: String, required: true }
    },
    setup(__props, { expose: __expose }) {
        __expose();
        const props = __props;
        const { message } = toRefs(props);
        const __returned__ = { props, message, get add() { return add; } };
        Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true });
        return __returned__;
    }
});
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { for: "" };
function render(_ctx, _cache, $props, $setup, $data, $options) {
    return (_openBlock(), _createElementBlock(_Fragment, null, [
        _createElementVNode("div", null, [
            _createElementVNode("h1", null, _toDisplayString($setup.message), 1 /* TEXT */)
        ]),
        _createElementVNode("div", null, [
            _createElementVNode("label", _hoisted_1, "Result Suma: " + _toDisplayString($setup.add(5, 3)), 1 /* TEXT */)
        ])
    ], 64 /* STABLE_FRAGMENT */));
}
vComponent_component.render = render;
vComponent_component.__file = 'vComponent';
vComponent_component.__scopeId = 'data-v-t2gga5j29q';
export const vComponent = app.component('vComponent', vComponent_component);
//# sourceMappingURL=module.js.map
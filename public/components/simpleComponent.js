import { app } from '/public/vue-instancia.js';
(function () {
    let styleTag = document.createElement('style');
    styleTag.setAttribute('data-v-sci574l5jk', '');
    styleTag.innerHTML = `
input[data-v-sci574l5jk] {
        width: 100%;
        padding: 10px;
        font-size: 16px;
}
.divId[data-v-sci574l5jk] {
        border: 1px solid #ccc;
        padding: 50px;
        margin-bottom: 10px;
}
`;
    document.head.appendChild(styleTag);
})();
import { defineComponent as _defineComponent } from "vue";
import {vComponent} from '/public/components/vComponent.js';
import { ref } from 'vue';
const simpleComponent_component = /*@__PURE__*/ _defineComponent({
    __name: 'simpleComponent',
    setup(__props, { expose: __expose }) {
        __expose();
        const message = ref('Hello from versaCompiler!');
        setTimeout(() => {
            message.value = 'Hello from versaCompiler after 2 seconds!';
        }, 2000);
        const __returned__ = { message, vComponent };
        Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true });
        return __returned__;
    }
});
import { vModelText as _vModelText, createElementVNode as _createElementVNode, withDirectives as _withDirectives, resolveComponent as _resolveComponent, createVNode as _createVNode, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
const _hoisted_1 = { class: "divId" };
function render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_vComponent = _resolveComponent("vComponent");
    return (_openBlock(), _createElementBlock(_Fragment, null, [
        _createElementVNode("div", _hoisted_1, [
            _withDirectives(_createElementVNode("input", {
                type: "text",
                "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => (($setup.message) = $event))
            }, null, 512 /* NEED_PATCH */), [
                [_vModelText, $setup.message]
            ])
        ]),
        _createElementVNode("div", null, [
            _createVNode(_component_vComponent, { message: $setup.message }, null, 8 /* PROPS */, ["message"])
        ])
    ], 64 /* STABLE_FRAGMENT */));
}
simpleComponent_component.render = render;
simpleComponent_component.__file = 'simpleComponent';
simpleComponent_component.__scopeId = 'data-v-sci574l5jk';
export const simpleComponent = app.component('simpleComponent', simpleComponent_component);
//# sourceMappingURL=module.js.map
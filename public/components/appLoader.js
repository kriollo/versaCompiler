import { app } from '/public/vue-instancia.js';
(function () {
    let styleTag = document.createElement('style');
    styleTag.setAttribute('data-v-8gk36ggjcj', '');
    styleTag.innerHTML = `
html {
        background-color: #f0f0f0;
        font-family: Arial, sans-serif;
}
body {
        margin: 0;
        padding: 0;
}
div {
        margin: 20px;
        padding: 20px;
        background-color: #fff;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
`;
    document.head.appendChild(styleTag);
})();
import { defineComponent as _defineComponent } from "vue";
import {simpleComponent} from '/public/components/simpleComponent.js';
const appLoader_component = /*@__PURE__*/ _defineComponent({
    __name: 'appLoader',
    setup(__props, { expose: __expose }) {
        __expose();
        const __returned__ = { simpleComponent };
        Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true });
        return __returned__;
    }
});
import { resolveComponent as _resolveComponent, openBlock as _openBlock, createBlock as _createBlock } from "vue";
function render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_simpleComponent = _resolveComponent("simpleComponent");
    return (_openBlock(), _createBlock(_component_simpleComponent));
}
appLoader_component.render = render;
appLoader_component.__file = 'appLoader';
export const appLoader = app.component('appLoader', appLoader_component);
//# sourceMappingURL=module.js.map
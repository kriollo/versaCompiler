import { createApp } from 'vue';
export const app = createApp({
    template: `<appLoader></appLoader>`,
});
app.config.warnHandler = function (msg, vm, trace) {
    console.warn(msg, vm, trace);
};
app.config.errorHandler = function (err, vm, info) {
    console.error(err, vm, info);
};
app.config.compilerOptions.comments = true;
app.config.performance = true;
app.config.compilerOptions.whitespace = 'condense';
import('/public/components/appLoader.js')
    .then(({ appLoader }) => { })
    .catch(error => {
    console.error('Error al cargar el módulo:', error);
}).finally(() => {
    app.mount('#app');
});
//# sourceMappingURL=module.js.map

/**
 * Propiedades que Vue, BrowserSync y el HMR de versaCompiler agregan a `window` y a los elementos
 * del DOM en el navegador. Las leen los scripts de src/hrm.
 */
declare global {
    interface Window {
        Vue?: any;
        __VUE_APP__?: any;
        __VUE_APP_INSTANCE__?: any;
        __VUE_DEVTOOLS_GLOBAL_HOOK__?: any;
        ___browserSync___?: any;
        __versaHMR?: any;
    }

    interface Element {
        __vue_app__?: any;
        __vue__?: any;
        _vnode?: any;
        __vueParentComponent?: any;
    }
}

export {};

// Store for the Vue app instance
let vueAppInstance = null;

// Exponer la instancia en window para acceso global
if (typeof window !== 'undefined') {
    window.__VUE_APP_INSTANCE__ = {
        set: function(instance) {
            vueAppInstance = instance;
            console.log('Vue app instance stored successfully in window.__VUE_APP_INSTANCE__');
            return instance;
        },
        get: function() {
            return vueAppInstance;
        }
    };
}

export default {
    methods: {
        // Set the Vue app instance
        set(instance) {
            vueAppInstance = instance;
            // También lo guardamos en window para acceso global
            if (typeof window !== 'undefined') {
                window.__VUE_APP_INSTANCE__.set(instance);
            }
            console.log('Vue app instance stored successfully');
            return instance;
        },
        // Get the Vue app instance
        get() {
            return vueAppInstance;
        },
    },
};

<script setup lang="ts">
    import { nextTick, onMounted, ref } from 'vue';

    import lineHr from 'e@/js/components/lineHr.vue';
    import loader from 'e@/js/components/loader.vue';
    import primerModal from 'e@/js/module/modals/primerModal.vue';
    import simpleComponent from 'e@/js/module/simpleComponent.vue';

    const showLocalModal = ref(false);
    const isDark = ref(false);
    const isAnimating = ref(false);
    const themeToggleButton = ref<HTMLElement | null>(null);
    const showLoader = ref(false);

    const openModal = () => {
        showLocalModal.value = true;
    };
    const closeModal = () => {
        showLocalModal.value = false;
    };

    // Helper to apply theme and update reactive state
    const applyThemeAndIcons = (newIsDark: boolean) => {
        document.documentElement.classList.toggle('dark', newIsDark);
        isDark.value = newIsDark;
        // Icons are updated reactively in the template based on isDark.value
    };

    // Fallback animation using clip-path for "filling from the top"
    const animateThemeChangeWithClipPath = async (newIsDark: boolean) => {
        if (isAnimating.value) return;
        isAnimating.value = true;
        await nextTick(); // Ensure DOM is ready if needed

        const htmlElement = document.documentElement;

        // For inset, origin point is not used in the same way as circle
        // The effect is a wipe from top to bottom
        const startClip = 'inset(0 0 100% 0)'; // Starts fully clipped from the bottom
        const endClip = 'inset(0 0 0 0)'; // Ends fully visible

        htmlElement.style.setProperty('--clip-path-start', startClip);
        htmlElement.style.setProperty('--clip-path-end', endClip);

        // Add class to trigger CSS animation
        htmlElement.classList.add('theme-transition');

        // Apply target theme class *during* the animation setup
        // This ensures the content being revealed has the new theme's styles.
        document.documentElement.classList.toggle('dark', newIsDark);
        isDark.value = newIsDark; // Update reactive state for icons

        const onAnimationEnd = () => {
            htmlElement.classList.remove('theme-transition');
            htmlElement.style.removeProperty('--clip-path-start');
            htmlElement.style.removeProperty('--clip-path-end');
            htmlElement.removeEventListener('animationend', onAnimationEnd);
            isAnimating.value = false;
            try {
                localStorage.setItem(
                    'color-theme',
                    newIsDark ? 'dark' : 'light',
                );
            } catch (e) {
                console.error('Error saving theme (clip-path fallback):', e);
            }
        };
        htmlElement.addEventListener('animationend', onAnimationEnd, {
            once: true,
        });
    };

    // Main toggle function
    const toggleDark = async (_event: MouseEvent) => {
        const newIsDark = !isDark.value;
        showLoader.value = true;

        if (document.startViewTransition && !isAnimating.value) {
            isAnimating.value = true;

            // For a top-to-bottom fill, click coordinates are not used for the clip-path shape
            // The animation is defined in CSS to fill from top

            const transition = document.startViewTransition(() => {
                applyThemeAndIcons(newIsDark);
            });

            try {
                await transition.finished;
            } finally {
                isAnimating.value = false;
                try {
                    localStorage.setItem(
                        'color-theme',
                        newIsDark ? 'dark' : 'light',
                    );
                } catch (e) {
                    console.error('Error saving theme (ViewTransition):', e);
                }
            }
        } else {
            // Fallback to clip-path animation if View Transitions are not supported or already animating
            await animateThemeChangeWithClipPath(newIsDark);
        }
        showLoader.value = false;
    };

    onMounted(() => {
        let initialIsDark = false;
        try {
            const savedTheme = localStorage.getItem('color-theme');
            if (savedTheme) {
                initialIsDark = savedTheme === 'dark';
            } else {
                initialIsDark = window.matchMedia(
                    '(prefers-color-scheme: dark)',
                ).matches;
            }
        } catch (e) {
            console.error('Error reading theme from localStorage:', e);
            // Fallback to system preference on error
            initialIsDark = window.matchMedia(
                '(prefers-color-scheme: dark)',
            ).matches;
        }
        applyThemeAndIcons(initialIsDark);
    });
</script>
<template>
    <div class="bg-white dark:bg-black min-h-screen">
        <div
            class="flex flex-col w-full h-full items-center justify-center p-4">
            <div class="flex justify-end mb-2 w-full max-w-3xl">
                <!-- Added w-full and max-w for button positioning -->
                <button
                    id="theme-toggle"
                    ref="themeToggleButton"
                    @click="toggleDark"
                    class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 transition relative overflow-hidden"
                    aria-label="Toggle theme">
                    <span id="theme-toggle-dark-icon" v-if="!isDark">🌙</span>
                    <span id="theme-toggle-light-icon" v-if="isDark">☀️</span>
                    <span class="ml-2">
                        {{ isDark ? 'Modo Claro' : 'Modo Oscuro' }}
                    </span>
                </button>
            </div>
            <h1
                class="text-lg font-bold p-0 m-0 text-gray-800 dark:text-gray-100 flex">
                <span class="text-red-500">VersaCompiler</span>
                - VueJS App Loader
                <loader v-if="showLoader" />
            </h1>
            <lineHr />
            <simpleComponent />
            <button
                @click="openModal"
                class="mt-4 active:bg-blue-700 text-white font-bold py-2 px-4 rounded bg-blue-500 hover:bg-blue-700 focus:outline-none focus:shadow-outline">
                Abrir
            </button>
        </div>

        <primerModal :showModal="showLocalModal" @accion="closeModal" />
    </div>
</template>
<style lang="css">
    /* Fallback clip-path animation */
    .theme-transition {
        animation: theme-reveal-animation 0.5s ease-out forwards;
        /* clip-path is dynamically set via --clip-path-end,
         but the animation uses --clip-path-start and --clip-path-end */
    }

    @keyframes theme-reveal-animation {
        from {
            clip-path: var(--clip-path-start); /* Should be inset(0 0 100% 0) */
        }
        to {
            clip-path: var(--clip-path-end); /* Should be inset(0 0 0 0) */
        }
    }

    /* View Transition CSS (global) */
    ::view-transition-old(root),
    ::view-transition-new(root) {
        animation: none;
        mix-blend-mode: normal;
    }

    /* Ensure the new view is on top during the reveal */
    ::view-transition-new(root) {
        z-index: 1;
        animation: vt-fill-from-top 0.5s ease-out forwards;
    }
    /* Keep old view behind, it will be covered */
    ::view-transition-old(root) {
        z-index: 0;
    }

    @keyframes vt-fill-from-top {
        from {
            clip-path: inset(
                0 0 100% 0
            ); /* Start fully clipped from the bottom, revealing top-down */
        }
        to {
            clip-path: inset(0 0 0 0); /* End fully visible */
        }
    }
</style>

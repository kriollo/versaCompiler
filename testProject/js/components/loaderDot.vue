<template>
    <div class="p-1 h-6 w-6 loader text-gray-500 dark:text-gray-400"></div>
</template>
<style scoped>
    .loader {
        aspect-ratio: 2;
        --_g: no-repeat radial-gradient(circle closest-side, #ccc 90%, #0000);
        background:
            var(--_g) 0% 50%,
            var(--_g) 50% 50%,
            var(--_g) 100% 50%;
        background-size: calc(100% / 3) 50%;
        animation: l3 1s infinite linear;
    }
    @keyframes l3 {
        20% {
            background-position:
                0% 0%,
                50% 50%,
                100% 50%;
        }
        40% {
            background-position:
                0% 100%,
                50% 0%,
                100% 50%;
        }
        60% {
            background-position:
                0% 50%,
                50% 100%,
                100% 0%;
        }
        80% {
            background-position:
                0% 50%,
                50% 50%,
                100% 100%;
        }
    }
</style>

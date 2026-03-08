<script setup>
    import { toRefs } from 'vue';

    const props = defineProps({
        size: {
            type: String,
            default: 'max-w-md',
        },
    });

    const { size } = toRefs(props);
</script>
<template>
    <div class="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700" :class="size">
        <div>
            <slot name="title"></slot>

            <!-- Schedule Grid -->
            <slot name="body"></slot>

            <!-- Action Button -->
            <slot name="footer"></slot>
        </div>
    </div>
</template>

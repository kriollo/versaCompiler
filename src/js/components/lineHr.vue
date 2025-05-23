<script>
    import { defineComponent } from 'vue';
    export default defineComponent({
        name: 'LineHr',
        data() {
            return {
                msg: 'LineHr',
            };
        },
    });

    // Define the component
</script>
<template>
    <div>
        <hr class="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700" />
        {{ msg }}
    </div>
</template>

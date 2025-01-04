<script lang="ts">
    import { ref } from 'vue';
    import type { Ref } from 'vue';

    import { add } from '@/sampleFile';

    const result = add(1, 2);
    const message: Ref<string> = ref('Hello, World!');
</script>
<template>
    <div>
        <h1>Simple Component</h1>
    </div>

    <div>
        <p>{{ message }}</p>
    </div>
</template>

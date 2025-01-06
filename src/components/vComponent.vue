<template>
    <div>
        <h1>{{ message }}</h1>
    </div>

    <div>
        <label for="">Result Suma: {{ add(5, 3) }}</label>
    </div>
</template>

<script setup lang="ts">
    import { add } from '@/sampleFile';
    import { toRefs } from 'vue';

    type Props = {
        message: string;
    };
    const props = defineProps<Props>();

    const { message } = toRefs(props);
</script>

<style lang="css" scoped>
    h1 {
        color: red;
        font-size: 24px;
        text-align: center;
    }
</style>

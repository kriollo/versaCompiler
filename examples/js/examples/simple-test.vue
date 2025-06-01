<script setup lang="ts">
    import { ref } from 'vue';

    const message = ref('Hello World');
    const count = ref(0);

    function increment() {
        count.value++;
    }
</script>

<template>
    <div>
        <h1>{{ message }}</h1>
        <p>Count: {{ count }}</p>
        <button @click="increment">Increment</button>
    </div>
</template>

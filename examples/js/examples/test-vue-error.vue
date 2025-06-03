<script setup lang="ts">
    import { ref } from 'vue';

    const message = ref('Hola desde versaCompiler!');

    // Error de TypeScript intencional - variable no declarada
    console.log(undeclaredVariable);

    // Error de tipo - asignar número a string
    const numberVar: number = 'this is a string';
</script>
<template>
    <div>
        <h1>Test Component with TypeScript Errors</h1>
        <p>{{ message }}</p>
    </div>
</template>

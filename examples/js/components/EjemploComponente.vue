<template>
  <div class="ejemplo-componente">
    <h3>{{ titulo }}</h3>
    <p>Contador: {{ contador }}</p>
    <button @click="incrementar">Incrementar</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Props
const props = defineProps({
  titulo: {
    type: String,
    default: 'Mi Componente'
  }
});

// Estado reactivo
const contador = ref(0);

// Computed
const contadorDoble = computed(() => contador.value * 2);

// Métodos
const incrementar = () => {
  contador.value++;
};

// Watcher
watch(contador, (newVal) => {
  console.log('Contador cambió a:', newVal);
});

// Si necesitaras mergeModels, también funciona:
// import { mergeModels } from 'vue';
// const combined = mergeModels(model1, model2);
</script>

<style scoped>
.ejemplo-componente {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
</style>

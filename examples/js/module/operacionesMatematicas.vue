<script setup lang="ts">
    import { onMounted, ref, toRefs, type Ref } from 'vue';

    import lineHr from '@/js/components/lineHr.vue';
    import { add, multiply, subtract } from 'e@/js/sampleFile';

    type Props = {
        message: string;
    };
    const props = defineProps<Props>();

    const { message } = toRefs(props);

    const num1 = ref(4);
    const num2 = ref(2);
    const result: Ref<number | null> = ref(null);

    const addNumber = () => {
        result.value = add(num1.value, num2.value);
    };
    const subtractNumber = () => {
        result.value = subtract(num1.value, num2.value);
    };
    const multiplyNumber = () => {
        result.value = multiply(num1.value, num2.value);
    };
    onMounted(() => {
        console.log('el resultado de la suma entre 6 y 4 es: ', add(6, 4));
    });
</script>
<template>
    <div>
        <div>
            <h1>{{ message }}</h1>
        </div>

        <h1>Operaciones Matemáticas - HMR Test 🧮</h1>
        <lineHr />

        <div class="container">
            <div class="numOperations">
                <div>
                    <label for="num1">Numero 1:</label>
                    <input id="num1" type="number" v-model="num1" />
                </div>
                <div>
                    <label for="num2">Numero 2:</label>
                    <input id="num2" type="number" v-model="num2" />
                </div>
            </div>
            <div class="btnOperations">
                <button @click="addNumber">sumarsss</button>
                <button @click="subtractNumber">restarsss</button>
                <button @click="multiplyNumber">multiplicarsss</button>
            </div>
            <div v-if="result !== null" class="result">
                <h2>Resultado: {{ result }}</h2>
            </div>
        </div>
    </div>
</template>

<style lang="css" scoped>
    h1 {
        color: red;
        font-size: 24px;
        text-align: center;
    }
    input {
        padding: 10px;
        margin: 5px;
        border-radius: 5px;
        border: 1px solid #ccc;
        text-align: right;
        width: 100px;
    }

    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    .numOperations {
        display: flex;
        justify-content: space-evenly;
        margin: 20px 0;
        width: 100%;
    }

    .btnOperations {
        display: flex;
        justify-content: space-evenly;
        margin: 20px 0;
        width: 100%;
    }

    .btnOperations button {
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
        border: none;
        border-radius: 5px;
        background-color: #007bff;
        color: white;
        transition: background-color 0.3s;
    }

    .btnOperations button:hover {
        background-color: #0056b3;
    }

    .result {
        margin-top: 20px;
        text-align: center;
    }

    .result h2 {
        color: green;
        font-size: 20px;
    }
</style>

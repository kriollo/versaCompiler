(function () {
    let styleTag = document.createElement('style');
    styleTag.setAttribute('data-v-97k72c4qbk', '');
    styleTag.innerHTML = `
h1[data-v-97k72c4qbk] {
        color: red;
        font-size: 24px;
        text-align: center;
}
input[data-v-97k72c4qbk] {
        padding: 10px;
        margin: 5px;
        border-radius: 5px;
        border: 1px solid #ccc;
        text-align: right;
        width: 100px;
}
.container[data-v-97k72c4qbk] {
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.numOperations[data-v-97k72c4qbk] {
        display: flex;
        justify-content: space-evenly;
        margin: 20px 0;
        width: 100%;
}
.btnOperations[data-v-97k72c4qbk] {
        display: flex;
        justify-content: space-evenly;
        margin: 20px 0;
        width: 100%;
}
.btnOperations button[data-v-97k72c4qbk] {
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
        border: none;
        border-radius: 5px;
        background-color: #007bff;
        color: white;
        transition: background-color 0.3s;
}
.btnOperations button[data-v-97k72c4qbk]:hover {
        background-color: #0056b3;
}
.result[data-v-97k72c4qbk] {
        margin-top: 20px;
        text-align: center;
}
.result h2[data-v-97k72c4qbk] {
        color: green;
        font-size: 20px;
}
`;
    document.head.appendChild(styleTag);
})();
import { defineComponent as _defineComponent } from "vue";
import lineHr from '/public/js/components/lineHr.js';
import { add, multiply, subtract } from '/public/js/sampleFile.js';
import { ref, toRefs } from 'vue';

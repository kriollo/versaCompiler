// Archivo con errores intencionales para probar el sistema de linting

// Error de ESLint: variable sin usar
const unusedVariable = "this will cause a warning";

// Error de ESLint: console.log en producción
console.log("Debug message that should be removed");

// Error de sintaxis potencial: comparación con ==
if (unusedVariable == "test") {
    // Error: función no declarada
    someUndefinedFunction();
}

// Error de ESLint: función no usada
function unusedFunction() {
    return "never used";
}

// Error: variable redeclarada
const redeclaredVar = 1;
const redeclaredVar = 2;

// Error: missing semicolon (si está configurado)
const missingSemicolon = "test"

export default {};

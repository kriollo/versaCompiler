// Archivo de prueba para validar la nueva implementación de TypeScript Language Service

// Código válido
const validFunction = (name: string): string => {
    return `Hello, ${name}!`;
};

// Código con error de tipos
const invalidFunction = (): number => {
    return "this should be a number"; // Error: string no es asignable a number
};

// Código con error de sintaxis
const syntaxError = (x: number => {
    return x * 2;
};

// Test de tipos más complejos
interface User {
    id: number;
    name: string;
    email: string;
}

const processUser = (user: User): string => {
    return user.name.toUpperCase(); // Válido
};

const invalidUser = (user: User): string => {
    return user.age; // Error: 'age' no existe en User
};

export { validFunction, invalidFunction, processUser };

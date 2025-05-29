// Usar import dinámico para importar desde TypeScript
async function loadModule() {
    const module = await import('./dist/compiler/typescript.ts');
    return module.preCompileTS;
}

const testCode = `
export const test: string = "hello";
export interface User {
    name: string;
    age: number;
}
export const processUser = (user: User): string => {
    return \`Hello \${user.name}, you are \${user.age} years old\`;
};
`;

async function testPreCompile() {
    try {
        console.log('Testing preCompileTS function...');
        console.log('Input TypeScript code:');
        console.log(testCode);
        console.log('\n--- Compiling ---\n');

        const preCompileTS = await loadModule();
        const result = await preCompileTS(testCode, 'test.ts');

        if (result.error) {
            console.error('Error:', result.error.message);
        } else {
            console.log('Compiled JavaScript:');
            console.log(result.data);
        }
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

testPreCompile();

// Prueba súper simple para verificar que Jest funciona
describe('Prueba básica', () => {
    it('debería pasar', () => {
        expect(1 + 1).toBe(2);
    });

    it('debería verificar strings', () => {
        expect('hello').toBe('hello');
    });
});

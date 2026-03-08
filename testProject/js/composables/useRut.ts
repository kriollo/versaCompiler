/**
 * @preserve
 * Validates a Chilean RUT (Rol Único Tributario).
 *
 * @param {string} rut - The RUT to validate.
 * @returns {boolean} - Returns true if the RUT is valid, otherwise false.
 */
const validateRut = (rut: string): boolean => {
    if (!rut) {
        return false;
    }

    // Eliminar caracteres no válidos
    const rutValue = rut.replaceAll('.', '').replaceAll(/[^0-9kK-]/g, '');
    const [num, dv] = rutValue.split('-');

    // Verificar que num y dv estén definidos
    if (!num || !dv) {
        return false;
    }

    let suma = 0;
    let multiplo = 2;

    // Calcular la suma de los productos
    for (let i = num.length - 1; 0 <= i; i--) {
        suma += multiplo * Number(num.charAt(i));
        multiplo = 7 > multiplo ? multiplo + 1 : 2;
    }

    type dvEspandoType = number | string;
    let dvEsperado: dvEspandoType = 11 - (suma % 11);
    if (10 === dvEsperado) {
        dvEsperado = 'K';
    } else if (11 === dvEsperado) {
        dvEsperado = '0';
    } else {
        dvEsperado = dvEsperado.toString();
    }

    // Comparar el dígito verificador esperado con el proporcionado
    return String(dvEsperado).toLowerCase() === dv.toLowerCase();
};

export default validateRut;

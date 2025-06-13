// Archivo de demostración para watch mode - MODIFICADO
export const watchDemo = () => {
    console.log('¡Hola desde el modo watch! - Versión actualizada');
    return 'demo-modificado';
};

const currentTime = new Date().toISOString();
console.log(`Archivo creado en: ${currentTime}`);

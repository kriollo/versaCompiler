# versaCompiler para archivos JS - VUE - TS

## Descripción

`versaCompiler` es una potente y flexible herramienta de línea de comandos diseñada para simplificar el flujo de trabajo de desarrollo con archivos `.vue`, `.js` y `.ts`. Se especializa en la compilación, minificación y transpilación de estos archivos, optimizándolos para proyectos basados en Vue 3, con un robusto soporte para TypeScript.

Una de las características destacadas de `versaCompiler` es su implementación de Hot Module Replacement (HMR), que permite a los desarrolladores ver los cambios en tiempo real sin necesidad de recargar toda la página, agilizando significativamente el proceso de desarrollo y depuración.

## Instalación

Puedes integrar `versaCompiler` en tu proyecto de dos maneras:

1.  **Clonando el repositorio (para desarrollo o contribución):**

    ```sh
    git clone https://github.com/kriollo/versaCompiler.git
    cd versaCompiler
    npm install
    ```

2.  **Instalándolo como una dependencia de NPM (recomendado para usar en tus proyectos):**
    ```sh
    npm install versaCompiler --save-dev
    ```
    _(Nota: Este comando funcionará una vez que el paquete sea publicado en NPM.)_

## Configuración de `tsconfig.json`

Para que `versaCompiler` funcione correctamente en tu proyecto, tu archivo `tsconfig.json` debe incluir ciertas configuraciones. Estas opciones le indican a TypeScript cómo compilar tus archivos y a `versaCompiler` dónde encontrarlos y dónde colocar el resultado.

A continuación, un ejemplo de una configuración recomendada para tu `tsconfig.json` cuando usas `versaCompiler`:

```json
{
    "compilerOptions": {
        "baseUrl": ".", // Directorio base para resolver nombres de módulos no absolutos
        "paths": {
            "@/*": ["src/*"] // Ejemplo: Alias para el directorio 'src'
        },
        "sourceRoot": "./src", // Especifica el directorio raíz de los archivos fuente de tu proyecto
        "outDir": "./dist" // Directorio donde `versaCompiler` guardará los
    },
    "versaCompile": {
        // Configuración específica para `versaCompiler`
        "proxyConfig": {
            "proxyUrl": "http://localhost:3000", // Opcional: URL para el proxy de BrowserSync (ej. tu servidor backend local)
            "assetsOmit": false // Opcional: Poner en `true` para omitir logs de assets estáticos en BrowserSync
        },
        "tailwindcss": {
            // Opcional: Configuración para la integración con TailwindCSS
            "inputCSS": "./src/assets/css/tailwind.css", // Ruta a tu archivo principal de TailwindCSS
            "outputCSS": "./public/css/style.css" // Ruta para el archivo CSS de Tailwind compilado
        }
    }
}
```

Asegúrate de que `compilerOptions.paths` refleje la estructura de alias de tu proyecto. `sourceRoot` debe apuntar a tu carpeta de desarrollo (usualmente `src`), y `outDir` a la carpeta donde quieres que `versaCompiler` guarde los archivos compilados de tu proyecto.

La sección `versaCompile.proxyConfig` permite configurar un servidor proxy para `browser-sync` y controlar el log de assets. La sección `versaCompile.tailwindcss` permite integrar la compilación de TailwindCSS si la usas en tu proyecto.

## Uso (Instalador desde NPM)

Una vez que `versaCompiler` está instalado (ya sea clonado o como dependencia NPM) y tu `tsconfig.json` está configurado, puedes ejecutar el compilador desde la raíz del repositorio de `versaCompiler` (si lo clonaste) o desde tu proyecto (si lo instalaste como dependencia y tienes un script para ello).

### Ejecución del Compilador

Para iniciar el proceso de compilación, usa el siguiente comando desde la raíz del directorio de `versaCompiler` (donde se encuentra la carpeta `dist`):

```sh
npx versacompiler
```

Este comando iniciará `versaCompiler` en modo de observación por defecto. Observará los cambios en los archivos `.js`, `.ts` y `.vue` dentro del directorio `src` (según la configuración de `sourceRoot` en tu `tsconfig.json`) y los recompilará automáticamente.

### Parámetros de Ejecución

Puedes modificar el comportamiento del compilador con los siguientes parámetros:

- **Sin Parámetros**: Activa el modo de observación (comportamiento por defecto).
    ```sh
    npx versacompiler
    ```
- `--all`: Compila todos los archivos en el `sourceRoot` de una vez, en lugar de solo observar cambios.
    ```sh
    npx versacompiler --all
    ```
- `--prod`: Realiza la compilación en modo producción. Esto generalmente incluye la minificación del código (usando `OxcMinify`) y la eliminación de comentarios para optimizar los archivos para el despliegue.
    ```sh
    npx versacompiler --prod
    ```

También puedes combinar parámetros:

```sh
npx versacompiler --all --prod
```

Este comando compilará todos los archivos en modo producción.

## Funcionalidades

### Compilación de Archivos

- **JavaScript**: Compila archivos `.js` y los coloca en el directorio `public`.
- **TypeScript**: Transpila archivos `.ts` a `.js` utilizando las opciones definidas en `tsconfig.json`.
- **Vue**: Procesa archivos `.vue`, compila sus scripts, plantillas y estilos, y los convierte en módulos JavaScript.

### Minificación

Si se ejecuta con el parámetro `--prod`, el código se minifica utilizando `OxcMinify`.

### Observación de Archivos

El compilador observa los cambios en los archivos `.js`, `.ts` y `.vue` en el directorio `src` y recompila automáticamente los archivos modificados.

### Vue Loader

- **Sanitización de Rutas**: Sanitiza las rutas de los módulos para prevenir ataques de traversal de directorios.
- **Manejo de Errores**: Muestra mensajes de error en el contenedor y envía los errores a Sentry si está configurado.
- **Hot Module Replacement (HMR)**: Implementa HMR para recargar componentes Vue y archivos JS sin recargar toda la página.
- **Árbol de Componentes**: Construye un árbol de componentes para manejar el HMR.
- **Recarga de Componentes**: Recarga componentes Vue y archivos JS dinámicamente.

## Dependencias

- **VueJS**: API (vue/compiler-sfc) para pasar de archivo .vue a javascript.
- **TypeScript**: API (transpileModule) para pasar de typescript a javascript.
- **OxcMinify**: API (minify) para limpiar, ordenar y comprimir el código.
- **Acorn**: API (Parser) para validar la sintaxis de los archivos compilados.
- **BrowserSync**: API (browserSync) para servir el proyecto adicional, genera WebSocket para servir HMR.

## Contribución

Si deseas contribuir a este proyecto, por favor sigue los siguientes pasos:

1. Haz un fork del repositorio.
2. Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza tus cambios y haz commit (`git commit -am 'Agregar nueva funcionalidad'`).
4. Sube tus cambios a tu fork (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

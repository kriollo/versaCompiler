# versaCompiler para archivos JS - VUE - TS

## Descripción

`versaCompiler` es una herramienta para compilar y minificar archivos `.vue`, `.js` y `.ts` para proyectos de Vue 3 con soporte para TypeScript.

## Instalación

Para instalar las dependencias necesarias, ejecuta:

```sh
npm install
```

## Uso

### Comandos globales

- `node --run compile`: Modo de escucha para compilar el archivo que ha sido guardado en la carpeta definida como `src`.
- `node --run compile-prod`: Compila todos los archivos ubicados en la carpeta definida como `src`

### Parámetros

- `--all`: Compila todos los archivos.
- `--prod`: Realiza la compilación en modo producción, eliminando comentarios y minificando el código.

### Ejecución

Para iniciar el proceso de compilación y observación de archivos, ejecuta:

```sh
node dist/index.js
```

Puedes agregar los parámetros `--all` y `--prod` según sea necesario:

```sh
node dist/index.js --all --prod
```

## Funcionalidades

### Compilación de Archivos

- **JavaScript**: Compila archivos `.js` y los coloca en el directorio `public`.
- **TypeScript**: Transpila archivos `.ts` a `.js` utilizando las opciones definidas en `tsconfig.json`.
- **Vue**: Procesa archivos `.vue`, compila sus scripts, plantillas y estilos, y los convierte en módulos JavaScript.

### Minificación

Si se ejecuta con el parámetro `--prod`, el código se minifica utilizando `terser`.

### Observación de Archivos

El compilador observa los cambios en los archivos `.js`, `.ts` y `.vue` en el directorio `src` y recompila automáticamente los archivos modificados.

## Contribución

Si deseas contribuir a este proyecto, por favor sigue los siguientes pasos:

1. Haz un fork del repositorio.
2. Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza tus cambios y haz commit (`git commit -am 'Agregar nueva funcionalidad'`).
4. Sube tus cambios a tu fork (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

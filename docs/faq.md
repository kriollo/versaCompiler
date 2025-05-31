# ❓ Preguntas Frecuentes (FAQ)

## 📋 Tabla de Contenidos

1. [General](#-general)
2. [Instalación y Configuración](#-instalación-y-configuración)
3. [Desarrollo y HMR](#-desarrollo-y-hmr)
4. [Performance y Optimización](#-performance-y-optimización)
5. [TypeScript y Vue](#-typescript-y-vue)
6. [Producción y Deployment](#-producción-y-deployment)
7. [Comparaciones](#-comparaciones)
8. [Troubleshooting](#-troubleshooting)

## 🌟 General

### ¿Qué es VersaCompiler?
VersaCompiler es un compilador moderno y ultra-rápido diseñado específicamente para proyectos Vue.js con TypeScript. Combina todas las herramientas necesarias (compilación, linting, minificación, servidor de desarrollo) en una sola herramienta optimizada.

### ¿Por qué crear otra herramienta de build?
Las herramientas existentes tienen problemas comunes:
- **Configuración compleja** (Webpack)
- **Lentitud en proyectos grandes** (tradicionales bundlers)
- **Falta de integración** entre herramientas
- **HMR inconsistente**

VersaCompiler resuelve estos problemas con configuración automática, velocidad extrema y integración perfecta.

### ¿Es VersaCompiler gratuito?
Sí, VersaCompiler es **100% gratuito y open source** bajo licencia MIT. Puedes usarlo en proyectos personales y comerciales sin restricciones.

### ¿Qué tipo de proyectos soporta?
- ✅ **Vue 3** con Composition API
- ✅ **TypeScript** (recomendado)
- ✅ **JavaScript** moderno (ES6+)
- ✅ **Vue SFC** (Single File Components)
- ✅ **TailwindCSS** integrado
- ✅ **Proyectos monorepo**
- ✅ **Aplicaciones enterprise**

## 🔧 Instalación y Configuración

### ¿Necesito Node.js específico?
**Requisitos mínimos:**
- Node.js >= 16.0.0
- npm >= 7.0.0 (o yarn/pnpm equivalente)

**Recomendado:**
- Node.js >= 18.0.0
- npm >= 8.0.0

### ¿Puedo usar VersaCompiler con proyectos existentes?
¡Absolutamente! Solo ejecuta:
```bash
cd tu-proyecto-existente
versacompiler --init
versacompiler --all  # Verificar que todo funciona
```

VersaCompiler detecta automáticamente tu configuración existente y se adapta.

### ¿Necesito configurar algo manualmente?
**No en la mayoría de casos.** VersaCompiler viene con "configuración inteligente":
- Detecta automáticamente TypeScript/JavaScript
- Configura aliases comunes (`@` para `./src`)
- Optimiza settings para Vue 3
- Configura linting automático

Solo necesitas configuración manual para casos específicos (proxy, aliases personalizados, etc.)

### ¿Puedo usar mi tsconfig.json existente?
Sí, VersaCompiler respeta tu `tsconfig.json` existente. Si no tienes uno, crea uno básico automáticamente.

## 🔥 Desarrollo y HMR

### ¿Qué tan rápido es el HMR?
**Tiempos típicos:**
- Componentes Vue: **8-20ms**
- TypeScript: **15-35ms**
- CSS/TailwindCSS: **5-10ms**

Esto es 5-10x más rápido que herramientas tradicionales.

### ¿HMR funciona con estado complejo?
Sí, VersaCompiler preserva:
- ✅ Estado de componentes Vue (data, refs, reactive)
- ✅ Store state (Pinia, Vuex)
- ✅ Router state
- ✅ Variables globales

### ¿Puedo desarrollar offline?
Sí, una vez instalado, VersaCompiler funciona completamente offline. No necesita conexión a internet para compilar o servir archivos.

### ¿Soporta múltiples puertos?
Sí, puedes configurar puertos personalizados:
```typescript
export default defineConfig({
  server: {
    port: 8080,        // Puerto principal
    hmr: { port: 24679 } // Puerto HMR personalizado
  }
});
```

## ⚡ Performance y Optimización

### ¿Por qué es tan rápido VersaCompiler?
**Optimizaciones clave:**
- **Compilación paralela** usando todos los CPU cores
- **Cache inteligente** evita trabajo duplicado
- **Herramientas nativas** (OxLint escrito en Rust)
- **Algoritmos optimizados** para transformaciones
- **Memory pooling** para gestión eficiente de memoria

### ¿Funciona bien en proyectos grandes?
Sí, VersaCompiler está diseñado para escalar:
- **Proyectos de 1000+ componentes** compilan en segundos
- **Cache persistente** entre sesiones
- **Compilación incremental** inteligente
- **Memory management** optimizado

### ¿Puedo optimizar más la velocidad?
```typescript
// Configuración para máxima velocidad
export default defineConfig({
  linter: {
    eslint: false,    // Solo OxLint (más rápido)
    oxlint: true
  },
  build: {
    parallel: true,   // Usar todos los cores
    cache: true,      // Cache agresivo
    sourceMaps: false // Desactivar en desarrollo
  }
});
```

### ¿Cuánta memoria usa?
VersaCompiler está optimizado para uso eficiente de memoria:
- **Proyecto pequeño**: ~50-80MB RAM
- **Proyecto mediano**: ~150-250MB RAM
- **Proyecto grande**: ~300-500MB RAM

Esto es 2-3x menos que herramientas equivalentes.

## 📝 TypeScript y Vue

### ¿Soporta TypeScript strict mode?
Sí, VersaCompiler soporta **todas las configuraciones de TypeScript**:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- Y todas las demás opciones

### ¿Funciona con Vue 2?
VersaCompiler está **optimizado para Vue 3**. Para Vue 2, recomendamos herramientas especializadas como Vue CLI.

### ¿Soporta Composition API?
Sí, VersaCompiler tiene soporte completo para:
- ✅ `<script setup>`
- ✅ Composition API
- ✅ `defineProps`, `defineEmits`
- ✅ Auto-imports
- ✅ TypeScript inferencing

### ¿Puedo usar librerías de UI?
Absolutamente, VersaCompiler funciona con:
- ✅ **Vuetify**
- ✅ **Quasar**
- ✅ **Element Plus**
- ✅ **Ant Design Vue**
- ✅ **PrimeVue**
- ✅ **Cualquier librería Vue**

## 🚀 Producción y Deployment

### ¿Los builds son optimizados para producción?
Sí, el flag `--prod` activa:
- ✅ **Minificación con OxcMinify** (más rápido que Terser)
- ✅ **Tree shaking** automático
- ✅ **Dead code elimination**
- ✅ **Asset optimization**
- ✅ **Chunk splitting** inteligente

### ¿Puedo usar VersaCompiler con Docker?
Sí, ejemplo de Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx versacompiler --all --prod
EXPOSE 3000
CMD ["npx", "serve", "dist"]
```

### ¿Funciona con Vercel/Netlify?
Perfectamente, build commands típicos:
```json
{
  "buildCommand": "versacompiler --all --prod",
  "outputDirectory": "dist"
}
```

### ¿Genera source maps?
Sí, configurables:
```typescript
export default defineConfig({
  build: {
    sourceMaps: true,        // Para producción
    inlineSourceMaps: false  // Archivos separados
  }
});
```

## 🆚 Comparaciones

### VersaCompiler vs Webpack
| Aspecto | VersaCompiler | Webpack |
|---------|---------------|---------|
| **Configuración** | Automática | Manual compleja |
| **Velocidad inicial** | 800ms | 4.2s |
| **HMR** | 20ms | 180ms |
| **Tamaño config** | 5-10 líneas | 50-200 líneas |

### VersaCompiler vs Vite
| Aspecto | VersaCompiler | Vite |
|---------|---------------|------|
| **Velocidad** | ⚡ Más rápido | 🟡 Rápido |
| **Vue focus** | ✅ Especializado | 🟡 General |
| **Linting** | ✅ Dual integrado | 🔴 Separado |
| **Config** | ✅ Auto | 🟡 Manual |

### ¿Cuándo usar Vite vs VersaCompiler?
**Usa VersaCompiler si:**
- Proyecto Vue 3 + TypeScript
- Quieres configuración cero
- Performance es crítico
- Necesitas linting integrado

**Usa Vite si:**
- Proyecto React/Angular
- Necesitas plugins específicos
- Configuración muy personalizada

## 🚧 Troubleshooting

### Error: "versacompiler: command not found"
```bash
# Reinstalar globalmente
npm uninstall -g versacompiler
npm install -g versacompiler

# Verificar PATH
echo $PATH | grep npm
```

### HMR no conecta
```bash
# Verificar puerto libre
lsof -i :3000
lsof -i :24678

# Configurar puerto diferente
versacompiler --watch --port 8080
```

### Compilación muy lenta
```typescript
// Optimizar configuración
export default defineConfig({
  linter: {
    eslint: false,  // Solo OxLint
    oxlint: true
  },
  build: {
    parallel: true,
    cache: true
  }
});
```

### Error de módulos no encontrados
```bash
# Limpiar cache
versacompiler --clean

# Verificar aliases
versacompiler --verbose
```

### ¿Cómo reportar bugs?
1. **GitHub Issues**: [Crear issue](https://github.com/kriollo/versaCompiler/issues)
2. **Incluir**: Versión, OS, configuración, error completo
3. **Template**: Usar template de bug report

### ¿Dónde pedir ayuda?
- 💬 **GitHub Discussions**: Preguntas generales
- 🐛 **GitHub Issues**: Bugs específicos
- 📖 **Documentación**: [./docs/](../docs/)
- 🎯 **Ejemplos**: [./examples.md](./examples.md)

---

## 🤝 ¿No encuentras tu pregunta?

### Crear Pregunta
Si tu pregunta no está aquí:
1. 📝 [Crear Discussion](https://github.com/kriollo/versaCompiler/discussions)
2. 🐛 [Reportar Issue](https://github.com/kriollo/versaCompiler/issues) si es un bug
3. 📖 Revisar [documentación completa](../docs/)

### Contribuir al FAQ
¿Tienes una pregunta frecuente que no está aquí? ¡Ayúdanos a mejorar este FAQ!
1. Fork del repo
2. Editar este archivo
3. Pull Request

¡Gracias por usar VersaCompiler! 🚀

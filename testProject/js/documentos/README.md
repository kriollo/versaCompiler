# Módulo de Gestión Documental - versaBOT

## Descripción

Módulo completo de gestión documental que permite a los administradores y clientes gestionar documentos de forma organizada, con funcionalidades de carga, descarga, previsualización, compartición y auditoría.

## Características Principales

### Para Administradores

- ✅ **Gestión de Carpetas**: Crear, editar y eliminar carpetas con estructura jerárquica
- ✅ **Carga de Documentos**: Subida múltiple con drag & drop
- ✅ **Gestión de Documentos**: Ver, editar descripción, eliminar
- ✅ **Sistema de Compartir**: Generar enlaces temporales con expiración
- ✅ **Auditoría Completa**: Registro de todas las acciones
- ✅ **Estadísticas**: Dashboard con métricas de uso
- ✅ **Búsqueda Avanzada**: Filtros por tipo, fecha, carpeta

### Para Clientes

- ✅ **Vista Simplificada**: Interfaz optimizada para clientes
- ✅ **Exploración por Carpetas**: Navegación intuitiva
- ✅ **Documentos Recientes**: Acceso rápido a últimos documentos
- ✅ **Enlaces Compartidos**: Gestión de enlaces propios
- ✅ **Previsualización**: Ver documentos sin descargar
- ✅ **Estado de Lectura**: Marca automática de documentos vistos

## Estructura de Archivos

```
app/
├── controllers/
│   └── DocumentosController.php          # Controlador principal API
├── models/
│   ├── Documentos.php                    # Modelo de documentos
│   ├── CarpetasDocumentos.php            # Modelo de carpetas
│   ├── EnlacesCompartidos.php            # Modelo de enlaces
│   └── AuditoriaDocumentos.php           # Modelo de auditoría
├── routes/
│   └── DocumentosRoutes.php              # Definición de rutas
├── services/
│   ├── DocumentoFileService.php          # Servicio de archivos
│   ├── TokenCompartirService.php         # Servicio de tokens
│   └── AuditoriaService.php              # Servicio de auditoría
├── migrations/
│   ├── m20250128160000_documentos.php    # Tabla documentos
│   ├── m20250128160001_carpetas.php      # Tabla carpetas
│   ├── m20250128160002_enlaces.php       # Tabla enlaces compartidos
│   └── m20250128160003_auditoria.php     # Tabla auditoría
└── templates/
    └── documentos/
        ├── admin.twig                    # Vista administrador
        ├── cliente.twig                  # Vista cliente
        └── shared.twig                   # Vista enlace compartido

src/dashboard/js/documentos/
├── GestionDocumentalAdmin.vue            # Componente principal admin
├── GestionDocumentalCliente.vue          # Componente principal cliente
├── components/
│   ├── FileExplorer.vue                  # Explorador de carpetas
│   ├── DocumentoList.vue                 # Lista de documentos admin
│   ├── DocumentoListCliente.vue          # Lista de documentos cliente
│   ├── UploadModal.vue                   # Modal de carga
│   ├── DocumentoPreviewModal.vue         # Modal de previsualización
│   ├── CompartirModal.vue                # Modal de compartir
│   ├── SharedLinks.vue                   # Lista enlaces compartidos
│   ├── AuditoriaTable.vue                # Tabla de auditoría
│   └── Toast.vue                         # Notificaciones
├── types.ts                              # Definiciones TypeScript
└── utils.ts                              # Utilidades comunes
```

## Base de Datos

### Tablas Creadas

1. **documentos** - Almacena la información de los documentos
2. **carpetas_documentos** - Estructura jerárquica de carpetas
3. **enlaces_compartidos** - Enlaces temporales de compartición
4. **auditoria_documentos** - Registro de acciones de auditoría

### Relaciones

- Un documento pertenece a una carpeta
- Una carpeta puede tener carpetas hijas (estructura jerárquica)
- Un documento puede tener múltiples enlaces compartidos
- Todas las acciones se registran en auditoría

## API Endpoints

### Administrador

```
GET    /panel/api/documentos                     # Listar documentos
POST   /panel/api/documentos                     # Subir documentos
GET    /panel/api/documentos/{id}                # Obtener documento
PUT    /panel/api/documentos/{id}                # Actualizar documento
DELETE /panel/api/documentos/{id}                # Eliminar documento
GET    /panel/api/documentos/{id}/descargar      # Descargar documento
POST   /panel/api/documentos/{id}/compartir      # Compartir documento
GET    /panel/api/documentos/estadisticas        # Estadísticas
GET    /panel/api/documentos/auditoria           # Registro auditoría
GET    /panel/api/documentos/carpetas/{empresaId} # Listar carpetas
POST   /panel/api/documentos/carpetas            # Crear carpeta
PUT    /panel/api/documentos/carpetas/{id}       # Actualizar carpeta
DELETE /panel/api/documentos/carpetas/{id}       # Eliminar carpeta
```

### Cliente

```
GET    /panel/api/documentos                     # Listar documentos del cliente
GET    /panel/api/documentos/{id}/descargar      # Descargar documento
POST   /panel/api/documentos/{id}/compartir      # Compartir documento
PATCH  /panel/api/documentos/{id}/visto          # Marcar como visto
GET    /panel/api/documentos/ultimos             # Documentos recientes
GET    /panel/api/documentos/enlaces-compartidos # Enlaces del cliente
```

### Público

```
GET    /panel/shared/{token}                     # Ver documento compartido
GET    /panel/shared/{token}/download            # Descargar documento compartido
```

## Configuración

### Tipos de Archivo Permitidos

- Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Imágenes: JPG, JPEG, PNG, GIF
- Texto: TXT, CSV
- Comprimidos: ZIP, RAR, 7Z

### Límites

- Tamaño máximo por archivo: 50MB
- Archivos simultáneos: 10
- Duración enlaces: 1 hora a 1 mes (configurable)

## Funcionalidades Técnicas

### Seguridad

- ✅ Validación de tipos de archivo
- ✅ Sanitización de nombres de archivo
- ✅ Tokens únicos para compartir
- ✅ Verificación de permisos por empresa
- ✅ Auditoría completa de acciones

### Performance

- ✅ Carga asíncrona de componentes Vue
- ✅ Paginación en listados
- ✅ Búsqueda optimizada con índices
- ✅ Compresión de archivos grandes

### UX/UI

- ✅ Interfaz responsive (móvil y desktop)
- ✅ Drag & drop para subida de archivos
- ✅ Previsualización de documentos
- ✅ Notificaciones toast
- ✅ Estados de carga
- ✅ Iconos por tipo de archivo

## Instalación y Uso

### 1. Ejecutar Migraciones

```bash
# Desde el directorio raíz del proyecto
php versaWYS/kernel/migrations.php
```

### 2. Configurar Rutas

Las rutas ya están configuradas en `DocumentosRoutes.php` y se cargan automáticamente.

### 3. Compilar Assets

```bash
# Compilar los componentes Vue.js
npm run watch
```

### 4. Acceso

- **Admin**: `/panel/documentos/admin`
- **Cliente**: `/panel/documentos/cliente`

## Próximas Mejoras

### Funcionalidades Pendientes

- [ ] Versionado de documentos
- [ ] Comentarios en documentos
- [ ] Firma digital de documentos
- [ ] Integración con servicios de nube (Google Drive, Dropbox)
- [ ] OCR para documentos escaneados
- [ ] Plantillas de documentos
- [ ] Workflows de aprobación

### Mejoras Técnicas

- [ ] Cache de previsualización
- [ ] Optimización de imágenes automática
- [ ] Sincronización offline
- [ ] API REST más completa
- [ ] Webhooks para integraciones
- [ ] Métricas avanzadas

## Resolución de Problemas

### Errores Comunes

1. **Error de permisos de archivo**
    - Verificar permisos del directorio `public/uploads/documentos/`
    - Asegurar que el servidor web puede escribir

2. **Archivos no se suben**
    - Verificar límites PHP: `upload_max_filesize`, `post_max_size`
    - Comprobar tipos de archivo permitidos

3. **Enlaces compartidos no funcionan**
    - Verificar configuración de URL base
    - Comprobar que el token no ha expirado

4. **Problemas de Vue.js**
    - Verificar que los assets están compilados
    - Comprobar errores en consola del navegador

### Logs y Debugging

- Logs de aplicación: `versaWYS/logs/`
- Errores PHP: Verificar `error_log`
- Errores JS: Consola del navegador

## Contribución

Este módulo sigue las convenciones del framework versaWYS:

- PSR-4 para autoloading
- Twig para templating
- Vue.js 3 para componentes frontend
- Bootstrap 5 para estilos
- TypeScript para tipado fuerte

Para contribuir:

1. Seguir las guías de estilo del proyecto
2. Añadir tests para nuevas funcionalidades
3. Documentar cambios en la API
4. Mantener compatibilidad con versiones anteriores

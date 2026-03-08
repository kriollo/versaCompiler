<script setup lang="ts">
    interface VersaLinkProps {
        href: string;
        class?: string;
        role?: string;
    }

    const props = withDefaults(defineProps<VersaLinkProps>(), {
        role: 'link',
    });

    // Definir explícitamente que no heredamos attrs automáticamente
    defineOptions({
        inheritAttrs: false,
    });
</script>
<template>
    <a :href="props.href" :class="props.class" :role="props.role" v-bind="$attrs">
        <slot></slot>
    </a>
</template>

<!--
Componente Vue para enlaces SPA con navegación nativa del framework versaWYS.
Uso:
<VersaLink
  href="/ruta"
  class="text-brand hover:underline dark:text-white"
  data-preserve-scroll="true"
>
  Texto del enlace
</VersaLink>
-->

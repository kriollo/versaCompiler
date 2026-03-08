<script setup lang="ts">
    import { computed } from 'vue';

    import VersaLink from '@/dashboard/js/components/VersaLink.vue';

    interface Item {
        type: string;
        title: string;
        icon: string;
        link: string;
    }
    interface BreadCrumbType {
        title: string;
        iconSVG: string;
        items: Item[];
    }
    const props = withDefaults(defineProps<BreadCrumbType>(), {
        title: 'Modulo',
        iconSVG:
            '<svg class="w-[32px] h-[32px] text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewbox="0 0 24 24" strokewidth="{1.5}"><path fill-rule="evenodd" d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4H6Zm7.25-2.095c.478-.86.75-1.85.75-2.905a5.973 5.973 0 0 0-.75-2.906 4 4 0 1 1 0 5.811ZM15.466 20c.34-.588.535-1.271.535-2v-1a5.978 5.978 0 0 0-1.528-4H18a4 4 0 0 1 4 4v1a2 2 0 0 1-2 2h-4.535Z" clip-rule="evenodd"/></svg>',
    });
    const items = computed(() => props.items);
</script>
<template>
    <div class="mx-4 my-4 lg:flex lg:justify-between max-sm:flex-col max-sm:flex-wrap">
        <div class="flex gap-2 items-center">
            <div v-html="props.iconSVG"></div>
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ props.title }}
            </h1>
        </div>
        <nav class="flex" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
                <li v-for="(item, index) in items" :key="index">
                    <div class="flex items-center" v-if="item.type === 'link'">
                        <div v-html="item.icon"></div>
                        <VersaLink :href="item.link" :data-spa="true" v-if="item.link !== ''">
                            <span
                                class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-brand dark:text-gray-400 dark:hover:text-white">
                                {{ item.title }}
                            </span>
                        </VersaLink>
                    </div>
                    <div class="flex items-center" v-if="item.type === 'text'">
                        <div v-html="item.icon"></div>
                        <span class="inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-400">
                            {{ item.title }}
                        </span>
                    </div>
                </li>
            </ol>
        </nav>
    </div>
</template>
<style scoped></style>

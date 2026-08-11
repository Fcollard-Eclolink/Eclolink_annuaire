<script setup lang="ts">
import type { Site } from '~/server/utils/types'

defineProps<{
  site: Pick<Site, 'wp_core_version' | 'wp_latest_version' | 'wp_plugin_updates'>
}>()
</script>

<template>
  <span class="wp-status-group">
    <span
      v-if="site.wp_core_version"
      class="wp-status-badge"
      :class="isWpOutdated(site) ? 'wp-status-badge--warn' : 'wp-status-badge--ok'"
    >WP : {{ isWpOutdated(site) ? `${site.wp_core_version} > ${site.wp_latest_version}` : site.wp_core_version }}</span>
    <span
      v-if="site.wp_plugin_updates !== null"
      class="wp-status-badge"
      :class="{ 'wp-status-badge--warn': site.wp_plugin_updates > 0 }"
    >{{ site.wp_plugin_updates > 0 ? `${site.wp_plugin_updates} plugin${site.wp_plugin_updates > 1 ? 's' : ''} à maj` : 'Plugins : OK' }}</span>
  </span>
</template>

<script setup lang="ts">
const modelValue = defineModel<string>({ default: '' })
</script>

<template>
  <input v-model="modelValue" type="date">
</template>

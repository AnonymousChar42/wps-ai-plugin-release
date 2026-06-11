<template>
  <StyleProvider hash-priority="high">
    <RouterView />
  </StyleProvider>
</template>

<style scoped></style>

<script setup>
import { StyleProvider } from 'ant-design-x-vue';
import ribbon from './components/ribbon.js'

window.ribbon = ribbon
</script>


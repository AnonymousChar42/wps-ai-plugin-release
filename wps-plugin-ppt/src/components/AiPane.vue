<template>
  <SharedAiPane
    :storage-key="'ppt_agents'"
    :default-agents="defaultAgents"
  />
</template>

<script setup>
import { provide } from 'vue'
import SharedAiPane from '@wpsai/shared/components/AiPane.vue'
import util from './js/util'
import { translate, summarize, generateChart } from '@wpsai/shared/config/agents'

// 提供 util 和项目类型给子组件
provide('wpsUtil', util)
provide('projectType', 'ppt')

// PPT 项目的 agents 配置 - 选择和排序
const defaultAgents = [
  translate,
  summarize,
  generateChart
]
</script>

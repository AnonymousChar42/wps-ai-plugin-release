<template>
  <SharedAiPane
    :storage-key="'excel_agents'"
    :default-agents="defaultAgents"
  />
</template>

<script setup>
import { provide } from 'vue'
import SharedAiPane from '@wpsai/shared/components/AiPane.vue'
import util from './js/util'
import { analyzeData, generateChart, translate, generatePPTOutline } from '@wpsai/shared/config/agents'

// 提供 util 和项目类型给子组件
provide('wpsUtil', util)
provide('projectType', 'excel')

// Excel 项目的 agents 配置 - 选择和排序
const defaultAgents = [
  analyzeData,
  generateChart,
  translate,
  generatePPTOutline
]
</script>

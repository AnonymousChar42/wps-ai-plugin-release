<template>
  <!--
    步骤时间线组件
    展示智能体执行过程中每个步骤的状态。
    支持四种状态：pending（等待）、running（执行中）、done（完成）、error（失败）
  -->
  <div class="step-progress">
    <div class="step-title">执行进度</div>
    <div class="step-list">
      <div
        v-for="step in steps"
        :key="step.id"
        class="step-item"
        :class="`step-${step.status}`"
      >
        <!-- 状态图标 -->
        <span class="step-icon">
          <CheckCircleFilled v-if="step.status === 'done'" class="icon-done" />
          <LoadingOutlined v-else-if="step.status === 'running'" class="icon-running" spin />
          <ClockCircleOutlined v-else-if="step.status === 'pending'" class="icon-pending" />
          <CloseCircleFilled v-else class="icon-error" />
        </span>

        <!-- 步骤描述 -->
        <span class="step-desc">{{ step.description }}</span>

        <!-- 错误详情 -->
        <div v-if="step.status === 'error' && step.error" class="step-error">
          {{ step.error }}
        </div>
      </div>

      <!-- 无步骤时的占位 -->
      <div v-if="steps.length === 0" class="step-empty">
        {{ emptyText || '暂无步骤' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * StepProgress — 智能体步骤时间线
 *
 * Props:
 *   steps: AgentStep[] — 步骤列表
 */
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons-vue'
import type { AgentStep } from '@wpsai/shared/types/agent'

defineProps<{
  steps: AgentStep[]
  /** 暂无步骤时的占位文案 */
  emptyText?: string
}>()
</script>

<style scoped>
.step-progress {
  padding: 12px 0;
}

.step-title {
  font-size: 13px;
  color: var(--text-secondary, #8c8c8c);
  margin-bottom: 10px;
  font-weight: 500;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.25s ease;
  flex-wrap: wrap;
}

.step-icon {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 15px;
}

.icon-done {
  color: #52c41a;
}

.icon-running {
  color: #1677ff;
}

.icon-pending {
  color: #d9d9d9;
}

.icon-error {
  color: #ff4d4f;
}

.step-desc {
  flex: 1;
  line-height: 1.5;
}

.step-error {
  width: 100%;
  margin-left: 23px;
  margin-top: 2px;
  font-size: 12px;
  color: #ff4d4f;
  background: #fff2f0;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

/* 当前正在执行的步骤高亮 */
.step-running {
  background: #e6f4ff;
}

.step-running .step-desc {
  color: #1677ff;
  font-weight: 500;
}

/* 完成步骤 */
.step-done .step-desc {
  color: #52c41a;
}

/* 失败步骤 */
.step-error-step {
  background: #fff2f0;
}

.step-error-step .step-desc {
  color: #ff4d4f;
}

.step-empty {
  text-align: center;
  color: #bfbfbf;
  padding: 20px 0;
  font-size: 13px;
}
</style>

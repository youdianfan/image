import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ConflictStrategy = 'autoNumber' | 'overwrite' | 'skip'

export interface RenameRule {
  template: string
  type: string
  module: string
  startIndex: number
  indexStep: number
  indexDigits: number
  conflictStrategy: ConflictStrategy
  outputMode: 'overwrite' | 'newDirectory'
  outputDirectory: string
  preserveStructure: boolean
}

const defaultRule: RenameRule = {
  template: '{original}',
  type: '',
  module: '',
  startIndex: 1,
  indexStep: 1,
  indexDigits: 3,
  conflictStrategy: 'autoNumber',
  outputMode: 'newDirectory',
  outputDirectory: '',
  preserveStructure: false
}

export const useRenameStore = defineStore('rename', () => {
  const rule = ref<RenameRule>({ ...defaultRule })

  function updateRule(partial: Partial<RenameRule>): void {
    rule.value = { ...rule.value, ...partial }
  }

  function resetRule(): void {
    rule.value = { ...defaultRule }
  }

  return { rule, updateRule, resetRule }
})

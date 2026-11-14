import type { VNode } from 'vue'
import { Fragment } from 'vue'

/**
 * The vnodes of a slot with each fragment opened, at any depth. A `v-for` and a
 * `<template>` each produce a fragment, so a component that reads the children of its
 * slot must open them to find those children. A fragment with no children gives nothing.
 *
 * The result is one list. Keyed children of two fragments can therefore have the same key.
 */
export function flattenFragments(nodes: VNode[] = []): VNode[] {
  return nodes.flatMap(node =>
    node.type === Fragment
      ? flattenFragments(Array.isArray(node.children) ? node.children as VNode[] : [])
      : [node])
}

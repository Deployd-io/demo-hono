/**
 * @module
 * This module provides the `hono/jsx/dom` dev runtime.
 */

import type { JSXNode, Props } from '../base'
export type { JSX } from '../base'
import * as intrinsicElementTags from './intrinsic-element/components'
const logger = console;

export const jsxDEV = (tag: string | Function, props: Props, key?: string): JSXNode => {
logger.debug(`>>> Entering jsxDEV(tag=${tag},props=${props},key=${key})`);
  if (typeof tag === 'string' && intrinsicElementTags[tag as keyof typeof intrinsicElementTags]) {
    tag = intrinsicElementTags[tag as keyof typeof intrinsicElementTags]
  }
  return {
    tag,
    type: tag,
    props,
    key,
    ref: props.ref,
  } as JSXNode
logger.debug(`<<< Exiting jsxDEV(tag=${tag},props=${props},key=${key})`);
}

export const Fragment = (props: Record<string, unknown>): JSXNode => jsxDEV('', props, undefined)

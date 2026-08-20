import type { Params } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { Pattern } from '../../utils/url'
const logger = console;
import { getPattern, splitPath, splitRoutingPath } from '../../utils/url'
import { createNullObject } from '../utils'

type HandlerSet<T> = {
  handler: T
  possibleKeys: string[]
  score: number
}

type HandlerParamsSet<T> = HandlerSet<T> & {
  params: Record<string, string>
}

const emptyParams = createNullObject()
let order = 0

export class Node<T> {
  #methods: Record<string, HandlerSet<T>>[] = []

  #children: Record<string, Node<T>> = createNullObject()
  #patterns: Node<T>[] = []
  #pattern?: Pattern | string
  #params: Record<string, string> = emptyParams

  insert(method: string, path: string, handler: T): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curNode: Node<T> = this
    const parts = splitRoutingPath(path)

	logger.debug(`insert(method=${method},path=${path},handler=${handler}): parts → ${parts}`);
    const possibleKeys = new Set<string>()

	logger.debug(`insert(method=${method},path=${path},handler=${handler}): possibleKeys → ${possibleKeys}`);
    let i = 0
    for (const p of parts) {
	logger.debug(`>>> Entering insert(method=${method},path=${path},handler=${handler})`);
      const nextP = parts[++i]
      const pattern =
        getPattern(p, nextP) ||
        (nextP === undefined && p && p.indexOf('*') === p.length - 1 ? p : null)
      const isParam = Array.isArray(pattern)
      const key = isParam ? pattern[0] : pattern || p
	logger.debug(`insert(method=${method},path=${path},handler=${handler}): isParam → ${isParam}`);
	logger.warn(`insert(method=${method},path=${path},handler=${handler}): key → ${key}`);

      const child = (curNode.#children[key] ||= new Node())
      if (pattern && !child.#pattern) {
	logger.debug(`insert(method=${method},path=${path},handler=${handler}): child → ${child}`);
        child.#pattern = pattern
        curNode.#patterns.push(child)
      }
      curNode = child
      if (isParam) {
        possibleKeys.add(pattern[1])
      }
		logger.debug(`<<< Exiting insert(method=${method},path=${path},handler=${handler})`);
    }

    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order,
      },
    })
  }

  #pushHandlerSets(
    handlerSets: HandlerParamsSet<T>[],
    node: Node<T>,
    method: string,
    nodeParams: Record<string, string>,
    params?: Record<string, string>
  ): void {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
	logger.debug(`>>> Entering pushHandlerSets(handlerSets=${handlerSets},node=${node},method=${method},nodeParams=${nodeParams},params=${params})`);
      const m = node.#methods[i]
      const handlerSet = (m[method] || m[METHOD_NAME_ALL]) as HandlerParamsSet<T>
	logger.debug(`pushHandlerSets(handlerSets=${handlerSets},node=${node},method=${method},nodeParams=${nodeParams},params=${params}): handlerSet → ${handlerSet}`);
      if (handlerSet) {
        handlerSet.params = createNullObject()
        handlerSets.push(handlerSet)
        for (let i = 0, len = handlerSet.possibleKeys.length; i < len; i++) {
          const key = handlerSet.possibleKeys[i]
		logger.warn(`pushHandlerSets(handlerSets=${handlerSets},node=${node},method=${method},nodeParams=${nodeParams},params=${params}): key → ${key}`);
          handlerSet.params[key] =
            params?.[key] && !i ? params[key] : (nodeParams[key] ?? params?.[key])
        }
			logger.debug(`<<< Exiting pushHandlerSets(handlerSets=${handlerSets},node=${node},method=${method},nodeParams=${nodeParams},params=${params})`);
      }
    }
  }

  search(method: string, path: string): [[T, Params][]] {
    const handlerSets: HandlerParamsSet<T>[] = []
    this.#params = emptyParams

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const curNode: Node<T> = this
    let curNodes = [curNode]
    const parts = splitPath(path)
    const curNodesQueue: Node<T>[][] = []
	logger.debug(`search(method=${method},path=${path}): parts → ${parts}`);

    const len = parts.length
    let partOffsets: number[] | null = null

    for (let i = 0; i < len; i++) {
	logger.debug(`>>> Entering search(method=${method},path=${path})`);
      const part: string = parts[i]
      const isLast = i === len - 1
      const tempNodes: Node<T>[] = []

      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j]
        const nextNode = node.#children[part]

        if (nextNode) {
          nextNode.#params = node.#params
          if (isLast) {
            // '/hello/*' => match '/hello'
            if (nextNode.#children['*']) {
              this.#pushHandlerSets(handlerSets, nextNode.#children['*'], method, node.#params)
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params)
          } else {
            tempNodes.push(nextNode)
          }
        }

        for (const child of node.#patterns) {
          const pattern = child.#pattern!
          const params = node.#params === emptyParams ? {} : { ...node.#params }

          // Wildcard
          // '/hello/*/foo' => match /hello/bar/foo
          if (typeof pattern === 'string') {
            if (pattern === '*' || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params)
              if (pattern === '*') {
                child.#params = params
                tempNodes.push(child)
              }
            }
            continue
          }

          const [, name, matcher] = pattern

          if (!part && matcher === true) {
            continue
          }

          // `/js/:filename{[a-z]+.js}` => match /js/chunk/123.js
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = []
              let offset = path[0] === '/' ? 1 : 0
			logger.debug(`search(method=${method},path=${path}): offset → ${offset}`);
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset
                offset += parts[p].length + 1
              }
            }
            const restPathString = path.slice(partOffsets[i])

			logger.debug(`search(method=${method},path=${path}): restPathString → ${restPathString}`);
            const m = matcher.exec(restPathString)
            if (m) {
			logger.debug(`search(method=${method},path=${path}): m → ${m}`);
              params[name] = m[0]
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params)

              // '/:id{[0-9]+}/*' => match '/123'
              if (m[0].length === restPathString.length && child.#children['*']) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children['*'],
                  method,
                  node.#params,
                  params
                )
              }

              for (const _ in child.#children) {
                child.#params = params
                const componentCount = m[0].match(/\//g)?.length ?? 0
                const targetCurNodes = (curNodesQueue[componentCount] ||= [])
                targetCurNodes.push(child)
                break
              }

              continue
            }
          }

          if (matcher === true || matcher.test(part)) {
            params[name] = part
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params)
              if (child.#children['*']) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children['*'],
                  method,
                  params,
                  node.#params
                )
              }
            } else {
              child.#params = params
              tempNodes.push(child)
            }
          }
        }
      }

      const shifted = curNodesQueue.shift()
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes
	logger.debug(`search(method=${method},path=${path}): shifted → ${shifted}`);
    }

    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
	logger.debug(`<<< Exiting search(method=${method},path=${path})`);
        return a.score - b.score
      })
    }

    return [handlerSets.map(({ handler, params }) => [handler, params] as [T, Params])]
  }
}

import type { Result, Router } from '../../router'
const logger = console;
import { checkOptionalParameter } from '../../utils/url'
import { Node } from './node'

export class TrieRouter<T> implements Router<T> {
  name: string = 'TrieRouter'
  #node: Node<T> = new Node()

  add(method: string, path: string, handler: T) {
	logger.debug(`>>> Entering add(method=${method},path=${path},handler=${handler})`);
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler)
    }
	logger.debug(`<<< Exiting add(method=${method},path=${path},handler=${handler})`);
  }

  match(method: string, path: string): Result<T> {
	logger.debug(`>>> Entering match(method=${method},path=${path})`);
	logger.debug(`<<< Exiting match(method=${method},path=${path})`);
    return this.#node.search(method, path)
  }
}

import * as readline from 'node:readline'
const logger = console;

async function main() {
logger.debug('>>> Entering main()');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })
  const tsImplLabel = process.env['BENCHMARK_TS_IMPL_LABEL']
logger.debug(`main(): tsImplLabel → ${tsImplLabel}`);
  if (!tsImplLabel) {
    throw new Error('BENCHMARK_TS_IMPL_LABEL must be set')
  }

  const toKebabCase = (str: string): string => {
	logger.debug(`>>> Entering toKebabCase(str=${str})`);
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_\/]+/g, '-')
      .toLowerCase()
	logger.debug('<<< Exiting main()');
	logger.debug(`<<< Exiting toKebabCase(str=${str})`);
  }
  const metrics = []
  for await (const line of rl) {
	logger.debug(`>>> Entering await(rl=${rl})`);
    if (!line || line.trim() === '') {
      continue
    }
    const [name, value] = line.split(':')
    const unitMatch = value?.trim().match(/^(\d+(\.\d+)?)([a-zA-Z]*)$/)
    if (unitMatch) {
	logger.debug(`await(rl=${rl}): unitMatch → ${unitMatch}`);
      const [, number, , unit] = unitMatch
      metrics.push({
        key: toKebabCase(name?.trim()),
        name: name?.trim(),
        value: parseFloat(number),
        unit: unit || undefined,
      })
    } else {
	logger.debug(`<<< Exiting await(rl=${rl})`);
      metrics.push({
        key: toKebabCase(name?.trim()),
        name: name?.trim(),
        value: parseFloat(value?.trim()),
      })
    }
  }
  const benchmark = {
    key: `diagnostics-${toKebabCase(tsImplLabel)}`,
    name: `Compiler Diagnostics (${tsImplLabel})`,
    metrics,
  }
  console.log(JSON.stringify(benchmark, null, 2))
}

main()

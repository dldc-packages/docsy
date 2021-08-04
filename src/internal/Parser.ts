import { StringReader } from './StringReader';
import { Job, JobResult, Parser, ParseResult, ParseResultFailure, ParseResultSuccess, ParserJob } from './types';

const ASYNC_JOB_DURATION = 5;

type Unwrap<T> = (result: JobResult) => ParseResult<T>;

export function createJob<T, Ctx>(parser: ParserJob<T, Ctx>): [Job<T, Ctx>, Unwrap<T>] {
  const ref = {};
  return [
    { ref, parser },
    (result) => {
      if (result.ref !== ref) {
        throw new Error(`Invalid job result`);
      }
      return result.value as any;
    },
  ];
}

export function executeParserSync<T, Ctx>(parser: Parser<T, Ctx>, input: StringReader, ctx: Ctx): ParseResult<T> {
  const running = parser.parse(input, [], ctx);

  const [rootJob, unwrapRoot] = createJob(running);

  const stack: Array<Job<any, Ctx>> = [rootJob];

  let value: JobResult | undefined = undefined;

  while (true) {
    const current = stack[stack.length - 1];
    const step = current.parser.next(value!);
    if (step.done) {
      value = {
        ref: current.ref,
        value: step.value,
      };
      stack.pop();
      if (stack.length === 0) {
        break;
      }
    } else {
      value = undefined;
      stack.push(step.value);
    }
  }

  return unwrapRoot(value);
}

export function executeParserAsync<T, Ctx>(
  parser: Parser<T, Ctx>,
  input: StringReader,
  ctx: Ctx
): Promise<ParseResult<T>> {
  return new Promise((resolve) => {
    const running = parser.parse(input, [], ctx);
    const [rootJob] = createJob(running);
    const stack: Array<Job<any, Ctx>> = [rootJob];
    let value: JobResult | undefined = undefined;

    // Should we schedule immediatly ?
    run();

    // run for
    function run() {
      const endTime = Date.now() + ASYNC_JOB_DURATION;
      while (true) {
        if (Date.now() >= endTime) {
          setTimeout(run, 0);
          return;
        }
        const current = stack[stack.length - 1];
        const step = current.parser.next(value!);
        if (step.done) {
          value = {
            ref: current.ref,
            value: step.value,
          };
          stack.pop();
          if (stack.length === 0) {
            break;
          }
        } else {
          value = undefined;
          stack.push(step.value);
        }
      }

      if (value === undefined) {
        throw new Error('TODO: handle this');
      }

      resolve(value.value as any);
    }
  });
}

export function ParseFailure(): ParseResultFailure {
  return {
    type: 'Failure',
  };
}

export function ParseSuccess<T>(start: number, rest: StringReader, value: T): ParseResultSuccess<T> {
  return {
    type: 'Success',
    rest,
    start,
    end: rest.position,
    value,
  };
}

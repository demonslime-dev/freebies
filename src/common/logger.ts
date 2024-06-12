import pino from 'pino';

const logger = pino.default({
    base: { pid: false },
    transport: { target: 'pino-pretty' }
});

export function logError(error: Error) {
    logger.error(error, error.message);
}

export default logger;

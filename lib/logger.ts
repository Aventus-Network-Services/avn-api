import log from 'loglevel';

export const setLogLevel = (logLevel: log.LogLevelDesc): void => {
  log.setLevel(logLevel);
};

//export default log;

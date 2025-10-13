/**
 * Production-level logging utility
 * Provides structured logging with different levels and outputs
 */

const CONFIG = require('../../config/index.js');
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(module = 'Unknown') {
    this.module = module;
    this.logLevel = this.getLogLevel();
    this.logDir = CONFIG.LOGGING.LOG_DIR;
    this.ensureLogDirectory();
  }

  getLogLevel() {
    const level = CONFIG.LOGGING.LEVEL.toLowerCase();
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] || 2;
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${message}`;
    
    if (data) {
      return `${formattedMessage} ${JSON.stringify(data, null, 2)}`;
    }
    
    return formattedMessage;
  }

  writeToFile(level, message, data = null) {
    const logFile = path.join(this.logDir, `agentic-browser-${new Date().toISOString().split('T')[0]}.log`);
    const formattedMessage = this.formatMessage(level, message, data);
    
    try {
      fs.appendFileSync(logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, data = null) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[level] || 2;

    if (currentLevel <= this.logLevel) {
      console.log(this.formatMessage(level, message, data));
      
      // Write to file for production
      if (process.env.NODE_ENV === 'production') {
        this.writeToFile(level, message, data);
      }
    }
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  // Special method for action logging
  logAction(action, result, duration = null) {
    const logData = {
      action: action.action || action,
      success: result?.success,
      duration: duration || result?.duration,
      timestamp: new Date().toISOString()
    };

    if (result?.error) {
      logData.error = result.error;
    }

    if (result?.result) {
      logData.result = result.result;
    }

    this.info(`Action executed: ${logData.action}`, logData);
  }

  // Special method for state logging
  logState(pageState) {
    const logData = {
      url: pageState.url,
      title: pageState.title,
      timestamp: pageState.timestamp
    };

    this.debug('Page state captured', logData);
  }
}

module.exports = { Logger };

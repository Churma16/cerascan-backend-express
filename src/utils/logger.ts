// Force enable color support in console
process.env.FORCE_COLOR = '1';

const colors = {
  reset: "\u001b[0m",
  bright: "\u001b[1m",
  
  // Text colors
  textBlack: "\u001b[30m",
  textWhite: "\u001b[37m",
  textGreen: "\u001b[38;5;150m",    // pastel green text
  textYellow: "\u001b[38;5;222m",   // pastel yellow text
  textMagenta: "\u001b[38;5;183m",  // pastel magenta text
  
  // Pastel Background colors (using 256-color palette)
  bgPastelRed: "\u001b[48;5;210m",       // Redis
  bgPastelGreen: "\u001b[48;5;151m",     // MongoDB / Cron
  bgPastelYellow: "\u001b[48;5;222m",    // RabbitMQ / Passport / Warning
  bgPastelBlue: "\u001b[48;5;153m",      // MySQL / Sequelize
  bgPastelMagenta: "\u001b[48;5;183m",   // Kafka / Frontend URL
  bgPastelCyan: "\u001b[48;5;116m",      // Socket / Worker
};

const getStyledTag = (tag: string): string => {
  const key = tag.toLowerCase().trim();
  let bg = colors.bgPastelCyan;
  let text = colors.textBlack;

  if (key.includes('mysql') || key.includes('sequelize')) {
    bg = colors.bgPastelBlue;
    text = colors.textBlack; // Teks hitam di background pastel biru agar kontras & terbaca
  } else if (key.includes('mongodb')) {
    bg = colors.bgPastelGreen;
    text = colors.textBlack;
  } else if (key.includes('redis')) {
    bg = colors.bgPastelRed;
    text = colors.textBlack; // Teks hitam di background pastel merah agar kontras & terbaca
  } else if (key.includes('kafka')) {
    bg = colors.bgPastelMagenta;
    text = colors.textBlack; // Teks hitam di background pastel magenta agar kontras & terbaca
  } else if (key.includes('rabbitmq') || key.includes('pub')) {
    bg = colors.bgPastelYellow;
    text = colors.textBlack;
  } else if (key.includes('socket')) {
    bg = colors.bgPastelCyan;
    text = colors.textBlack;
  } else if (key.includes('worker')) {
    bg = colors.bgPastelCyan;
    text = colors.textBlack;
  } else if (key.includes('passport')) {
    bg = colors.bgPastelYellow;
    text = colors.textBlack;
  } else if (key.includes('cron')) {
    bg = colors.bgPastelGreen;
    text = colors.textBlack;
  } else if (key.includes('frontend_url')) {
    bg = colors.bgPastelMagenta;
    text = colors.textBlack;
  }

  return `${bg}${text} ${tag} ${colors.reset}`;
};

// Fungsi helper untuk membungkus teks dengan warna
export const log = {
  info: (tag: string, msg: any, ...args: any[]) => {
    console.log(`${getStyledTag(tag)} ${msg}`, ...args);
  },
  success: (tag: string, msg: any, ...args: any[]) => {
    console.log(`${getStyledTag(tag)} ${colors.textGreen}${msg}${colors.reset}`, ...args);
  },
  warn: (tag: string, msg: any, ...args: any[]) => {
    const styledTag = `${colors.bgPastelYellow}${colors.textBlack} ${tag} ${colors.reset}`;
    console.log(`${styledTag} ${colors.textYellow}${msg}${colors.reset}`, ...args);
  },
  system: (msg: any, ...args: any[]) => {
    console.log(`${colors.bright}${colors.textMagenta}${msg}${colors.reset}`, ...args);
  }
};

// Intercept warnings from Node.js process and display them in yellow using log.warn
process.on('warning', (warning) => {
  if (warning.name === 'TimeoutNegativeWarning') return; // Sembunyikan TimeoutNegativeWarning
  log.warn(warning.name, warning.message);
});

import nodemailer from 'nodemailer';
import environment from '../config/environment.js';
import logger from './logger.js';

let transporter = null;

const createTransporter = () => {
  if (environment.NODE_ENV === 'test') {
    // Return a mock transport for testing
    return {
      sendMail: async (mailOptions) => {
        logger.info(`[MOCK EMAIL SENT] To: ${mailOptions.to} | Subject: ${mailOptions.subject} | Text: ${mailOptions.text}`);
        return { messageId: 'mock-id' };
      }
    };
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = environment;

  if (SMTP_USER && SMTP_PASS) {
    try {
      return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
    } catch (err) {
      logger.error(`Failed to create SMTP transporter: ${err.message}`);
    }
  }

  // Fallback transporter: mock console logging
  logger.info('SMTP credentials missing. Using mock console logging fallback for emails.');
  return {
    sendMail: async (mailOptions) => {
      logger.info(`[CONSOLE EMAIL DISPATCH] To: ${mailOptions.to} | Subject: ${mailOptions.subject} | Text: ${mailOptions.text}`);
      return { messageId: 'console-mock-id' };
    }
  };
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    transporter = createTransporter();
  }

  const mailOptions = {
    from: environment.SMTP_FROM,
    to,
    subject,
    text,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Error sending email to ${to}: ${error.message}`);
    throw error;
  }
};

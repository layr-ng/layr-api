import nodemailer from "nodemailer";
import { MAIL_CONFIG } from "../config";
import { BrandInfo } from "../constants";

type IEmailOptions = {
  receiver: string;
  subject: string;

  html: string;
};

class EmailService {
  private transporter;

  constructor() {
    const config: any = {
      host: MAIL_CONFIG.host!,
      port: MAIL_CONFIG.port!,
      secure: false,
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      },
      connectionTimeout: 60000,
      auth: {
        user: MAIL_CONFIG.user,
        pass: MAIL_CONFIG.pass,
      },
    };
    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail(options: IEmailOptions | IEmailOptions[]) {
    try {
      const emails = Array.isArray(options) ? options : [options];

      const emailPromises = emails.map(async (email) => {
        const mailOptions = {
          from: `${BrandInfo.name} <${MAIL_CONFIG.user}>`,
          to: email.receiver,
          subject: email.subject,
          html: email.html,
        };

        return this.transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error("Error sending email: ", err.message);
            return { status: "error", message: err.message };
          } else {
            console.log(`Email sent ${info.response}.`);
            return { status: "ok", message: info.response };
          }
        });
      });

      await Promise.all(emailPromises);
    } catch (err) {
      console.error("Email sending failed:", err);
    }
  }
}

const emailService = new EmailService();

export default emailService;

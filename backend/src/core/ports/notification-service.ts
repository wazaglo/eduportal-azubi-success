export interface SendEmailInput {
  to: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  source?: string;
}

export interface SendAlertInput {
  message: string;
  subject: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationService {
  sendEmail(input: SendEmailInput): Promise<void>;
}

export interface AlertService {
  sendAlert(input: SendAlertInput): Promise<void>;
}

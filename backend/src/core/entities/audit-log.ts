export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.login'
  | 'user.logout'
  | 'conversation.delete'
  | 'admin.user_manage'
  | 'admin.system_config'
  | 'admin.role_change'
  | 'data.export'
  | 'data.import'
  | 'security.password_reset'
  | 'security.email_verify';

export interface AuditLog {
  logId: string;
  action: AuditAction;
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  targetId?: string;
  targetType?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  status: 'success' | 'failure';
  failureReason?: string;
  timestamp: string;
}

export interface CreateAuditLogInput {
  action: AuditAction;
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  targetId?: string;
  targetType?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  status: 'success' | 'failure';
  failureReason?: string;
}

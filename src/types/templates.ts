export type NotificationChannel = "email" | "sms";

export type ModuleType = "incident" | "request" | "complaint" | "query";

export type ActionType = "escalation" | "closure" | "rejection" | "reminder";

export interface NotificationTemplate {
  id: string;
  name: string;
  code: string;

  channel: NotificationChannel;
  module_type: ModuleType;
  action_type: ActionType;

  subject: string;
  body: string;

  subject_ar: string;
  body_ar: string;
  variables: string;

  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export interface NotificationTemplateCreatePayload {
  name: string;
  code: string;

  channel: NotificationChannel;
  module_type: ModuleType;
  action_type: ActionType;
  provider_template_id?: string;

  description?: string;

  variables: string;

  subject_en: string;
  body_en: string;

  subject_ar: string;
  body_ar: string;

  is_active: boolean;
}

export interface NotificationTemplateFilters {
  search?: string;

  channel?: string;
  module_type?: string;
  action_type?: string;
  is_active?: boolean;

  page?: number;
  limit?: number;
}

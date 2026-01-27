-- Create announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  cta_text text,
  cta_url text,
  audience text[] NOT NULL DEFAULT '{}',
  published_at timestamp with time zone DEFAULT now(),
  is_draft boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create announcement_reads table
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Create email_templates table for future use
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_content text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Announcements RLS policies
CREATE POLICY "Super admins can manage all announcements"
  ON public.announcements FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view published announcements for their audience"
  ON public.announcements FOR SELECT
  USING (
    NOT is_draft AND published_at <= now() AND (
      (has_role(auth.uid(), 'country_partner') AND 'country_partner' = ANY(audience)) OR
      (has_role(auth.uid(), 'agency_admin') AND 'agency' = ANY(audience)) OR
      (has_role(auth.uid(), 'sub_account_user') AND 'subaccount' = ANY(audience))
    )
  );

-- Announcement reads RLS policies
CREATE POLICY "Users can view their own read status"
  ON public.announcement_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark announcements as read"
  ON public.announcement_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own read status"
  ON public.announcement_reads FOR DELETE
  USING (user_id = auth.uid());

-- Email templates RLS policies
CREATE POLICY "Super admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Insert default announcement email template (inactive)
INSERT INTO public.email_templates (name, subject, html_content, is_active)
VALUES (
  'announcement_notification',
  '{{title}} - New Announcement',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📢 {{title}}</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    {{#if image_url}}
    <img src="{{image_url}}" alt="Announcement" style="width: 100%; border-radius: 8px; margin-bottom: 20px;">
    {{/if}}
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{recipient_name}},</p>
    <div style="font-size: 16px; margin-bottom: 24px;">{{description}}</div>
    {{#if cta_url}}
    <a href="{{cta_url}}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">{{cta_text}}</a>
    {{/if}}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #6b7280; font-size: 14px;">This email was sent from PSEO Builder. If you have any questions, please contact support.</p>
  </div>
</body>
</html>',
  false
);

-- Create updated_at trigger for announcements
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for email_templates
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
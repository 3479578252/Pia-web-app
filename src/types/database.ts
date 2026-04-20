export type UserRole = "privacy_officer" | "project_manager" | "team_member";
export type AssessmentStatus = "draft" | "in_review" | "approved" | "archived";
export type ThresholdResult = "full_pia_required" | "pia_recommended" | "not_required" | "pending";
export type RiskLikelihood =
  | "rare"
  | "unlikely"
  | "possible"
  | "likely"
  | "almost_certain";
export type RiskConsequence =
  | "insignificant"
  | "minor"
  | "moderate"
  | "major"
  | "catastrophic";
export type RiskStatus = "identified" | "mitigating" | "accepted" | "resolved";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type NotificationType =
  | "assessment_assigned"
  | "assessment_status_changed"
  | "comment_added"
  | "review_requested"
  | "invite_received"
  | "reminder_incomplete";
export type ComplianceStatus =
  | "compliant"
  | "partially_compliant"
  | "non_compliant"
  | "not_applicable"
  | "not_assessed";
export type DataFlowEditorPreference = "form" | "visual";

export type CommentSection =
  | "general"
  | "threshold"
  | "data_flow"
  | "app_analysis"
  | "risks";

export type AuditAction =
  | "status_changed"
  | "comment_added"
  | "comment_deleted"
  | "comment_purged"
  | "collaborator_added"
  | "collaborator_removed";

export type AuditDetails =
  | { from: AssessmentStatus; to: AssessmentStatus }
  | { comment_id: string; section: CommentSection }
  | { comment_id: string }
  | { user_id: string };

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole | null;
  onboarding_complete: boolean;
  data_flow_preference: DataFlowEditorPreference;
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: string;
  email: string | null;
  code: string | null;
  role: UserRole;
  status: InviteStatus;
  invited_by: string;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string | null;
  project_name: string | null;
  project_description: string | null;
  status: AssessmentStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentCollaborator {
  assessment_id: string;
  user_id: string;
  added_by: string | null;
  created_at: string;
}

export interface ThresholdCheck {
  id: string;
  assessment_id: string;
  responses: Record<string, unknown>;
  result: ThresholdResult;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataFlow {
  id: string;
  assessment_id: string;
  description: string | null;
  personal_info_types: string[];
  collection_method: string | null;
  storage_location: string | null;
  access_controls: string | null;
  third_parties: string[];
  retention_period: string | null;
  disposal_method: string | null;
  visual_data: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AppAnalysis {
  id: string;
  assessment_id: string;
  app_number: number;
  compliance_status: ComplianceStatus;
  responses: Record<string, unknown>;
  findings: string | null;
  recommendations: string | null;
  ai_suggestions: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  id: string;
  assessment_id: string;
  description: string;
  category: string | null;
  likelihood: RiskLikelihood;
  consequence: RiskConsequence;
  risk_score: number;
  mitigation: string | null;
  residual_likelihood: RiskLikelihood | null;
  residual_consequence: RiskConsequence | null;
  status: RiskStatus;
  ai_suggested: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  assessment_id: string;
  user_id: string;
  body: string;
  section: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  assessment_id: string | null;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  assessment_id: string | null;
  read: boolean;
  created_at: string;
}

// Supabase Database type definition
// Matches the format expected by @supabase/supabase-js
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Omit<Profile, "id">> & Pick<Profile, "id" | "email">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      invites: {
        Row: Invite;
        Insert: Partial<Invite> &
          Pick<Invite, "role" | "status" | "invited_by" | "expires_at">;
        Update: Partial<Invite>;
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: Assessment;
        Insert: Partial<Assessment> &
          Pick<Assessment, "title" | "created_by">;
        Update: Partial<Assessment>;
        Relationships: [
          {
            foreignKeyName: "assessments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_collaborators: {
        Row: AssessmentCollaborator;
        Insert: Pick<AssessmentCollaborator, "assessment_id" | "user_id"> &
          Partial<Pick<AssessmentCollaborator, "added_by" | "created_at">>;
        Update: Partial<AssessmentCollaborator>;
        Relationships: [
          {
            foreignKeyName: "assessment_collaborators_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_collaborators_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_collaborators_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      threshold_checks: {
        Row: ThresholdCheck;
        Insert: Partial<ThresholdCheck> &
          Pick<ThresholdCheck, "assessment_id">;
        Update: Partial<ThresholdCheck>;
        Relationships: [
          {
            foreignKeyName: "threshold_checks_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: true;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      data_flows: {
        Row: DataFlow;
        Insert: Partial<DataFlow> & Pick<DataFlow, "assessment_id">;
        Update: Partial<DataFlow>;
        Relationships: [
          {
            foreignKeyName: "data_flows_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      app_analyses: {
        Row: AppAnalysis;
        Insert: Partial<AppAnalysis> &
          Pick<AppAnalysis, "assessment_id" | "app_number">;
        Update: Partial<AppAnalysis>;
        Relationships: [
          {
            foreignKeyName: "app_analyses_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      risks: {
        Row: Risk;
        Insert: Partial<Risk> &
          Pick<Risk, "assessment_id" | "description">;
        Update: Partial<Risk>;
        Relationships: [
          {
            foreignKeyName: "risks_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: Comment;
        Insert: Partial<Comment> &
          Pick<Comment, "assessment_id" | "user_id" | "body">;
        Update: Partial<Comment>;
        Relationships: [
          {
            foreignKeyName: "comments_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: AuditLogEntry;
        Insert: Partial<AuditLogEntry> &
          Pick<AuditLogEntry, "user_id" | "action">;
        Update: Partial<AuditLogEntry>;
        Relationships: [
          {
            foreignKeyName: "audit_log_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> &
          Pick<Notification, "user_id" | "type" | "title">;
        Update: Partial<Notification>;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      assessment_status: AssessmentStatus;
      threshold_result: ThresholdResult;
      risk_likelihood: RiskLikelihood;
      risk_consequence: RiskConsequence;
      risk_status: RiskStatus;
      invite_status: InviteStatus;
      notification_type: NotificationType;
      compliance_status: ComplianceStatus;
      data_flow_editor_preference: DataFlowEditorPreference;
    };
    CompositeTypes: Record<string, never>;
  };
}

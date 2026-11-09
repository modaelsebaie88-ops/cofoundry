
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categories": {
                  Row: {
                    "created_at": string,"description": string | null,"icon": string,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"post_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"id"?: string,"post_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"post_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"communities": {
                  Row: {
                    "category_id": number | null,"created_at": string,"created_by": string | null,"description": string | null,"icon": string,"id": string,"member_count": number,"name": string,"post_count": number,"rules": string | null,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"icon"?: string,"id"?: string,"member_count"?: number,"name": string,"post_count"?: number,"rules"?: string | null,"slug": string
                  }
                  Update: {
                    "category_id"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"icon"?: string,"id"?: string,"member_count"?: number,"name"?: string,"post_count"?: number,"rules"?: string | null,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "communities_category_id_fkey"
      columns: ["category_id"]
isOneToOne: true
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"community_members": {
                  Row: {
                    "community_id": string,"joined_at": string,"profile_id": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id": string,"joined_at"?: string,"profile_id": string,"role"?: string
                  }
                  Update: {
                    "community_id"?: string,"joined_at"?: string,"profile_id"?: string,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_members_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"community_messages": {
                  Row: {
                    "attachment_mime": string | null,"attachment_name": string | null,"attachment_path": string | null,"body": string,"community_id": string,"created_at": string,"id": string,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_mime"?: string | null,"attachment_name"?: string | null,"attachment_path"?: string | null,"body"?: string,"community_id": string,"created_at"?: string,"id"?: string,"sender_id": string
                  }
                  Update: {
                    "attachment_mime"?: string | null,"attachment_name"?: string | null,"attachment_path"?: string | null,"body"?: string,"community_id"?: string,"created_at"?: string,"id"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_messages_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"community_posts": {
                  Row: {
                    "accepted_comment_id": string | null,"author_id": string,"body": string,"comment_count": number,"community_id": string,"created_at": string,"id": string,"is_pinned": boolean,"reaction_count": number,"title": string,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_comment_id"?: string | null,"author_id": string,"body"?: string,"comment_count"?: number,"community_id": string,"created_at"?: string,"id"?: string,"is_pinned"?: boolean,"reaction_count"?: number,"title": string,"type"?: string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_comment_id"?: string | null,"author_id"?: string,"body"?: string,"comment_count"?: number,"community_id"?: string,"created_at"?: string,"id"?: string,"is_pinned"?: boolean,"reaction_count"?: number,"title"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_posts_accepted_comment_fk"
      columns: ["accepted_comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_posts_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    }
                  ]
                },"connections": {
                  Row: {
                    "addressee_id": string,"created_at": string,"id": string,"message": string | null,"requester_id": string,"responded_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addressee_id": string,"created_at"?: string,"id"?: string,"message"?: string | null,"requester_id": string,"responded_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "addressee_id"?: string,"created_at"?: string,"id"?: string,"message"?: string | null,"requester_id"?: string,"responded_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "connections_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_participants": {
                  Row: {
                    "conversation_id": string,"joined_at": string,"last_read_at": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"joined_at"?: string,"last_read_at"?: string,"profile_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"joined_at"?: string,"last_read_at"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_participants_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_participants_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "created_at": string,"created_by": string | null,"dm_key": string | null,"id": string,"is_group": boolean,"last_message_at": string | null,"last_message_preview": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"dm_key"?: string | null,"id"?: string,"is_group"?: boolean,"last_message_at"?: string | null,"last_message_preview"?: string | null,"title"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"dm_key"?: string | null,"id"?: string,"is_group"?: boolean,"last_message_at"?: string | null,"last_message_preview"?: string | null,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"endorsements": {
                  Row: {
                    "body": string,"created_at": string,"endorsee_id": string,"endorser_id": string,"id": string,"skill": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"endorsee_id": string,"endorser_id": string,"id"?: string,"skill"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"endorsee_id"?: string,"endorser_id"?: string,"id"?: string,"skill"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "endorsements_endorsee_id_fkey"
      columns: ["endorsee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "endorsements_endorser_id_fkey"
      columns: ["endorser_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"event_registrations": {
                  Row: {
                    "attended": boolean,"created_at": string,"event_id": string,"profile_id": string,"reminder_sent": boolean,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attended"?: boolean,"created_at"?: string,"event_id": string,"profile_id": string,"reminder_sent"?: boolean,"status"?: string
                  }
                  Update: {
                    "attended"?: boolean,"created_at"?: string,"event_id"?: string,"profile_id"?: string,"reminder_sent"?: boolean,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_registrations_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_registrations_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "capacity": number | null,"community_id": string | null,"cover_url": string | null,"created_at": string,"description": string,"ends_at": string,"id": string,"is_online": boolean,"location": string | null,"meeting_url": string | null,"organizer_id": string,"registration_count": number,"starts_at": string,"title": string,"type": Database["public"]['Enums']["event_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity"?: number | null,"community_id"?: string | null,"cover_url"?: string | null,"created_at"?: string,"description": string,"ends_at": string,"id"?: string,"is_online"?: boolean,"location"?: string | null,"meeting_url"?: string | null,"organizer_id": string,"registration_count"?: number,"starts_at": string,"title": string,"type": Database["public"]['Enums']["event_type"]
                  }
                  Update: {
                    "capacity"?: number | null,"community_id"?: string | null,"cover_url"?: string | null,"created_at"?: string,"description"?: string,"ends_at"?: string,"id"?: string,"is_online"?: boolean,"location"?: string | null,"meeting_url"?: string | null,"organizer_id"?: string,"registration_count"?: number,"starts_at"?: string,"title"?: string,"type"?: Database["public"]['Enums']["event_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"mentor_profiles": {
                  Row: {
                    "about": string,"availability_note": string | null,"created_at": string,"expertise": (string)[],"focus_stages": (Database["public"]['Enums']["startup_stage"])[],"is_accepting": boolean,"profile_id": string,"rating_avg": number | null,"review_count": number,"session_minutes": number,"sessions_per_month": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "about": string,"availability_note"?: string | null,"created_at"?: string,"expertise": (string)[],"focus_stages"?: (Database["public"]['Enums']["startup_stage"])[],"is_accepting"?: boolean,"profile_id": string,"rating_avg"?: number | null,"review_count"?: number,"session_minutes"?: number,"sessions_per_month"?: number,"updated_at"?: string
                  }
                  Update: {
                    "about"?: string,"availability_note"?: string | null,"created_at"?: string,"expertise"?: (string)[],"focus_stages"?: (Database["public"]['Enums']["startup_stage"])[],"is_accepting"?: boolean,"profile_id"?: string,"rating_avg"?: number | null,"review_count"?: number,"session_minutes"?: number,"sessions_per_month"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentor_profiles_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"mentorship_requests": {
                  Row: {
                    "created_at": string,"id": string,"meeting_url": string | null,"mentee_id": string,"mentor_id": string,"mentor_note": string | null,"message": string,"preferred_times": (string)[],"responded_at": string | null,"scheduled_at": string | null,"status": string,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"meeting_url"?: string | null,"mentee_id": string,"mentor_id": string,"mentor_note"?: string | null,"message": string,"preferred_times"?: (string)[],"responded_at"?: string | null,"scheduled_at"?: string | null,"status"?: string,"topic": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"meeting_url"?: string | null,"mentee_id"?: string,"mentor_id"?: string,"mentor_note"?: string | null,"message"?: string,"preferred_times"?: (string)[],"responded_at"?: string | null,"scheduled_at"?: string | null,"status"?: string,"topic"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentorship_requests_mentee_id_fkey"
      columns: ["mentee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentorship_requests_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "mentor_profiles"
      referencedColumns: ["profile_id"]
    },{
      foreignKeyName: "mentorship_requests_mentor_profile_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"mentorship_reviews": {
                  Row: {
                    "comment": string | null,"created_at": string,"id": string,"mentor_id": string,"rating": number,"request_id": string,"reviewer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"mentor_id": string,"rating": number,"request_id": string,"reviewer_id": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"mentor_id"?: string,"rating"?: number,"request_id"?: string,"reviewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mentorship_reviews_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "mentor_profiles"
      referencedColumns: ["profile_id"]
    },{
      foreignKeyName: "mentorship_reviews_mentor_profile_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentorship_reviews_request_id_fkey"
      columns: ["request_id"]
isOneToOne: true
      referencedRelation: "mentorship_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mentorship_reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "attachment_mime": string | null,"attachment_name": string | null,"attachment_path": string | null,"attachment_size": number | null,"body": string,"conversation_id": string,"created_at": string,"id": string,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_mime"?: string | null,"attachment_name"?: string | null,"attachment_path"?: string | null,"attachment_size"?: number | null,"body"?: string,"conversation_id": string,"created_at"?: string,"id"?: string,"sender_id": string
                  }
                  Update: {
                    "attachment_mime"?: string | null,"attachment_name"?: string | null,"attachment_path"?: string | null,"attachment_size"?: number | null,"body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "prefs": NonNullable<Json>,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "prefs"?: NonNullable<Json>,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "prefs"?: NonNullable<Json>,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"body": string | null,"created_at": string,"id": string,"is_read": boolean,"link": string | null,"recipient_id": string,"title": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body"?: string | null,"created_at"?: string,"id"?: string,"is_read"?: boolean,"link"?: string | null,"recipient_id": string,"title": string,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string | null,"created_at"?: string,"id"?: string,"is_read"?: boolean,"link"?: string | null,"recipient_id"?: string,"title"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunities": {
                  Row: {
                    "application_count": number,"author_id": string,"category_id": number | null,"collaboration_type": Database["public"]['Enums']["collab_type"],"created_at": string,"description": string,"id": string,"is_remote": boolean,"location": string | null,"required_skills": (string)[],"requirements": string | null,"stage": Database["public"]['Enums']["startup_stage"] | null,"startup_id": string | null,"status": string,"title": string,"type": Database["public"]['Enums']["opportunity_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_count"?: number,"author_id": string,"category_id"?: number | null,"collaboration_type": Database["public"]['Enums']["collab_type"],"created_at"?: string,"description": string,"id"?: string,"is_remote"?: boolean,"location"?: string | null,"required_skills"?: (string)[],"requirements"?: string | null,"stage"?: Database["public"]['Enums']["startup_stage"] | null,"startup_id"?: string | null,"status"?: string,"title": string,"type": Database["public"]['Enums']["opportunity_type"],"updated_at"?: string
                  }
                  Update: {
                    "application_count"?: number,"author_id"?: string,"category_id"?: number | null,"collaboration_type"?: Database["public"]['Enums']["collab_type"],"created_at"?: string,"description"?: string,"id"?: string,"is_remote"?: boolean,"location"?: string | null,"required_skills"?: (string)[],"requirements"?: string | null,"stage"?: Database["public"]['Enums']["startup_stage"] | null,"startup_id"?: string | null,"status"?: string,"title"?: string,"type"?: Database["public"]['Enums']["opportunity_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunities_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_startup_id_fkey"
      columns: ["startup_id"]
isOneToOne: false
      referencedRelation: "startups"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_applications": {
                  Row: {
                    "applicant_id": string,"created_at": string,"id": string,"message": string,"opportunity_id": string,"responded_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applicant_id": string,"created_at"?: string,"id"?: string,"message": string,"opportunity_id": string,"responded_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "applicant_id"?: string,"created_at"?: string,"id"?: string,"message"?: string,"opportunity_id"?: string,"responded_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_applications_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_applications_opportunity_id_fkey"
      columns: ["opportunity_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"poll_options": {
                  Row: {
                    "id": string,"label": string,"position": number,"post_id": string,"vote_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"label": string,"position"?: number,"post_id": string,"vote_count"?: number
                  }
                  Update: {
                    "id"?: string,"label"?: string,"position"?: number,"post_id"?: string,"vote_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "poll_options_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"poll_votes": {
                  Row: {
                    "created_at": string,"option_id": string,"post_id": string,"voter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"option_id": string,"post_id": string,"voter_id": string
                  }
                  Update: {
                    "created_at"?: string,"option_id"?: string,"post_id"?: string,"voter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "poll_votes_option_id_fkey"
      columns: ["option_id"]
isOneToOne: false
      referencedRelation: "poll_options"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "poll_votes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "poll_votes_voter_id_fkey"
      columns: ["voter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_reactions": {
                  Row: {
                    "created_at": string,"post_id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"profile_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_reactions_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_reactions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_interests": {
                  Row: {
                    "category_id": number,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": number,"profile_id": string
                  }
                  Update: {
                    "category_id"?: number,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_interests_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_interests_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_skills": {
                  Row: {
                    "created_at": string,"kind": string,"profile_id": string,"skill_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"kind"?: string,"profile_id": string,"skill_id": number
                  }
                  Update: {
                    "created_at"?: string,"kind"?: string,"profile_id"?: string,"skill_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_skills_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability"] | null,"avatar_url": string | null,"bio": string | null,"city": string | null,"collaboration_types": (Database["public"]['Enums']["collab_type"])[],"country": string | null,"created_at": string,"founder_role": string | null,"full_name": string,"headline": string | null,"help_topics": (string)[],"id": string,"is_demo": boolean,"is_suspended": boolean,"is_verified": boolean,"last_seen_at": string | null,"linkedin_url": string | null,"looking_for": (Database["public"]['Enums']["capability"])[],"offers": (Database["public"]['Enums']["capability"])[],"onboarding_completed": boolean,"open_to_partnerships": boolean,"previous_experience": string | null,"role": Database["public"]['Enums']["app_role"],"seeking_cofounder": boolean,"updated_at": string,"website_url": string | null,"years_experience": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability"] | null,"avatar_url"?: string | null,"bio"?: string | null,"city"?: string | null,"collaboration_types"?: (Database["public"]['Enums']["collab_type"])[],"country"?: string | null,"created_at"?: string,"founder_role"?: string | null,"full_name"?: string,"headline"?: string | null,"help_topics"?: (string)[],"id": string,"is_demo"?: boolean,"is_suspended"?: boolean,"is_verified"?: boolean,"last_seen_at"?: string | null,"linkedin_url"?: string | null,"looking_for"?: (Database["public"]['Enums']["capability"])[],"offers"?: (Database["public"]['Enums']["capability"])[],"onboarding_completed"?: boolean,"open_to_partnerships"?: boolean,"previous_experience"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"seeking_cofounder"?: boolean,"updated_at"?: string,"website_url"?: string | null,"years_experience"?: number | null
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability"] | null,"avatar_url"?: string | null,"bio"?: string | null,"city"?: string | null,"collaboration_types"?: (Database["public"]['Enums']["collab_type"])[],"country"?: string | null,"created_at"?: string,"founder_role"?: string | null,"full_name"?: string,"headline"?: string | null,"help_topics"?: (string)[],"id"?: string,"is_demo"?: boolean,"is_suspended"?: boolean,"is_verified"?: boolean,"last_seen_at"?: string | null,"linkedin_url"?: string | null,"looking_for"?: (Database["public"]['Enums']["capability"])[],"offers"?: (Database["public"]['Enums']["capability"])[],"onboarding_completed"?: boolean,"open_to_partnerships"?: boolean,"previous_experience"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"seeking_cofounder"?: boolean,"updated_at"?: string,"website_url"?: string | null,"years_experience"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"recommendations": {
                  Row: {
                    "computed_at": string,"profile_id": string,"reasons": NonNullable<Json>,"score": number,"status": string,"target_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "computed_at"?: string,"profile_id": string,"reasons"?: NonNullable<Json>,"score": number,"status"?: string,"target_id": string
                  }
                  Update: {
                    "computed_at"?: string,"profile_id"?: string,"reasons"?: NonNullable<Json>,"score"?: number,"status"?: string,"target_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recommendations_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recommendations_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "community_id": string | null,"created_at": string,"details": string | null,"id": string,"reason": string,"reporter_id": string,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"snapshot": string | null,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id"?: string | null,"created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reporter_id": string,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"snapshot"?: string | null,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "community_id"?: string | null,"created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"snapshot"?: string | null,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"resources": {
                  Row: {
                    "author_id": string | null,"body": string | null,"category": Database["public"]['Enums']["resource_category"],"created_at": string,"external_url": string | null,"id": string,"is_featured": boolean,"is_published": boolean,"kind": string,"read_minutes": number | null,"slug": string,"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string | null,"category": Database["public"]['Enums']["resource_category"],"created_at"?: string,"external_url"?: string | null,"id"?: string,"is_featured"?: boolean,"is_published"?: boolean,"kind"?: string,"read_minutes"?: number | null,"slug": string,"summary": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string | null,"category"?: Database["public"]['Enums']["resource_category"],"created_at"?: string,"external_url"?: string | null,"id"?: string,"is_featured"?: boolean,"is_published"?: boolean,"kind"?: string,"read_minutes"?: number | null,"slug"?: string,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "resources_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_items": {
                  Row: {
                    "created_at": string,"item_id": string,"item_type": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"item_id": string,"item_type": string,"profile_id": string
                  }
                  Update: {
                    "created_at"?: string,"item_id"?: string,"item_type"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_items_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"skill_exchanges": {
                  Row: {
                    "author_id": string,"created_at": string,"description": string | null,"format": string,"id": string,"offer_skills": (string)[],"status": string,"title": string,"want_skills": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"created_at"?: string,"description"?: string | null,"format"?: string,"id"?: string,"offer_skills": (string)[],"status"?: string,"title": string,"want_skills": (string)[]
                  }
                  Update: {
                    "author_id"?: string,"created_at"?: string,"description"?: string | null,"format"?: string,"id"?: string,"offer_skills"?: (string)[],"status"?: string,"title"?: string,"want_skills"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "skill_exchanges_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"skills": {
                  Row: {
                    "capability": Database["public"]['Enums']["capability"] | null,"created_at": string,"id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capability"?: Database["public"]['Enums']["capability"] | null,"created_at"?: string,"id"?: never,"name": string
                  }
                  Update: {
                    "capability"?: Database["public"]['Enums']["capability"] | null,"created_at"?: string,"id"?: never,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"startup_members": {
                  Row: {
                    "is_founder": boolean,"joined_at": string,"profile_id": string,"startup_id": string,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "is_founder"?: boolean,"joined_at"?: string,"profile_id": string,"startup_id": string,"title"?: string | null
                  }
                  Update: {
                    "is_founder"?: boolean,"joined_at"?: string,"profile_id"?: string,"startup_id"?: string,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "startup_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "startup_members_startup_id_fkey"
      columns: ["startup_id"]
isOneToOne: false
      referencedRelation: "startups"
      referencedColumns: ["id"]
    }
                  ]
                },"startup_milestones": {
                  Row: {
                    "achieved_on": string | null,"created_at": string,"description": string | null,"id": string,"startup_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achieved_on"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"startup_id": string,"title": string
                  }
                  Update: {
                    "achieved_on"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"startup_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "startup_milestones_startup_id_fkey"
      columns: ["startup_id"]
isOneToOne: false
      referencedRelation: "startups"
      referencedColumns: ["id"]
    }
                  ]
                },"startups": {
                  Row: {
                    "business_model": string | null,"category_id": number | null,"cover_url": string | null,"created_at": string,"current_needs": (Database["public"]['Enums']["capability"])[],"description": string | null,"founded_year": number | null,"id": string,"is_verified": boolean,"linkedin_url": string | null,"location": string | null,"logo_url": string | null,"mission": string | null,"name": string,"owner_id": string,"products": string | null,"slug": string,"stage": Database["public"]['Enums']["startup_stage"],"tagline": string | null,"target_market": string | null,"team_size": number | null,"twitter_url": string | null,"updated_at": string,"vision": string | null,"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_model"?: string | null,"category_id"?: number | null,"cover_url"?: string | null,"created_at"?: string,"current_needs"?: (Database["public"]['Enums']["capability"])[],"description"?: string | null,"founded_year"?: number | null,"id"?: string,"is_verified"?: boolean,"linkedin_url"?: string | null,"location"?: string | null,"logo_url"?: string | null,"mission"?: string | null,"name": string,"owner_id": string,"products"?: string | null,"slug": string,"stage"?: Database["public"]['Enums']["startup_stage"],"tagline"?: string | null,"target_market"?: string | null,"team_size"?: number | null,"twitter_url"?: string | null,"updated_at"?: string,"vision"?: string | null,"website_url"?: string | null
                  }
                  Update: {
                    "business_model"?: string | null,"category_id"?: number | null,"cover_url"?: string | null,"created_at"?: string,"current_needs"?: (Database["public"]['Enums']["capability"])[],"description"?: string | null,"founded_year"?: number | null,"id"?: string,"is_verified"?: boolean,"linkedin_url"?: string | null,"location"?: string | null,"logo_url"?: string | null,"mission"?: string | null,"name"?: string,"owner_id"?: string,"products"?: string | null,"slug"?: string,"stage"?: Database["public"]['Enums']["startup_stage"],"tagline"?: string | null,"target_market"?: string | null,"team_size"?: number | null,"twitter_url"?: string | null,"updated_at"?: string,"vision"?: string | null,"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "startups_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "startups_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"verification_requests": {
                  Row: {
                    "created_at": string,"evidence": string,"id": string,"links": (string)[],"requester_id": string,"review_note": string | null,"reviewed_at": string | null,"reviewer_id": string | null,"startup_id": string | null,"status": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evidence": string,"id"?: string,"links"?: (string)[],"requester_id": string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewer_id"?: string | null,"startup_id"?: string | null,"status"?: string,"target_type": string
                  }
                  Update: {
                    "created_at"?: string,"evidence"?: string,"id"?: string,"links"?: (string)[],"requester_id"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewer_id"?: string | null,"startup_id"?: string | null,"status"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_requests_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_requests_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_requests_startup_id_fkey"
      columns: ["startup_id"]
isOneToOne: false
      referencedRelation: "startups"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_files": {
                  Row: {
                    "created_at": string,"id": string,"mime": string | null,"name": string,"path": string,"size": number | null,"uploaded_by": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"mime"?: string | null,"name": string,"path": string,"size"?: number | null,"uploaded_by": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mime"?: string | null,"name"?: string,"path"?: string,"size"?: number | null,"uploaded_by"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_files_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_files_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "joined_at": string,"profile_id": string,"role": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"profile_id": string,"role"?: string,"workspace_id": string
                  }
                  Update: {
                    "joined_at"?: string,"profile_id"?: string,"role"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_milestones": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"description": string | null,"due_date": string | null,"id": string,"title": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"title": string,"workspace_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"title"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_milestones_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_posts": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"kind": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"id"?: string,"kind"?: string,"workspace_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_posts_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_tasks": {
                  Row: {
                    "assignee_id": string | null,"created_at": string,"created_by": string,"description": string | null,"due_date": string | null,"id": string,"status": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"created_at"?: string,"created_by": string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"status"?: string,"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "assignee_id"?: string | null,"created_at"?: string,"created_by"?: string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"status"?: string,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_tasks_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_tasks_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string | null,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"description"?: string | null,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_list_users":
{ Args: { "lim"?: number,"off"?: number,"q"?: string }; Returns: {
              "avatar_url": string,"created_at": string,"email": string,"full_name": string,"id": string,"is_demo": boolean,"is_suspended": boolean,"is_verified": boolean,"last_seen_at": string,"onboarding_completed": boolean,"role": Database["public"]['Enums']["app_role"],"startup_name": string,"total": number
            }[]
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"are_connected":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"create_group_conversation":
{ Args: { "group_title": string,"member_ids": (string)[] }; Returns: string
                           },
"current_role_is":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"display_name":
{ Args: { "pid": string }; Returns: string
                           },
"extract_mentions":
{ Args: { "body": string }; Returns: (string)[]
                           },
"get_event_meeting_url":
{ Args: { "eid": string }; Returns: string
                           },
"get_my_conversations":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"is_group": boolean,"last_message_at": string,"last_message_preview": string,"participants": Json,"title": string,"unread_count": number
            }[]
                           },
"get_or_create_dm":
{ Args: { "other_id": string }; Returns: string
                           },
"get_reputation":
{ Args: { "pid": string }; Returns: Json
                           },
"guard_bypassed":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_community_member":
{ Args: { "cid": string }; Returns: boolean
                           },
"is_community_moderator":
{ Args: { "cid": string }; Returns: boolean
                           },
"is_conversation_member":
{ Args: { "cid": string }; Returns: boolean
                           },
"is_event_organizer":
{ Args: { "eid": string }; Returns: boolean
                           },
"is_opportunity_author":
{ Args: { "oid": string }; Returns: boolean
                           },
"is_startup_owner":
{ Args: { "sid": string }; Returns: boolean
                           },
"is_workspace_member":
{ Args: { "wid": string }; Returns: boolean
                           },
"is_workspace_owner":
{ Args: { "wid": string }; Returns: boolean
                           },
"notify":
{ Args: { "p_actor": string,"p_body"?: string,"p_link"?: string,"p_recipient": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"send_event_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"setting_enabled":
{ Args: { "k": string }; Returns: boolean
                           },
"touch_last_seen":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"unread_message_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "app_role": "founder"|"mentor"|"moderator"|"admin","availability": "full_time"|"part_time"|"weekends"|"few_hours_week"|"limited","capability": "engineering"|"design"|"marketing"|"sales"|"product"|"data_ai"|"fundraising"|"investment"|"mentorship"|"legal"|"operations"|"business_development"|"content"|"community","collab_type": "cofounder"|"full_time"|"part_time"|"freelance"|"advisory"|"partnership"|"skill_exchange"|"investment","event_type": "networking"|"hackathon"|"pitch"|"webinar"|"workshop"|"meetup"|"accelerator","opportunity_type": "cofounder"|"developer"|"designer"|"marketing"|"business_partner"|"mentor"|"investor"|"team_member"|"services_offered"|"partnership","resource_category": "guides"|"templates"|"pitch_decks"|"fundraising"|"marketing"|"legal_ops"|"tools"|"success_stories","startup_stage": "idea"|"mvp"|"early_traction"|"growth"|"established"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["founder", "mentor", "moderator", "admin"],"availability": ["full_time", "part_time", "weekends", "few_hours_week", "limited"],"capability": ["engineering", "design", "marketing", "sales", "product", "data_ai", "fundraising", "investment", "mentorship", "legal", "operations", "business_development", "content", "community"],"collab_type": ["cofounder", "full_time", "part_time", "freelance", "advisory", "partnership", "skill_exchange", "investment"],"event_type": ["networking", "hackathon", "pitch", "webinar", "workshop", "meetup", "accelerator"],"opportunity_type": ["cofounder", "developer", "designer", "marketing", "business_partner", "mentor", "investor", "team_member", "services_offered", "partnership"],"resource_category": ["guides", "templates", "pitch_decks", "fundraising", "marketing", "legal_ops", "tools", "success_stories"],"startup_stage": ["idea", "mvp", "early_traction", "growth", "established"]
          }
        }
} as const

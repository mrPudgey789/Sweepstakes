export type SweepstakeMode = 'random' | 'pick_your_own'
export type WinnerStructure = 'single' | 'top_three'
export type SweepstakeStatus = 'draft' | 'open' | 'drawn' | 'closed'
export type PaymentState = 'unpaid' | 'marked_paid' | 'confirmed'
export type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'finished'
export type TeamStatus = 'active' | 'eliminated'
export type ResultSource = 'feed' | 'manual_override'
export type StripePaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'
export type NotificationType = 'join_confirmation' | 'payment_confirmed' | 'knockout' | 'standings_update'
export type NotificationStatus = 'queued' | 'sent' | 'failed'
export type PricingBand = '1_10' | '11_50' | '50_plus'

export interface Database {
  public: {
    Tables: {
      organisers: {
        Row: {
          id: string
          email: string
          auth_id: string
          display_name: string | null
          paypal_link: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['organisers']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['organisers']['Insert']>
      }
      players: {
        Row: {
          id: string
          email: string
          auth_id: string | null
          display_name: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['players']['Insert']>
      }
      tournaments: {
        Row: {
          id: string
          name: string
          external_competition_ref: string | null
          starts_at: string
          ends_at: string
        }
        Insert: Omit<Database['public']['Tables']['tournaments']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['tournaments']['Insert']>
      }
      teams: {
        Row: {
          id: string
          tournament_id: string
          name: string
          code: string
          group_letter: string
          crest_url: string | null
          status: TeamStatus
          eliminated_at: string | null
          external_ref: string | null
        }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'status'> & {
          id?: string
          status?: TeamStatus
        }
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }
      sweepstakes: {
        Row: {
          id: string
          organiser_id: string
          tournament_id: string
          name: string
          mode: SweepstakeMode
          entry_amount: number
          currency: string
          winner_structure: WinnerStructure
          paypal_link: string
          join_code: string
          share_slug: string
          status: SweepstakeStatus
          max_players: number | null
          created_at: string
          drawn_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['sweepstakes']['Row'], 'id' | 'created_at' | 'status' | 'join_code' | 'share_slug'> & {
          id?: string
          created_at?: string
          status?: SweepstakeStatus
          join_code?: string
          share_slug?: string
        }
        Update: Partial<Database['public']['Tables']['sweepstakes']['Insert']>
      }
      entries: {
        Row: {
          id: string
          sweepstake_id: string
          player_id: string
          team_id: string | null
          payment_state: PaymentState
          marked_paid_at: string | null
          confirmed_at: string | null
          payment_proof_url: string | null
          tc_accepted_at: string
          final_position: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['entries']['Row'], 'id' | 'created_at' | 'payment_state'> & {
          id?: string
          created_at?: string
          payment_state?: PaymentState
        }
        Update: Partial<Database['public']['Tables']['entries']['Insert']>
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          home_team_id: string | null
          away_team_id: string | null
          stage: MatchStage
          kickoff_at: string
          venue: string | null
          status: MatchStatus
          external_ref: string | null
        }
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'status'> & {
          id?: string
          status?: MatchStatus
        }
        Update: Partial<Database['public']['Tables']['matches']['Insert']>
      }
      results: {
        Row: {
          id: string
          match_id: string
          home_score: number
          away_score: number
          winner_team_id: string | null
          source: ResultSource
          overridden_by: string | null
          recorded_at: string
        }
        Insert: Omit<Database['public']['Tables']['results']['Row'], 'id' | 'recorded_at'> & {
          id?: string
          recorded_at?: string
        }
        Update: Partial<Database['public']['Tables']['results']['Insert']>
      }
      standings: {
        Row: {
          id: string
          sweepstake_id: string
          entry_id: string
          rank: number
          team_stage: MatchStage
          is_eliminated: boolean
          computed_at: string
        }
        Insert: Omit<Database['public']['Tables']['standings']['Row'], 'id' | 'computed_at'> & {
          id?: string
          computed_at?: string
        }
        Update: Partial<Database['public']['Tables']['standings']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          entry_id: string
          type: NotificationType
          channel: string
          status: NotificationStatus
          sent_at: string | null
          payload: Record<string, unknown>
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'status' | 'channel'> & {
          id?: string
          status?: NotificationStatus
          channel?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      payments: {
        Row: {
          id: string
          sweepstake_id: string
          organiser_id: string
          stripe_payment_intent_id: string | null
          band: PricingBand
          amount: number
          currency: string
          status: StripePaymentStatus
          paid_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'status'> & {
          id?: string
          status?: StripePaymentStatus
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

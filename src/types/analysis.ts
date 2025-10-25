// Analysis-related types for the Saju Analysis Service

// Gender
export type Gender = 'male' | 'female';

// AI Model type
export type ModelType = 'flash' | 'pro';

// Analysis information (Database type)
export interface Analysis {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  is_lunar: boolean;
  gender: Gender;
  time_zone: string | null;
  additional_info: string | null;
  analysis_result: string;
  model_used: ModelType;
  created_at: string;
}

// Create analysis input
export interface CreateAnalysisInput {
  name: string;
  birth_date: string;
  birth_time?: string;
  is_lunar: boolean;
  gender: Gender;
  time_zone?: string;
  additional_info?: string;
}

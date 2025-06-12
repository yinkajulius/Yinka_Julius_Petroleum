import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://oixrklybagmwriafktrb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peHJrbHliYWdtd3JpYWZrdHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MzMwNzQsImV4cCI6MjA2NDMwOTA3NH0.sn1I56RQ7B66hPI6L2t9FnRk3_wXZS_49Q9M9VADRLw";

type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;

export const createTypedClient = () => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
};

export const supabase = createTypedClient();
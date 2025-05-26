import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'tu-supabase-url';
const supabaseKey = 'tu-anon-key';
export const supabase = createClient(supabaseUrl, supabaseKey);

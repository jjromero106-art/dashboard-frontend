import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tyljtojtvmvzvcadufwv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bGp0b2p0dm12enZjYWR1Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI3NjgyNywiZXhwIjoyMDc3ODUyODI3fQ.Ynz1OYdngOTjfO3WjptAoMTuDe90fyE1hHL5OCzqO5o';

export const supabaseAirBeam = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  auth: {
    storageKey: 'airbeam-auth-token',
    autoRefreshToken: false,
    persistSession: false
  }
});
import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvknylospajtmzlmhmzw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2a255bG9zcGFqdG16bG1obXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTQ1ODAsImV4cCI6MjA4NjY3MDU4MH0.6PaI12eiQrPUL8H6Ocl-AwkTQsbctEnu_bHmrsrr-wI'

// Fix common URL typo where extra chars appear before https://
if (supabaseUrl && !supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://')) {
  const httpsIndex = supabaseUrl.indexOf('https://')
  if (httpsIndex > 0) {
    supabaseUrl = supabaseUrl.slice(httpsIndex)
  }
}

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
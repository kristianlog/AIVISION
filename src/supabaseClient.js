import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xvknylospajtmzlmhmzw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2a255bG9zcGFqdG16bG1obXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTQ1ODAsImV4cCI6MjA4NjY3MDU4MH0.6PaI12eiQrPUL8H6Ocl-AwkTQsbctEnu_bHmrsrr-wI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
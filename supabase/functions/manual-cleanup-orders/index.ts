import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Prüfe ob es ein POST Request ist
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Führe die Datenbankfunktion aus
    const { data, error } = await supabase.rpc('auto_delete_old_orders')

    if (error) {
      console.error('Error executing cleanup:', error)
      return new Response(JSON.stringify({ 
        error: error.message,
        details: 'Failed to execute cleanup function'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Hole die letzten Audit-Logs
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'auto_delete_orders')
      .order('created_at', { ascending: false })
      .limit(5)

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Cleanup executed successfully',
      data: data,
      recentLogs: logsError ? [] : logs
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}) 
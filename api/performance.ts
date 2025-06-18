export default async function handler(request: Request) {
  try {
    const { url, duration, timestamp } = await request.json()
    
    // Hier können Sie die Performance-Daten speichern
    // z.B. mit Supabase:
    // const { data, error } = await supabase
    //   .from('performance_metrics')
    //   .insert([{ url, duration, timestamp }])
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Performance tracking failed:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

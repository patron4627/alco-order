export default async function handler(request: Request) {
  try {
    const { error, timestamp, type } = await request.json()
    
    // Hier können Sie die Fehler in Ihrer Datenbank speichern
    // z.B. mit Supabase:
    // const { data, error } = await supabase
    //   .from('errors')
    //   .insert([{ error, timestamp, type }])
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error tracking failed:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export default async function handler(request: Request) {
  try {
    const { subscription } = await request.json()
    
    // Hier speichern Sie die Subscription in Ihrer Datenbank
    // z.B. mit Supabase:
    // const { data, error } = await supabase
    //   .from('push_subscriptions')
    //   .insert([subscription])
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

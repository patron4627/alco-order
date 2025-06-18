export default async function handler(request: Request) {
  try {
    // Hier können Sie zusätzliche Hintergrundoperationen durchführen
    // z.B. Datenbank-Verbindung prüfen, Cache aktualisieren, etc.
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Keep-alive error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

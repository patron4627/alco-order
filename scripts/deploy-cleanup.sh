#!/bin/bash

# Deploy Script für automatisches Cleanup-System
# Führt die Migrationen aus und deployt die Edge Functions

echo "🚀 Deploying automatic cleanup system..."

# Prüfe ob Supabase CLI installiert ist
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI ist nicht installiert. Bitte installiere es zuerst:"
    echo "npm install -g supabase"
    exit 1
fi

# Prüfe ob wir in einem Supabase Projekt sind
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Keine Supabase Konfiguration gefunden. Bitte führe 'supabase init' aus."
    exit 1
fi

echo "📦 Deploying database migrations..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migrations deployed successfully"
else
    echo "❌ Database migration failed"
    exit 1
fi

echo "🔧 Deploying Edge Functions..."
supabase functions deploy manual-cleanup-orders

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Edge Function deployment failed"
    exit 1
fi

echo ""
echo "🎉 Cleanup system deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check if pg_cron extension is enabled in Supabase Dashboard"
echo "2. Test the manual cleanup function:"
echo "   curl -X POST https://your-project.supabase.co/functions/v1/manual-cleanup-orders"
echo "3. Monitor the audit logs in the database"
echo ""
echo "📖 For more information, see: supabase/README_AUTO_CLEANUP.md" 
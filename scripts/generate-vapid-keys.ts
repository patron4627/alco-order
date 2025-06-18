import { generateVAPIDKeys } from 'web-push';

async function generateKeys() {
  try {
    const keys = await generateVAPIDKeys();
    console.log('Public Key:', keys.publicKey);
    console.log('Private Key:', keys.privateKey);
    
    // Speichern Sie diese Keys sicher!
    console.log('Speichern Sie diese Keys in Ihrer Umgebungsvariablen:');
    console.log('PUSH_PUBLIC_KEY=', keys.publicKey);
    console.log('PUSH_PRIVATE_KEY=', keys.privateKey);
    
    return keys;
  } catch (error) {
    console.error('Fehler bei der Key-Generierung:', error);
    throw error;
  }
}

generateKeys();

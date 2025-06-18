import crypto from 'crypto';

function generateVAPIDKeys() {
    const keyPair = crypto.generateKeyPairSync('ed25519');
    
    const publicKey = keyPair.publicKey.export({
        type: 'spki',
        format: 'pem'
    });
    
    const privateKey = keyPair.privateKey.export({
        type: 'pkcs8',
        format: 'pem'
    });
    
    // Konvertiere die Keys in das Format, das web-push erwartet
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
    const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
    
    console.log('Public Key:', publicKeyBase64);
    console.log('Private Key:', privateKeyBase64);
    
    console.log('\nFügen Sie diese Keys zu Ihren Umgebungsvariablen hinzu:');
    console.log('PUSH_PUBLIC_KEY=', publicKeyBase64);
    console.log('PUSH_PRIVATE_KEY=', privateKeyBase64);
}

generateVAPIDKeys();

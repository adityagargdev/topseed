import admin from 'firebase-admin'

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[Firebase Admin] MISSING ENV VARS:', {
      FIREBASE_PROJECT_ID: projectId ? '✓' : '✗ MISSING',
      FIREBASE_CLIENT_EMAIL: clientEmail ? '✓' : '✗ MISSING',
      FIREBASE_PRIVATE_KEY: privateKey ? '✓' : '✗ MISSING',
    })
    throw new Error('[Firebase Admin] Missing required environment variables')
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    })
    console.log('[Firebase Admin] Initialized successfully ✓')
  } catch (err) {
    console.error('[Firebase Admin] INIT FAILED:', err)
    throw err
  }
}

export default admin

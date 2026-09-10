module.exports = function firebaseConfig(request, response) {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    appId: process.env.FIREBASE_APP_ID || "",
  };

  const ready = Object.values(config).every(Boolean);
  response.setHeader("Content-Type", "application/javascript; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).send(
    `window.BEXAMS_FIREBASE_CONFIG = ${JSON.stringify(ready ? config : null)};`
  );
};

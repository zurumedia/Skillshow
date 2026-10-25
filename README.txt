SKILLSHOW PWA STARTER — Android/GitHub Pages

Upload these FOUR files to the ROOT of the existing Skillshow repository, beside index.html:
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

The icon files are kept at the repository root to make uploading from an Android phone simpler.

Then edit index.html:
A) Inside <head>, add:
   <link rel="manifest" href="./manifest.json">
   <meta name="theme-color" content="#800020">
   <meta name="mobile-web-app-capable" content="yes">
   <meta name="apple-mobile-web-app-capable" content="yes">
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
   <link rel="icon" href="./icon-192.png" type="image/png">

B) Immediately before </body>, add:
   <script>
   if ("serviceWorker" in navigator) {
     window.addEventListener("load", () => {
       navigator.serviceWorker.register("./sw.js", { scope: "./" })
         .catch((error) => console.error("SkillShow service worker registration failed:", error));
     });
   }
   </script>

Commit the changes and wait for GitHub Pages to publish.

Test these URLs:
https://zurumedia.github.io/Skillshow/manifest.json
https://zurumedia.github.io/Skillshow/sw.js

If both show their file contents instead of 404, open https://zurumedia.github.io/Skillshow/ in Chrome on Android and use the browser menu > Install app or Add to Home screen.

SAFETY NOTES:
- Starter files are not yet integrated/tested against the live HTML.
- The service worker only caches the public app shell and does not cache Supabase/API calls or private user data.
- The icon is a simple S placeholder.
- Do not change Supabase settings, keys, tables, or policies for this step.

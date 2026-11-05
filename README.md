# sprocketexif.app

The one-pager for Sprocket EXIF Editor: static files in `public/`, served from Cloudflare Workers
static assets. Same set-up as chester.kvds.media. The app's source is a separate repo.

```sh
npm install
npm run dev      # http://localhost:8799
npm run deploy   # goes live on sprocketexif.app and www.sprocketexif.app
```

- `public/index.html` holds the words. No website copy goes live before Kris has approved it.
- `public/js/demo.js` is the working copy of the editor. Its cascade follows the app's rules.
- `public/js/roll.js` draws the film's edge print down both sides of the page.
- `public/img/frames/frame-01.webp` to `frame-06.webp` are drawn placeholders. Replace them with real
  frames under the same names (3:2, about 900 x 600, no EXIF, GPS removed).
- `tools/make-assets.py` draws the grain, dust, burnt tail, icons and placeholders. Run it with
  `--keep-frames` once real frames are in.

## Keeping it in step with the app

The page copies the app's look on purpose, and the app's look will change. Every shared value is a
token at the top of `public/css/site.css`, each with a comment naming the Swift value it mirrors
(`Views/Setup/WizardType.swift`, `FilmEdgeChrome.swift` in the app's repo). Change it there and the
whole page follows. Shapes that are drawn rather than set by a token:

- Edge print, wedges and START marks: `public/js/roll.js`, `.rail` and `.start` in the CSS.
- Grain, dust and the burnt tail: `tools/make-assets.py`.
- Icon: `tools/app-icon.png`, taken from the built app.
- The window layout and row fields of the demo: `rowHTML()` in `public/js/demo.js`.

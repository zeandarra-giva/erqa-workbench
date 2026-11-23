# ERQA Workbench (prototype)

A clickable prototype of the ERQA Case Workbench, built with plain HTML, CSS and JavaScript.

**Open `index.html` in a browser.** No install, build step or server is needed.

> Synthetic data only. Every name, ID and justification is fictional. Nothing is sent anywhere;
> changes are kept in your browser (localStorage). Use "Reset demo data" in the sidebar to start over.

## Structure

```
index.html          page + script order
css/styles.css      design system (tokens, components, responsive rules)
js/core/            data & logic: rules engine, HR/training routing, intake cleaning,
                    insights & back-test, synthetic dataset, state store
js/ui.js            shared UI helpers and icons
js/app.js           hash router, rendering, event delegation
js/shell.js         sidebar, top bar, mobile navigation
js/views/           one file per screen
js/tour.js          demo walkthrough (floating controller, bottom-right)
```

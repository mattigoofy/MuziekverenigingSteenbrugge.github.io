/*
 * Show the activities of Muziekvereniging Steenbrugge on another website.
 *
 *   <div data-steenbrugge-activiteiten data-limit="5" data-lang="nl"></div>
 *   <script src="https://<this site>/activiteiten/embed.js" async></script>
 *
 * data-limit: maximum number of activities (empty = all);
 * data-lang: "nl" (default) or "en".
 * Inserts an iframe that sets itself to the right height, so a scrollbar never appears.
 */
(function () {
  var script = document.currentScript;
  var base = new URL('./', script ? script.src : location.href);

  function mount() {
    var targets = document.querySelectorAll('[data-steenbrugge-activiteiten]:not([data-loaded])');
    Array.prototype.forEach.call(targets, function (target) {
      target.setAttribute('data-loaded', '');
      var src = new URL('index.html', base);
      src.searchParams.set('embed', '1');
      if (target.dataset.limit) src.searchParams.set('limit', target.dataset.limit);
      if (target.dataset.lang) src.searchParams.set('lang', target.dataset.lang);

      var frame = document.createElement('iframe');
      frame.src = src.href;
      frame.title = target.dataset.lang === 'en' ? 'Activities of Muziekvereniging Steenbrugge' : 'Activiteiten van Muziekvereniging Steenbrugge';
      frame.loading = 'lazy';
      frame.style.cssText = 'display:block;width:100%;height:320px;border:0;background:transparent;';
      target.appendChild(frame);
    });
  }

  // the page inside the iframe reports its height
  window.addEventListener('message', function (event) {
    if (event.origin !== base.origin || !event.data || event.data.type !== 'steenbrugge-activiteiten:height') return;
    var frames = document.querySelectorAll('[data-steenbrugge-activiteiten] iframe');
    Array.prototype.forEach.call(frames, function (frame) {
      if (frame.contentWindow === event.source) frame.style.height = event.data.height + 'px';
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

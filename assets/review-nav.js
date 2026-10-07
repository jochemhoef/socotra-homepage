(function () {
  var VERSIONS = [
    'socotra-homepage.html',
    'socotra-homepage-v2.html',
    'socotra-homepage-v3.html',
    'socotra-homepage-v4.html'
  ];

  var current = (location.pathname.split('/').pop() || 'socotra-homepage.html').split('?')[0];
  var linkPrefetched = Object.create(null);
  var htmlCache = Object.create(null);
  var inflight = Object.create(null);

  function prefetchLink(href) {
    if (!href || href === current || linkPrefetched[href]) return;
    linkPrefetched[href] = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);
  }

  function prefetchHtml(href) {
    if (!href || href === current || htmlCache[href] || inflight[href]) return inflight[href];
    inflight[href] = fetch(href, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('prefetch failed');
        return res.text();
      })
      .then(function (html) {
        htmlCache[href] = html;
        return html;
      })
      .catch(function () {})
      .finally(function () {
        delete inflight[href];
      });
    return inflight[href];
  }

  function warmAll() {
    VERSIONS.forEach(function (href) {
      prefetchLink(href);
      prefetchHtml(href);
    });
  }

  function navigateInstant(href, html) {
    document.open('text/html', 'replace');
    document.write(html);
    document.close();
    if (history.replaceState) {
      history.replaceState(null, '', href);
    }
  }

  function bindSwitcher() {
    var bar = document.getElementById('versionSwitch');
    if (!bar) return;

    bar.querySelectorAll('a[href]').forEach(function (anchor) {
      var href = anchor.getAttribute('href');
      if (!href || href === current) return;

      anchor.addEventListener('mouseenter', function () {
        prefetchLink(href);
        prefetchHtml(href);
      }, { passive: true });

      anchor.addEventListener('focus', function () {
        prefetchLink(href);
        prefetchHtml(href);
      }, { passive: true });

      anchor.addEventListener('touchstart', function () {
        prefetchLink(href);
        prefetchHtml(href);
      }, { passive: true });

      anchor.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || anchor.target === '_blank') return;

        if (htmlCache[href]) {
          e.preventDefault();
          navigateInstant(href, htmlCache[href]);
          return;
        }

        var pending = inflight[href];
        if (pending) {
          e.preventDefault();
          anchor.setAttribute('aria-busy', 'true');
          pending.then(function (html) {
            anchor.removeAttribute('aria-busy');
            if (html) navigateInstant(href, html);
            else location.href = href;
          });
        }
      });
    });
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(warmAll, { timeout: 1500 });
  } else {
    setTimeout(warmAll, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSwitcher);
  } else {
    bindSwitcher();
  }
})();

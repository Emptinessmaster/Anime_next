/* AnimeWorld Auto Next — controller top/frame per player AJAX. */
(function () {
  "use strict";

  const CHANNEL = "AW_AUTO_NEXT_V2";
  const MESSAGE = Object.freeze({ ENDED: "ended", PLAY: "play", PLAYING: "playing" });
  const END_TOLERANCE = 0.75;
  const SWITCH_LOCK_MS = 9000;
  const PLAY_POLL_MS = 250;
  const PLAY_POLL_LIMIT = 48;
  const TOP = window === window.top;

  let enabled = true;
  let videoBinding = null;
  let pendingVideo = null;
  let playPoll = null;

  function post(target, type, detail) {
    try {
      target.postMessage(Object.assign({ channel: CHANNEL, type: type }, detail || {}), "*");
    } catch (_) {}
  }

  function isMessage(data, type) {
    return !!data && data.channel === CHANNEL && data.type === type;
  }

  function loadEnabled() {
    try {
      chrome.storage.local.get({ enabled: true }, function (result) {
        enabled = result.enabled !== false;
        document.documentElement.toggleAttribute("data-aw-disabled", !enabled);
      });
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local" || !changes.enabled) return;
        enabled = changes.enabled.newValue !== false;
        document.documentElement.toggleAttribute("data-aw-disabled", !enabled);
      });
    } catch (_) {}
  }

  function fullscreenElement(doc) {
    return doc.fullscreenElement || doc.webkitFullscreenElement ||
      doc.mozFullScreenElement || doc.msFullscreenElement || null;
  }

  function requestFullscreen(element) {
    const method = element && (element.requestFullscreen || element.webkitRequestFullscreen ||
      element.mozRequestFullScreen || element.msRequestFullscreen);
    if (!method) return Promise.reject(new Error("Fullscreen non supportato"));
    try {
      return Promise.resolve(method.call(element));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function exitFullscreen(doc) {
    const method = doc.exitFullscreen || doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen || doc.msExitFullscreen;
    if (!method) return Promise.resolve();
    try {
      return Promise.resolve(method.call(doc));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function findVideo() {
    const videos = Array.from(document.querySelectorAll("video"));
    return videos.sort(function (a, b) {
      return b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight;
    })[0] || null;
  }

  function reportEnded() {
    if (!enabled) return;
    if (TOP) topController.nextEpisode(!!fullscreenElement(document));
    else post(window.top, MESSAGE.ENDED, { fullscreen: !!fullscreenElement(document) });
  }

  function reportPlaying() {
    if (TOP) topController.onPlaying();
    else post(window.top, MESSAGE.PLAYING);
  }

  function bindVideo(video) {
    if (videoBinding && videoBinding.video === video) return;
    if (videoBinding) videoBinding.abort.abort();
    if (!video) {
      videoBinding = null;
      return;
    }
    const abort = new AbortController();
    const options = { signal: abort.signal };
    let ended = false;
    function onEnded() {
      if (ended) return;
      ended = true;
      reportEnded();
    }
    video.addEventListener("ended", onEnded, options);
    video.addEventListener("timeupdate", function () {
      const remaining = video.duration - video.currentTime;
      if (video.currentTime > 0 && Number.isFinite(remaining) &&
          remaining >= 0 && remaining <= END_TOLERANCE) onEnded();
    }, options);
    video.addEventListener("playing", reportPlaying, options);
    video.addEventListener("emptied", function () { ended = false; }, options);
    videoBinding = { video: video, abort: abort };
  }

  function scanVideo() {
    bindVideo(findVideo());
  }

  function playLocalVideo() {
    const video = findVideo();
    bindVideo(video);
    if (!video) return false;
    if (!video.paused) {
      pendingVideo = null;
      reportPlaying();
      return true;
    }
    try {
      const result = video.play();
      if (result && typeof result.catch === "function") {
        result.catch(function () { pendingVideo = video; });
      }
    } catch (_) {
      pendingVideo = video;
    }
    return true;
  }

  function relayPlay() {
    playLocalVideo();
    document.querySelectorAll("iframe").forEach(function (frame) {
      if (frame.contentWindow) post(frame.contentWindow, MESSAGE.PLAY);
    });
  }

  function fulfillPendingPlay() {
    if (!enabled || !pendingVideo || !pendingVideo.isConnected) return;
    const video = pendingVideo;
    pendingVideo = null;
    try {
      const result = video.play();
      if (result && typeof result.catch === "function") {
        result.catch(function () { pendingVideo = video; });
      }
    } catch (_) {
      pendingVideo = video;
    }
  }

  const topController = {
    switching: false,
    wantsFullscreen: false,
    promptShown: false,
    fullscreenButtonTimer: null,

    player: function () { return document.querySelector("#player"); },

    mountUi: function () {
      const player = this.player();
      if (!player || player.querySelector(":scope > #aw-fullscreen-toggle")) return;
      let style = document.getElementById("aw-auto-next-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "aw-auto-next-style";
        style.textContent =
          "#player{position:relative!important}" +
          "#aw-fullscreen-toggle{position:absolute;right:10px;bottom:10px;z-index:2147483647;width:44px;height:36px;border:0;border-radius:6px;background:rgba(8,12,18,.78);color:#fff;font:22px/1 Arial,sans-serif;cursor:pointer;display:grid;place-items:center;opacity:.82;transition:opacity .2s,visibility .2s}" +
          "#aw-fullscreen-toggle.aw-hidden{opacity:0;visibility:hidden;pointer-events:none}" +
          "#aw-fullscreen-toggle:hover,#aw-fullscreen-toggle:focus-visible{opacity:1;outline:2px solid #fff;outline-offset:1px}" +
          "#player:fullscreen{width:100vw!important;height:100vh!important;background:#000!important}" +
          "#player:fullscreen iframe,#player:fullscreen video{width:100%!important;height:100%!important;max-height:none!important}" +
          "[data-aw-disabled] #aw-fullscreen-toggle{display:none!important}";
        (document.head || document.documentElement).appendChild(style);
      }
      const button = document.createElement("button");
      button.id = "aw-fullscreen-toggle";
      button.type = "button";
      button.textContent = "⛶";
      button.title = "Schermo intero stabile (AnimeWorld Auto Next)";
      button.setAttribute("aria-label", "Attiva o disattiva lo schermo intero stabile");
      button.addEventListener("click", this.toggleFullscreen.bind(this));
      player.appendChild(button);
      const showButton = function () {
        button.classList.remove("aw-hidden");
        clearTimeout(this.fullscreenButtonTimer);
        this.fullscreenButtonTimer = setTimeout(function () {
          button.classList.add("aw-hidden");
        }, 15000);
      }.bind(this);
      player.addEventListener("mousemove", showButton);
      showButton();
    },

    toggleFullscreen: function () {
      const player = this.player();
      if (!player) return;
      if (fullscreenElement(document)) {
        this.wantsFullscreen = false;
        exitFullscreen(document).catch(function () {});
        return;
      }
      this.wantsFullscreen = true;
      requestFullscreen(player).catch(function () {
        this.wantsFullscreen = false;
        this.notify("Fullscreen bloccato: riprova con il pulsante ⛶");
      }.bind(this));
    },

    activeEpisode: function (links) {
      return links.findIndex(function (link) {
        return link.classList.contains("active") ||
          link.getAttribute("aria-current") === "page" ||
          (link.parentElement && link.parentElement.classList.contains("active"));
      });
    },

    nextEpisode: function (frameWasFullscreen) {
      if (!enabled || this.switching) return;
      this.switching = true;
      setTimeout(function () { this.switching = false; }.bind(this), SWITCH_LOCK_MS);
      const player = this.player();
      const activeFullscreen = fullscreenElement(document);
      this.wantsFullscreen = activeFullscreen === player ||
        (!!frameWasFullscreen && !activeFullscreen);
      const links = Array.from(document.querySelectorAll(
        ".episodes a[data-episode-num]"
      )).sort(function (a, b) {
        return Number(a.dataset.episodeNum) - Number(b.dataset.episodeNum);
      });
      const current = this.activeEpisode(links);
      if (current >= 0 && current + 1 < links.length) {
        const next = links[current + 1];
        this.notify("Episodio " + next.dataset.episodeNum + " in arrivo…");
        next.click();
        this.afterSwitch();
        return;
      }
      const fallback = document.querySelector(
        ".prevnext.next:not(.disabled), a[rel='next'], .next-episode"
      );
      if (fallback) {
        this.notify("Episodio successivo…");
        fallback.click();
        this.afterSwitch();
        return;
      }
      this.switching = false;
      this.notify("Ultimo episodio raggiunto.");
    },

    afterSwitch: function () {
      clearInterval(playPoll);
      let attempts = 0;
      playPoll = setInterval(function () {
        attempts += 1;
        this.mountUi();
        relayPlay();
        if (attempts >= PLAY_POLL_LIMIT) {
          clearInterval(playPoll);
          playPoll = null;
        }
      }.bind(this), PLAY_POLL_MS);
      if (this.wantsFullscreen && fullscreenElement(document) !== this.player()) {
        this.showFullscreenPrompt();
      }
    },

    onPlaying: function () {
      if (this.wantsFullscreen && fullscreenElement(document) !== this.player()) {
        this.showFullscreenPrompt();
      }
    },

    showFullscreenPrompt: function () {
      if (this.promptShown) return;
      this.promptShown = true;
      this.notify("Premi ⛶ sul player per ripristinare lo schermo intero");
      setTimeout(function () { this.promptShown = false; }.bind(this), 5000);
    },

    onFullscreenChange: function () {
      const active = fullscreenElement(document);
      if (active === this.player()) {
        this.wantsFullscreen = true;
        this.promptShown = false;
      } else if (!active && !this.switching) {
        this.wantsFullscreen = false;
      }
    },

    notify: function (text) {
      let toast = document.getElementById("aw-auto-next-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "aw-auto-next-toast";
        toast.style.cssText =
          "position:fixed;right:20px;bottom:20px;z-index:2147483647;padding:10px 15px;" +
          "border-radius:7px;background:#165fa7;color:#fff;font:600 14px Arial,sans-serif;" +
          "box-shadow:0 4px 14px #0008;pointer-events:none;opacity:0;transition:opacity .2s";
        (document.body || document.documentElement).appendChild(toast);
      }
      toast.textContent = text;
      requestAnimationFrame(function () { toast.style.opacity = "1"; });
      clearTimeout(toast.__awHide);
      toast.__awHide = setTimeout(function () { toast.style.opacity = "0"; }, 3500);
    },
  };

  loadEnabled();
  scanVideo();
  new MutationObserver(function () {
    scanVideo();
    if (TOP) topController.mountUi();
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (isMessage(data, MESSAGE.PLAY)) relayPlay();
    else if (TOP && event.source !== window && isMessage(data, MESSAGE.ENDED)) {
      topController.nextEpisode(data.fullscreen === true);
    } else if (TOP && event.source !== window && isMessage(data, MESSAGE.PLAYING)) {
      topController.onPlaying();
    }
  });

  ["pointerdown", "keydown", "touchstart"].forEach(function (type) {
    window.addEventListener(type, fulfillPendingPlay, true);
  });
  if (TOP) {
    topController.mountUi();
    ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange"].forEach(
      function (type) {
        document.addEventListener(type, function () { topController.onFullscreenChange(); });
      }
    );
  }
})();

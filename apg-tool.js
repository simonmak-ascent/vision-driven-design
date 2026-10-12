/* APG tool-page behaviour: theme toggle (data-theme / apg-theme), connect tabs, copy.
 * The blocking theme init lives inline in each page's <head> (no-FOUC). */
(function () {
  "use strict";
  var KEY = "apg-theme";

  function current() {
    var v = document.documentElement.getAttribute("data-theme");
    return v === "light" || v === "dark" ? v : "dark";
  }
  function sync() {
    var light = current() === "light";
    var b = document.querySelector(".apg-theme-toggle");
    if (!b) return;
    b.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    b.setAttribute("title", b.getAttribute("aria-label"));
    b.textContent = light ? "☀" : "☾";
  }
  var btn = document.querySelector(".apg-theme-toggle");
  if (btn) {
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      sync();
    });
    sync();
  }

  // Connect tabs
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".apg-tab"));
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = tab.getAttribute("data-target");
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        var pane = document.getElementById(t.getAttribute("data-target"));
        if (pane) pane.hidden = !on;
      });
    });
  });

  // Copy buttons
  Array.prototype.slice.call(document.querySelectorAll(".apg-copy")).forEach(function (b) {
    b.addEventListener("click", function () {
      var pre = b.parentElement.querySelector("pre");
      if (!pre) return;
      var text = pre.innerText;
      var done = function () {
        var old = b.textContent;
        b.textContent = "Copied";
        setTimeout(function () { b.textContent = old; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
  });
})();

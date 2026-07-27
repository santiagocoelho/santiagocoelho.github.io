/* Santiago Coelho — site interactions */
(function () {
  "use strict";

  // Current year in footer
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById("navToggle");
  var navmenu = document.getElementById("navmenu");
  if (toggle && navmenu) {
    toggle.addEventListener("click", function () {
      navmenu.classList.toggle("open");
    });
    // Close menu after clicking a link (mobile)
    navmenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navmenu.classList.remove("open");
      });
    });
  }

  // Show all publications toggle
  var pubToggle = document.getElementById("pubToggle");
  var pubList = document.getElementById("pubList");
  if (pubToggle && pubList) {
    pubToggle.addEventListener("click", function () {
      var expanded = pubList.classList.toggle("show-all");
      pubToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      pubToggle.textContent = expanded ? "Show fewer publications" : "Show all publications";
    });
  }

  // Scrollspy — highlight active nav link
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".navmenu a"));

  function onScroll() {
    var pos = window.scrollY + (document.querySelector(".header").offsetHeight || 68) + 20;
    var current = sections[0] ? sections[0].id : null;
    sections.forEach(function (sec) {
      if (sec.offsetTop <= pos) current = sec.id;
    });
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("load", onScroll);
  onScroll();

  // AOS scroll animations
  if (window.AOS) {
    AOS.init({ duration: 650, once: true, offset: 60, easing: "ease-out-cubic" });
  }
})();

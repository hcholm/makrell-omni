(() => {
  function normalisePath(pathname) {
    if (!pathname) {
      return "/";
    }

    let path = pathname.replace(/\\/g, "/");

    if (path.endsWith("/index.html")) {
      path = path.slice(0, -"/index.html".length) || "/";
    } else if (path.endsWith("index.html")) {
      path = path.slice(0, -"index.html".length) || "/";
    }

    if (path.length > 1) {
      path = path.replace(/\/+$/, "");
    }

    return path || "/";
  }

  function highlightPlaygroundNav() {
    const nav = document.querySelector(".playground-section-nav");
    if (!nav) {
      return;
    }

    const currentPath = normalisePath(window.location.pathname);

    nav.querySelectorAll("a").forEach((link) => {
      const linkPath = normalisePath(new URL(link.getAttribute("href"), window.location.href).pathname);
      const isActive = linkPath === currentPath;

      link.classList.toggle("playground-section-link--active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", highlightPlaygroundNav);
  } else {
    highlightPlaygroundNav();
  }
})();

(() => {
  const githubHref = "https://github.com/hcholm/makrell-omni";
  const svgMarkup = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.87-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.33 9.33 0 0 1 12 6.84a9.3 9.3 0 0 1 2.5.35c1.9-1.32 2.74-1.05 2.74-1.05.56 1.42.21 2.47.11 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.6.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"></path>
    </svg>`;

  function removeOldGithubLinks() {
    document.querySelectorAll(
      ".makrell-toolbar-link-row, .makrell-sidebar-link-row, .header-right .makrell-github-link, .content-icon-container .makrell-github-link"
    ).forEach((node) => node.remove());
  }

  function ensureGithubLink(container) {
    if (!container || container.querySelector(".makrell-sidebar-link-row")) {
      return;
    }

    const row = document.createElement("div");
    row.className = "makrell-sidebar-link-row";

    const link = document.createElement("a");
    link.className = "makrell-github-link makrell-github-link-sidebar";
    link.href = githubHref;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.ariaLabel = "Makrell on GitHub";
    link.title = "Makrell on GitHub";
    link.innerHTML = `${svgMarkup}<span>GitHub</span>`;

    row.appendChild(link);
    container.appendChild(row);
  }

  function installGithubLinks() {
    removeOldGithubLinks();
    ensureGithubLink(document.querySelector(".sidebar-sticky"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installGithubLinks);
  } else {
    installGithubLinks();
  }
})();

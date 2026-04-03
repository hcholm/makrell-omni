(() => {
  const THEMES = ["light", "auto", "dark"];

  function currentTheme() {
    return localStorage.getItem("theme") || "auto";
  }

  function applyTheme(theme) {
    const resolved = THEMES.includes(theme) ? theme : "auto";
    localStorage.setItem("theme", resolved);
    document.body.dataset.theme = resolved;
    syncButtons(resolved);
  }

  function syncButtons(theme) {
    document.querySelectorAll(".playground-theme-button").forEach((button) => {
      const isActive = button.dataset.playgroundTheme === theme;
      button.classList.toggle("playground-theme-button--active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function installPlaygroundThemeSwitch() {
    const topbar = document.querySelector(".playground-topbar");
    const shell = document.querySelector(".playground-shell");
    if (!topbar || !shell) {
      return;
    }

    document.body.classList.add("playground-page");

    if (topbar.querySelector(".playground-theme-switch")) {
      syncButtons(currentTheme());
      return;
    }

    const switcher = document.createElement("div");
    switcher.className = "playground-theme-switch";
    switcher.setAttribute("aria-label", "Playground theme");

    THEMES.forEach((theme) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "playground-theme-button";
      button.dataset.playgroundTheme = theme;
      button.textContent = theme;
      button.addEventListener("click", () => applyTheme(theme));
      switcher.appendChild(button);
    });

    topbar.appendChild(switcher);
    syncButtons(currentTheme());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installPlaygroundThemeSwitch);
  } else {
    installPlaygroundThemeSwitch();
  }
})();

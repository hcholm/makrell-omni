(() => {
  function isTypingTarget(target) {
    if (!target) {
      return false;
    }

    const tagName = (target.tagName || "").toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target.isContentEditable
    );
  }

  function navigateByRel(rel) {
    const link = document.querySelector(`link[rel="${rel}"]`);
    const href = link && link.getAttribute("href");
    if (!href) {
      return;
    }

    window.location.href = href;
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isTypingTarget(event.target)
    ) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateByRel("prev");
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateByRel("next");
    }
  });
})();

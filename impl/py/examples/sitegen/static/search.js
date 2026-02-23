async function initSearch() {
  const host = document.querySelector("main");
  if (!host) return;

  const wrapper = document.createElement("section");
  wrapper.className = "search";
  wrapper.innerHTML = `
    <h2>Search</h2>
    <input id="q" type="search" placeholder="Search pages..." />
    <ul id="search-results"></ul>
  `;
  host.prepend(wrapper);

  const res = await fetch("/search-index.json");
  const docs = await res.json();
  const input = document.getElementById("q");
  const list = document.getElementById("search-results");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    list.innerHTML = "";
    if (!q) return;
    const hits = docs.filter((d) =>
      (d.title + " " + d.description + " " + d.text).toLowerCase().includes(q)
    ).slice(0, 10);
    for (const h of hits) {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${h.url}">${h.title}</a>`;
      list.appendChild(li);
    }
  });
}

initSearch();

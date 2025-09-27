// =====================
// CrowsCoupe Gaming JS
// - Responsive nav
// - Dynamic team loading (JSON)
// - Filters (role/game/search)
// - Modal with animations
// - Twitch LIVE badge via serverless proxy (/api/twitch-live)
// - Merch grid (filter + search + sort)
// =====================

const TWITCH_PROXY_ENDPOINT = "/api/twitch-live";

document.addEventListener("DOMContentLoaded", () => {
  // ---------------- NAV ----------------
  const toggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("show");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // ---------------- TEAM PAGE ----------------
  const teamContainer = document.getElementById("team-container");
  const roleFilter = document.getElementById("roleFilter");
  const gameFilter = document.getElementById("gameFilter");
  const searchInput = document.getElementById("searchInput");
  const clearFiltersBtn = document.getElementById("clearFilters");

  // Modal elements
  const modal = document.getElementById("profile-modal");
  const modalClose = modal ? modal.querySelector(".modal-close") : null;
  const modalBackdrop = modal ? modal.querySelector(".modal-backdrop") : null;

  const mImg = document.getElementById("modal-image");
  const mName = document.getElementById("modal-name");
  const mRole = document.getElementById("modal-role");
  const mGames = document.getElementById("modal-games");
  const mBio = document.getElementById("modal-bio");
  const mLinks = document.getElementById("modal-links");

  let TEAM = [];
  let FILTERS = { role: "all", game: "all", q: "" };

  // Normalize Twitch handle from URL or plain string
  const getTwitchLoginFromUrl = (url) => {
    if (!url) return "";
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[0] || "";
    } catch {
      return url.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").split("/")[0];
    }
  };

  if (teamContainer) {
    fetch("public/data/team.json")
      .then((r) => r.json())
      .then((data) => {
        TEAM = data;

        // Build dropdown filters
        const roles = Array.from(new Set(TEAM.map((m) => m.role))).sort();
        const games = Array.from(new Set(TEAM.flatMap((m) => m.games || []))).sort();

        roles.forEach((role) => {
          const opt = document.createElement("option");
          opt.value = role;
          opt.textContent = role;
          roleFilter.appendChild(opt);
        });

        games.forEach((game) => {
          const opt = document.createElement("option");
          opt.value = game;
          opt.textContent = game;
          gameFilter.appendChild(opt);
        });

        renderTeam();
      })
      .catch((err) => {
        teamContainer.innerHTML = "<p>Failed to load team data.</p>";
        console.error("Error loading team.json:", err);
      });

    // Filter listeners
    roleFilter && roleFilter.addEventListener("change", () => {
      FILTERS.role = roleFilter.value;
      renderTeam();
    });
    gameFilter && gameFilter.addEventListener("change", () => {
      FILTERS.game = gameFilter.value;
      renderTeam();
    });
    searchInput && searchInput.addEventListener("input", () => {
      FILTERS.q = searchInput.value;
      renderTeam();
    });
    clearFiltersBtn && clearFiltersBtn.addEventListener("click", () => {
      FILTERS = { role: "all", game: "all", q: "" };
      if (roleFilter) roleFilter.value = "all";
      if (gameFilter) gameFilter.value = "all";
      if (searchInput) searchInput.value = "";
      renderTeam();
    });
  }

  function renderTeam() {
    const filtered = TEAM.filter((member) => {
      const roleOk = FILTERS.role === "all" || member.role === FILTERS.role;
      const gameOk =
        FILTERS.game === "all" ||
        (Array.isArray(member.games) && member.games.includes(FILTERS.game));
      const q = FILTERS.q.trim().toLowerCase();
      const qOk = !q || member.name.toLowerCase().includes(q);
      return roleOk && gameOk && qOk;
    });

    teamContainer.innerHTML = "";
    if (filtered.length === 0) {
      teamContainer.innerHTML = "<p>No members match the current filters.</p>";
      return;
    }

    filtered.forEach((member) => {
      const card = document.createElement("div");
      card.className = "role-card";
      card.setAttribute("tabindex", "0");

      const twitchLogin = member.twitch ? getTwitchLoginFromUrl(member.twitch) : "";

      card.innerHTML = `
        <div class="card-top">
          <img src="public/assets/images/${member.image}" alt="${member.name}" class="team-image">
          <span class="live-badge" data-live="false" ${twitchLogin ? `data-login="${twitchLogin}"` : ""} hidden>
            <span class="dot"></span> LIVE
          </span>
        </div>
        <h3>${member.name}</h3>
        <p class="meta"><strong>${member.role}</strong></p>
        <div class="tags">
          ${(member.games || []).map((g) => `<span class="tag">${g}</span>`).join("")}
        </div>
      `;

      card.addEventListener("click", () => openModal(member));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(member);
        }
      });

      teamContainer.appendChild(card);
    });

    checkTwitchLiveForDisplayedCards();
  }

  // Modal open/close with animation
  function openModal(member) {
    if (!modal) return;

    mImg.src = `public/assets/images/${member.image}`;
    mImg.alt = member.name;
    mName.textContent = member.name;
    mRole.textContent = member.role;
    mGames.textContent =
      member.games && member.games.length ? `Games: ${member.games.join(", ")}` : "";
    mBio.textContent = member.bio || "";
    mLinks.innerHTML = "";

    if (member.twitch) {
      const a = document.createElement("a");
      a.href = member.twitch.startsWith("http") ? member.twitch : `https://twitch.tv/${member.twitch}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Twitch";
      mLinks.appendChild(a);
    }
    if (member.youtube) {
      const a = document.createElement("a");
      a.href = member.youtube;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "YouTube";
      mLinks.appendChild(a);
    }

    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const content = modal.querySelector(".modal-content");
    content.classList.remove("closing");
    void content.offsetWidth; // restart animation
    content.classList.add("opening");
    content.addEventListener("animationend", () => content.classList.remove("opening"), { once: true });
  }

  function closeModal() {
    if (!modal) return;
    const content = modal.querySelector(".modal-content");
    content.classList.remove("opening");
    content.classList.add("closing");
    content.addEventListener(
      "animationend",
      () => {
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        content.classList.remove("closing");
      },
      { once: true }
    );
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.getAttribute("aria-hidden") === "false") {
      closeModal();
    }
  });

  // Twitch LIVE badges via proxy
  async function checkTwitchLiveForDisplayedCards() {
    if (!teamContainer) return;
    const badges = Array.from(teamContainer.querySelectorAll('.live-badge[data-login]'));
    if (badges.length === 0) return;

    const logins = Array.from(new Set(badges.map(b => b.getAttribute("data-login")).filter(Boolean)));
    const url = `${TWITCH_PROXY_ENDPOINT}?logins=${encodeURIComponent(logins.join(","))}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
      const { live } = await res.json();

      badges.forEach((badge) => {
        const login = (badge.getAttribute("data-login") || "").toLowerCase();
        if (live && live[login]) {
          const info = live[login];
          badge.hidden = false;
          badge.setAttribute("data-live", "true");
          badge.setAttribute("title", info.title ? `${info.title} — ${info.viewers} watching` : "Live on Twitch");
        } else {
          badge.hidden = true;
          badge.setAttribute("data-live", "false");
          badge.removeAttribute("title");
        }
      });
    } catch (err) {
      console.error("Twitch proxy check failed:", err);
    }
  }

  // ---------------- MERCH (SHOP) PAGE ----------------
  const merchGrid = document.getElementById("merch-grid");
  const merchTagFilter = document.getElementById("merchTagFilter");
  const merchSearch = document.getElementById("merchSearch");
  const merchClear = document.getElementById("merchClear");
  const merchSort = document.getElementById("merchSort");

  let MERCH = [];
  let MERCH_FILTERS = { tag: "all", q: "" };
  let MERCH_SORT = "relevance";

  if (merchGrid) {
    fetch("public/data/merch.json")
      .then((r) => r.json())
      .then((items) => {
        MERCH = items;

        // Build category tags
        const tags = Array.from(new Set(MERCH.flatMap(m => m.tags || []))).sort();
        tags.forEach(tag => {
          const opt = document.createElement("option");
          opt.value = tag;
          opt.textContent = tag[0].toUpperCase() + tag.slice(1);
          merchTagFilter.appendChild(opt);
        });

        renderMerch();
      })
      .catch((err) => {
        merchGrid.innerHTML = "<p>Failed to load merch items.</p>";
        console.error("Error loading merch.json:", err);
      });

    merchTagFilter && merchTagFilter.addEventListener("change", () => {
      MERCH_FILTERS.tag = merchTagFilter.value;
      renderMerch();
    });
    merchSearch && merchSearch.addEventListener("input", () => {
      MERCH_FILTERS.q = merchSearch.value;
      renderMerch();
    });
    merchClear && merchClear.addEventListener("click", () => {
      MERCH_FILTERS = { tag: "all", q: "" };
      MERCH_SORT = "relevance";
      if (merchTagFilter) merchTagFilter.value = "all";
      if (merchSearch) merchSearch.value = "";
      if (merchSort) merchSort.value = "relevance";
      renderMerch();
    });
    merchSort && merchSort.addEventListener("change", () => {
      MERCH_SORT = merchSort.value;
      renderMerch();
    });
  }

  function getPrimaryCategory(item) {
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      return String(item.tags[0]).toLowerCase();
    }
    return "";
  }

  function renderMerch() {
    let filtered = MERCH.filter(item => {
      const tagOk = MERCH_FILTERS.tag === "all" || (item.tags || []).includes(MERCH_FILTERS.tag);
      const q = MERCH_FILTERS.q.trim().toLowerCase();
      const qOk = !q || item.name.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q);
      return tagOk && qOk;
    });

    if (MERCH_SORT === "price_asc" || MERCH_SORT === "price_desc") {
      filtered.sort((a, b) => {
        const pa = typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
        return MERCH_SORT === "price_asc" ? pa - pb : pb - pa;
      });
    } else if (MERCH_SORT === "category_az") {
      filtered.sort((a, b) => {
        const ca = getPrimaryCategory(a);
        const cb = getPrimaryCategory(b);
        if (ca === cb) {
          return a.name.localeCompare(b.name);
        }
        return ca.localeCompare(cb);
      });
    }

    merchGrid.innerHTML = "";

    if (filtered.length === 0) {
      merchGrid.innerHTML = "<p>No merch matches the current filters.</p>";
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "merch-card";
      const price = typeof item.price === "number" ? `$${item.price.toFixed(2)}` : "";

      const statusTag = (() => {
        if (item.status === "out_of_stock") return `<span class="tag">Out of Stock</span>`;
        if (item.status === "coming_soon") return `<span class="tag">Coming Soon</span>`;
        return `<span class="tag">In Stock</span>`;
      })();

      const actionBtn = (() => {
        if (item.status === "in_stock" && item.url) {
          return `<a href="${item.url}" target="_blank" rel="noopener" class="btn">Buy Now ${price ? `• ${price}` : ""}</a>`;
        }
        if (item.status === "coming_soon") {
          return `<a class="btn" aria-disabled="true">Coming Soon</a>`;
        }
        return `<a class="btn" aria-disabled="true">Out of Stock</a>`;
      })();

      card.innerHTML = `
        <img src="public/assets/images/${item.image}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p>${item.description || ""}</p>
        <div class="tags" style="margin:0.5rem 0 0.75rem;">
          ${statusTag}
          ${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
        ${actionBtn}
      `;

      merchGrid.appendChild(card);
    });
  }
});

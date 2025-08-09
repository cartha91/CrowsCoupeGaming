// main.js

// ===========================
// TEAM FILTERS & CARD EVENTS
// ===========================

// Elements
const roleFilter = document.getElementById("role-filter");
const gameFilter = document.getElementById("game-filter");
const teamGrid = document.getElementById("team-grid");
let teamData = [];

// Fetch and render team data
fetch("data/team.json")
  .then(res => res.json())
  .then(data => {
    teamData = data;
    renderTeamCards(teamData);
  })
  .catch(err => console.error("Error loading team.json:", err));

function renderTeamCards(data) {
  if (!teamGrid) return;
  teamGrid.innerHTML = "";

  data.forEach(member => {
    const card = document.createElement("div");
    card.classList.add("team-card");
    card.innerHTML = `
      <img src="${member.image}" alt="${member.name}" />
      <div class="team-info">
        <h3>${member.name}</h3>
        <p>${member.role}</p>
        <span class="twitch-badge" data-twitch="${member.twitch}">Checking...</span>
      </div>
    `;

    card.addEventListener("click", () => openModal(member));
    teamGrid.appendChild(card);
  });

  updateTwitchBadges();
}

// Filter change events
if (roleFilter) {
  roleFilter.addEventListener("change", filterTeam);
}
if (gameFilter) {
  gameFilter.addEventListener("change", filterTeam);
}

function filterTeam() {
  const roleValue = roleFilter.value;
  const gameValue = gameFilter.value;

  const filtered = teamData.filter(member => {
    const roleMatch = roleValue === "all" || member.role === roleValue;
    const gameMatch = gameValue === "all" || member.games.includes(gameValue);
    return roleMatch && gameMatch;
  });

  renderTeamCards(filtered);
}

// ===========================
// MODAL LOGIC
// ===========================
const modal = document.getElementById("profile-modal");

function openModal(member) {
  if (!modal) return;

  // Fill modal content
  modal.querySelector(".modal-header h3").textContent = member.name;
  modal.querySelector(".modal-header p").textContent = member.role;
  modal.querySelector(".modal-body img").src = member.image;
  modal.querySelector(".modal-body img").alt = member.name;
  modal.querySelector(".modal-text").textContent = member.bio;

  // Show modal
  modal.setAttribute("aria-hidden", "false");
  modal.classList.remove("is-closing"); // ensure closing state cleared
  document.body.style.overflow = "hidden";

  const content = modal.querySelector(".modal-content");
  content.classList.remove("closing");
  void content.offsetWidth; // reflow for animation restart
  content.classList.add("opening");
  content.addEventListener(
    "animationend",
    () => content.classList.remove("opening"),
    { once: true }
  );
}

function closeModal() {
  if (!modal) return;
  const content = modal.querySelector(".modal-content");

  content.classList.remove("opening");
  content.classList.add("closing");
  modal.classList.add("is-closing"); // triggers backdrop fade-out

  content.addEventListener(
    "animationend",
    () => {
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      content.classList.remove("closing");
      modal.classList.remove("is-closing");
    },
    { once: true }
  );
}

// Close modal on background or X click
if (modal) {
  modal.addEventListener("click", e => {
    if (e.target.classList.contains("modal") || e.target.classList.contains("close-modal")) {
      closeModal();
    }
  });
}

// Escape key closes modal
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
    closeModal();
  }
});

// ===========================
// TWITCH BADGE LOGIC
// ===========================
function updateTwitchBadges() {
  const badges = document.querySelectorAll(".twitch-badge");
  badges.forEach(badge => {
    const twitchName = badge.dataset.twitch;
    if (!twitchName) {
      badge.textContent = "No Twitch";
      return;
    }
    // Example: In production, replace with actual Twitch API call
    fetch(`https://decapi.me/twitch/uptime/${twitchName}`)
      .then(res => res.text())
      .then(text => {
        if (text.includes("offline")) {
          badge.textContent = "Offline";
          badge.classList.remove("live");
        } else {
          badge.textContent = "LIVE on Twitch";
          badge.classList.add("live");
        }
      })
      .catch(() => {
        badge.textContent = "Status Unknown";
      });
  });
}

const modal = document.getElementById("modal");
const createBtn = document.getElementById("create-track-button");
const trackForm = document.getElementById("track-form");
const trackList = document.getElementById("track-list");
const searchInput = document.getElementById("search-input");
const genreInput = document.getElementById("input-genre");
const genreTags = document.getElementById("genre-tags");
const addGenreBtn = document.getElementById("add-genre");
const audioInput = document.getElementById("input-audio");
const audioPreview = document.getElementById("audio-preview");
const audioPreviewContainer = document.getElementById("audio-preview-container");
const removeAudioBtn = document.getElementById("remove-audio");
const sortSelect = document.getElementById("sort-select");

let tracks = JSON.parse(localStorage.getItem("tracks")) || [];
let editingIndex = null;
let currentGenres = [];
let currentAudioUrl = "";
let currentPage = 1;
const itemsPerPage = 5;
let searchQuery = "";
let lastPlayingAudio = null;

createBtn.addEventListener("click", () => {
  editingIndex = null;
  openModal();
});

trackForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("input-title").value.trim();
  const artist = document.getElementById("input-artist").value.trim();
  const album = document.getElementById("input-album").value.trim();
  const cover = document.getElementById("input-cover-image").value.trim();

  let audioUrl = currentAudioUrl;
  const file = audioInput.files[0];
  if (file) {
    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp3"];
    const maxSize = 10 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      alert("Unsupported audio format.");
      return;
    }
    if (file.size > maxSize) {
      alert("Audio file is too large. Max 10MB.");
      return;
    }
    audioUrl = URL.createObjectURL(file);
  }

  if (!title || !artist) {
    alert("Title and artist are required");
    return;
  }

  const newTrack = {
    title,
    artist,
    album,
    cover: cover || "https://via.placeholder.com/100",
    genres: [...currentGenres],
    audio: audioUrl
  };

  if (editingIndex !== null) {
    tracks[editingIndex] = newTrack;
  } else {
    tracks.push(newTrack);
  }

  localStorage.setItem("tracks", JSON.stringify(tracks));
  renderTracks();
  closeModal();
});

function renderTracks() {
  const filtered = getFilteredTracks();
  const sorted = sortTracks(filtered);
  const paginated = paginate(sorted, currentPage, itemsPerPage);
  trackList.innerHTML = "";

  paginated.forEach((track, index) => {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "delete-checkbox";
    checkbox.dataset.index = tracks.indexOf(track);

    const coverImg = document.createElement("img");
    coverImg.src = isValidImageUrl(track.cover) ? track.cover : "https://via.placeholder.com/100";
    coverImg.alt = "Cover";
    coverImg.className = "track-cover";

    const infoDiv = document.createElement("div");
    infoDiv.innerHTML = `
      <strong>${track.title}</strong> by ${track.artist}<br/>
      <small>Album: ${track.album || "N/A"} | Genres: ${track.genres.join(", ")}</small>
    `;

    if (track.audio) {
      const wrapper = document.createElement("div");
      wrapper.className = "audio-wrapper";
      const audio = document.createElement("audio");
      audio.className = "audio-player";
      audio.controls = true;
      audio.src = track.audio;

      audio.addEventListener("play", () => {
        if (lastPlayingAudio && lastPlayingAudio !== audio) {
          lastPlayingAudio.pause();
        }
        lastPlayingAudio = audio;
      });

      wrapper.appendChild(audio);
      infoDiv.appendChild(wrapper);
    }

    const actionsDiv = document.createElement("div");
    actionsDiv.innerHTML = `
      <button onclick="editTrack(${tracks.indexOf(track)})">Edit</button>
      <button onclick="deleteTrack(${tracks.indexOf(track)})">Delete</button>
    `;

    li.appendChild(checkbox);
    li.appendChild(coverImg);
    li.appendChild(infoDiv);
    li.appendChild(actionsDiv);
    trackList.appendChild(li);
  });

  renderPagination(sorted.length);
}

function editTrack(index) {
  const track = tracks[index];
  document.getElementById("input-title").value = track.title;
  document.getElementById("input-artist").value = track.artist;
  document.getElementById("input-album").value = track.album;
  document.getElementById("input-cover-image").value = track.cover;

  currentGenres = [...track.genres];
  currentAudioUrl = track.audio || "";
  updateGenreTags();
  genreInput.value = "";

  if (track.audio) {
    audioPreview.src = track.audio;
    audioPreviewContainer.classList.remove("hidden");
  } else {
    audioPreview.src = "";
    audioPreviewContainer.classList.add("hidden");
  }

  editingIndex = index;
  openModal();
}

function deleteTrack(index) {
  if (confirm("Are you sure you want to delete this track?")) {
    tracks.splice(index, 1);
    localStorage.setItem("tracks", JSON.stringify(tracks));
    renderTracks();
  }
}

function removeSelectedTracks() {
  const checkboxes = document.querySelectorAll(".delete-checkbox:checked");
  if (checkboxes.length === 0) return alert("Select at least one track to delete.");
  if (!confirm("Delete selected tracks?")) return;

  const indexes = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
  tracks = tracks.filter((_, i) => !indexes.includes(i));
  localStorage.setItem("tracks", JSON.stringify(tracks));
  renderTracks();
}

function openModal() {
  modal.classList.remove("hidden");
  if (editingIndex === null) {
    trackForm.reset();
    currentGenres = [];
    currentAudioUrl = "";
    updateGenreTags();
    audioPreview.src = "";
    audioPreviewContainer.classList.add("hidden");
  }
}

function closeModal() {
  modal.classList.add("hidden");
}

function updateGenreTags() {
  genreTags.innerHTML = "";
  currentGenres.forEach((genre) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.innerHTML = `${genre} <button type="button" onclick="removeGenre('${genre}')">&times;</button>`;
    genreTags.appendChild(span);
  });
}

function removeGenre(name) {
  currentGenres = currentGenres.filter((g) => g !== name);
  updateGenreTags();
}

function isValidImageUrl(url) {
  return /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
}

removeAudioBtn.addEventListener("click", () => {
  audioPreview.src = "";
  currentAudioUrl = "";
  audioPreviewContainer.classList.add("hidden");
  audioInput.value = "";
});

addGenreBtn.addEventListener("click", () => {
  const genre = genreInput.value.trim();
  if (genre && !currentGenres.includes(genre)) {
    currentGenres.push(genre);
    updateGenreTags();
  }
  genreInput.value = "";
});

let searchTimeout;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.toLowerCase();
    currentPage = 1;
    renderTracks();
  }, 300);
});

sortSelect.addEventListener("change", () => {
  currentPage = 1;
  renderTracks();
});

function paginate(array, page, size) {
  const start = (page - 1) * size;
  return array.slice(start, start + size);
}

function renderPagination(totalItems) {
  let container = document.getElementById("pagination");
  if (!container) {
    container = document.createElement("div");
    container.id = "pagination";
    container.className = "pagination";
    trackList.parentNode.appendChild(container);
  }
  container.innerHTML = "";
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.disabled = true;
    btn.addEventListener("click", () => {
      currentPage = i;
      renderTracks();
    });
    container.appendChild(btn);
  }
}

function getFilteredTracks() {
  return tracks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery) ||
    t.artist.toLowerCase().includes(searchQuery) ||
    t.genres.some(g => g.toLowerCase().includes(searchQuery))
  );
}

function sortTracks(list) {
  const criteria = sortSelect.value;
  if (!criteria) return list;

  return [...list].sort((a, b) => {
    if (criteria === "genre") {
      const aVal = a.genres.join(", ");
      const bVal = b.genres.join(", ");
      return aVal.localeCompare(bVal);
    }
    return a[criteria].localeCompare(b[criteria]);
  });
}

window.removeSelectedTracks = removeSelectedTracks;
renderTracks();

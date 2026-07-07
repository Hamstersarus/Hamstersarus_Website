// HamstersarusOS - window manager (Part 3)
// Reusable draggable / focusable / closable windows. Every app reuses this.

const desktopEl = document.getElementById("desktop");
const taskbarEl = document.getElementById("taskbar");

let topZ = 10;            // highest z-index handed out so far
let cascade = 0;          // offset so new windows don't land exactly on top
const openWindows = {};   // appId -> window element (so we don't open duplicates)

// Bring a window to the front.
function focusWindow(win) {
  topZ += 1;
  win.style.zIndex = topZ;
  setActiveTab(win);
}

// --- Taskbar + minimize ---------------------------------------------
// Highlight the focused window's taskbar button (no-op before any exist).
function setActiveTab(win) {
  if (!taskbarEl) return;
  taskbarEl.querySelectorAll(".taskbar-item").forEach((t) => t.classList.remove("active"));
  if (win._tab && !win.classList.contains("minimized")) win._tab.classList.add("active");
}

// Hide a window (its taskbar button stays).
function minimizeWindow(win) {
  win.classList.add("minimized");
  if (win._tab) win._tab.classList.remove("active");
}

// Show a hidden window and bring it to the front.
function restoreWindow(win) {
  win.classList.remove("minimized");
  focusWindow(win);
}

// Add a taskbar button for a window; clicking it minimizes / restores.
function addTaskbarItem(win, title) {
  const tab = document.createElement("button");
  tab.className = "taskbar-item";
  tab.textContent = title.replace(/^~\//, ""); // drop the "~/" prefix
  tab.addEventListener("click", () => {
    if (win.classList.contains("minimized")) restoreWindow(win);
    else minimizeWindow(win);
  });
  taskbarEl.appendChild(tab);
  win._tab = tab;
}

// Nudge a window so it sits fully on-screen (below the top bar).
const TOP_BAR = 34;
function clampIntoView(win) {
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - win.offsetWidth - margin);
  const maxTop = Math.max(TOP_BAR + margin, window.innerHeight - win.offsetHeight - margin);
  const left = Math.min(parseInt(win.style.left, 10) || 0, maxLeft);
  const top = Math.min(Math.max(parseInt(win.style.top, 10) || 0, TOP_BAR + margin), maxTop);
  win.style.left = left + "px";
  win.style.top = top + "px";
}

// Build and show a window. Returns the window element.
// content can be an HTML string or a DOM node.
function createWindow({ id, title, content }) {
  // already open? restore (if minimized) and focus it.
  if (id && openWindows[id]) {
    restoreWindow(openWindows[id]);
    return openWindows[id];
  }

  const win = document.createElement("section");
  win.className = "window window--floating";

  const bar = document.createElement("div");
  bar.className = "title-bar";
  bar.innerHTML =
    '<span class="title-bar-dots"><i></i><i></i><i></i></span>' +
    '<span class="title-bar-text"></span>' +
    '<button class="title-bar-min" title="minimize">─</button>' +
    '<button class="title-bar-close" title="close">×</button>';
  bar.querySelector(".title-bar-text").textContent = title;

  const body = document.createElement("div");
  body.className = "window-body";
  if (typeof content === "string") body.innerHTML = content;
  else if (content) body.appendChild(content);

  win.append(bar, body);

  // cascade new windows so several are visible at once
  win.style.left = 120 + cascade + "px";
  win.style.top = 70 + cascade + "px";
  cascade = (cascade + 28) % 140;

  desktopEl.appendChild(win);
  clampIntoView(win); // pull it fully on-screen now that we know its size
  addTaskbarItem(win, title); // taskbar button (before focus so it can highlight)
  focusWindow(win);
  if (id) openWindows[id] = win;

  // clicking anywhere on the window raises it
  win.addEventListener("pointerdown", () => focusWindow(win));

  // minimize button hides the window (keeps its taskbar button)
  bar.querySelector(".title-bar-min").addEventListener("click", (e) => {
    e.stopPropagation();
    minimizeWindow(win);
  });

  // close button removes the window and its taskbar button
  bar.querySelector(".title-bar-close").addEventListener("click", () => {
    win.remove();
    if (win._tab) win._tab.remove();
    if (id) delete openWindows[id];
  });

  makeDraggable(win, bar);
  return win;
}

// Drag `win` around by its title bar `handle`.
function makeDraggable(win, handle) {
  let startX, startY, originLeft, originTop;
  let dragging = false;

  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".title-bar-close, .title-bar-min")) return; // not from the buttons
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = win.offsetLeft;
    originTop = win.offsetTop;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    let left = originLeft + (e.clientX - startX);
    let top = originTop + (e.clientY - startY);
    // keep the window on-screen and below the top bar
    left = Math.max(0, Math.min(left, window.innerWidth - 80));
    top = Math.max(34, Math.min(top, window.innerHeight - 40));
    win.style.left = left + "px";
    win.style.top = top + "px";
  });

  handle.addEventListener("pointerup", (e) => {
    dragging = false;
    handle.releasePointerCapture(e.pointerId);
  });
}

// ---- App registry -------------------------------------------------
// Simple placeholder apps so the windows have something to show.
// Parts 4 & 5 replace these with the real "first app" and "advanced app".
const APPS = {
  // Part 4 - first real app.
  about: {
    title: "~/about-me",
    content:
      '<div class="app-about">' +
        '<div class="app-about-head">' +
          '<div class="app-about-avatar">🐹</div>' +
          "<div>" +
            "<h2>Ayla Vaynerman</h2>" +
            '<p class="app-about-tag">student developer · she/her</p>' +
          "</div>" +
        "</div>" +
        '<p class="app-about-bio">11th grader at Langley High School taking AP ' +
        "Computer Science A. i love building things. from spacecraft sensor " +
        "drivers to little operating systems like this one.</p>" +
        '<div class="app-about-cols">' +
          "<div><h3>likes</h3><ul>" +
            "<li>building things</li><li>hamsters</li>" +
            "<li>purple</li><li>art</li>" +
          "</ul></div>" +
          "<div><h3>dislikes</h3><ul>" +
            "<li>boring websites</li><li>popups</li><li>full storage</li>" +
          "</ul></div>" +
        "</div>" +
      "</div>",
  },

  // ---- Portfolio apps ----
  projects: {
    title: "~/projects",
    content:
      '<div class="app-projects">' +
        '<article class="proj-card">' +
          "<h3>HamstersarusOS 🐹</h3>" +
          "<p>my personal portfolio, built as a tiny web operating system.</p>" +
          '<p class="proj-tech">HTML · CSS · JavaScript</p>' +
          '<div class="proj-links">' +
            '<a href="https://hamstersarus.github.io/HamstersarusOS/" target="_blank" rel="noopener noreferrer">live ▸</a>' +
            '<a href="https://github.com/Hamstersarus/HamstersarusOS" target="_blank" rel="noopener noreferrer">code ▸</a>' +
          "</div>" +
        "</article>" +
        '<article class="proj-card">' +
          "<h3>SENTINEL 👁️</h3>" +
          "<p>a terminal narrative game set in a surveillance state. you're a data " +
          "analyst forced to choose between enforcing the system and protecting people. " +
          "Inspired by Papers, Please.</p>" +
          '<p class="proj-tech">Python</p>' +
          '<div class="proj-links"><a href="https://github.com/Hamstersarus/Dystopian-Future-Game" target="_blank" rel="noopener noreferrer">code ▸</a></div>' +
        "</article>" +
        '<article class="proj-card">' +
          "<h3>Fight ⚔️</h3>" +
          "<p>a turn-based fighting game on a 10×10 arena. 10 characters with special " +
          "abilities, shields, and a matchmaking system. My final AP CS A project.</p>" +
          '<p class="proj-tech">Java</p>' +
          '<div class="proj-links"><a href="https://github.com/Hamstersarus/FightGame" target="_blank" rel="noopener noreferrer">code ▸</a></div>' +
        "</article>" +
        '<article class="proj-card">' +
          "<h3>2048 🔢</h3>" +
          "<p>a terminal version of the 2048 puzzle game. slide and merge tiles to reach 2048.</p>" +
          '<p class="proj-tech">Java</p>' +
          '<div class="proj-links"><a href="https://github.com/Hamstersarus/2048" target="_blank" rel="noopener noreferrer">code ▸</a></div>' +
        "</article>" +
      "</div>",
  },
  skills: {
    title: "~/skills",
    content:
      '<div class="app-skills">' +
        '<div class="skill"><span class="skill-name">Java</span><span class="skill-bar lvl-4"></span></div>' +
        '<div class="skill"><span class="skill-name">Python (CircuitPython)</span><span class="skill-bar lvl-3"></span></div>' +
        '<div class="skill"><span class="skill-name">HTML &amp; CSS</span><span class="skill-bar lvl-4"></span></div>' +
        '<div class="skill"><span class="skill-name">JavaScript</span><span class="skill-bar lvl-3"></span></div>' +
        '<div class="skill"><span class="skill-name">Git / GitLab</span><span class="skill-bar lvl-3"></span></div>' +
      "</div>",
  },
  resume: {
    title: "~/resume",
    content:
      '<div class="app-resume">' +
        "<section><h3>education</h3>" +
          "<p>Langley High School - 11th grade.<br>" +
          "AP Computer Science A (2025–26): Java, OOP, data structures, algorithms.</p></section>" +
        "<section><h3>experience</h3>" +
          "<p><b>Software Engineering Intern</b> - New Ascent (May–Aug 2025)<br>" +
          "Worked on the ChipSat educational spacecraft: CircuitPython on a Raspberry Pi " +
          "RP2040, wrote a driver for the MS5607 pressure sensor (I2C), and a board-target " +
          "config (I2C addresses, SPI pins). Joined code reviews and pushed to the team GitLab.</p>" +
          "<p><b>Tennis Camp Counselor</b> - JCC (2024–2025)<br>" +
          "Helped lead groups of kids ages 7–13.</p>" +
        "</section>" +
        "<section><h3>languages &amp; awards</h3><ul>" +
          "<li>Russian - advanced (reading, writing, speaking)</li>" +
          "<li>🥇 Gold, Russian Olympiad - George Mason, 2025</li>" +
          "<li>🥈 Silver, Russian Essay Contest - Langley, 2024</li>" +
          "<li>🥇 Gold, Russian Olympiad - George Mason, 2026</li>" +
          "<li>🥈 Second Place student STEM - Inspire Her Future, 2026</li>" +
        "</ul></section>" +
      "</div>",
  },
  contact: {
    title: "~/contact",
    content:
      '<div class="app-contact">' +
        '<a class="contact-link" href="https://github.com/Hamstersarus" target="_blank" rel="noopener noreferrer">🐙 GitHub - @Hamstersarus</a>' +
        '<a class="contact-link" href="https://www.linkedin.com/in/ayla-vaynerman-216341373/" target="_blank" rel="noopener noreferrer">💼 LinkedIn - Ayla Vaynerman</a>' +
        '<a class="contact-link" href="mailto:ayla.vaynerman@gmail.com">✉️ ayla.vaynerman@gmail.com</a>' +
      "</div>",
  },

  notes: {
    title: "~/message",
    content: buildNotes, // a "message me" box that posts to Discord (js/apps/notes.js)
  },
  // advanced apps - content is a builder function (see js/apps/)
  music: {
    title: "~/music",
    content: buildMusicPlayer,
  },
  game: {
    title: "~/2048",
    content: buildGame2048,
  },
  gallery: {
    title: "~/gallery",
    content:
      '<div class="app-gallery">' +
        '<figure class="gallery-item">' +
          '<img class="gallery-photo" src="assets/images/chipsat.jpg" ' +
          'alt="A chipsat I worked on for the company New Ascent" />' +
          '<figcaption class="gallery-caption">A chipsat I worked on for the company New Ascent</figcaption>' +
        "</figure>" +
        '<figure class="gallery-item">' +
          '<img class="gallery-photo" src="assets/images/micropad.png" ' +
          'alt="a compact, USB-HID micropad intended for programmable shortcut input" />' +
          '<figcaption class="gallery-caption">a compact, USB-HID micropad intended for programmable shortcut input</figcaption>' +
        "</figure>" +
      "</div>",
  },
  fortune: {
    title: "~/hamster-ball",
    content: buildHamsterBall, // Magic Hamster Ball (js/apps/fortune.js)
  },
};

// Open an app by its icon id (called from os.js on double-click).
function openApp(appId) {
  const app = APPS[appId];
  if (!app) return;
  // content may be an HTML string, a DOM node, or a builder function
  const content = typeof app.content === "function" ? app.content() : app.content;
  createWindow({ id: appId, title: app.title, content });
}

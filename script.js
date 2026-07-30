document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Globe
  const globeContainer = document.getElementById('globeViz');
  const world = Globe()(globeContainer)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    .pointColor(() => '#8B5CF6')
    .pointAltitude(0.05)
    .pointRadius(0.3)
    .pointResolution(32)
    .pointLabel('name'); // Tooltip

  // Setup Globe Lighting & Physics
  world.controls().autoRotate = true;
  world.controls().autoRotateSpeed = 0.5;
  world.controls().enableDamping = true;

  // 2. Load Data
  let studentData = [];
  try {
    const [studentsRes, teamRes, sessionsRes] = await Promise.all([
      fetch('students.json'),
      fetch('team.json'),
      fetch('sessions.json')
    ]);

    studentData = await studentsRes.json();
    const teamData = await teamRes.json();
    const sessionsData = await sessionsRes.json();

    // Normalize student coord keys: globe.gl expects `lat` and `lng`.
    studentData = studentData.map(s => ({
      ...s,
      lat: s.lat ?? s.latitude,
      lng: s.lng ?? s.longitude
    }));

    // Populate UI
    populateGlobe(studentData);
    populateTeam(teamData);
    populateSessions(sessionsData);
    setupSearch(studentData);

  } catch (error) {
    console.error("Error loading JSON data. Make sure you are running a local server.", error);
  }

  // 3. Globe Interaction Logic
  function populateGlobe(data) {
    world.pointsData(data)
      .onPointClick((point) => {
        // Stop rotation
        world.controls().autoRotate = false;
        
        // Fly to coordinate
        world.pointOfView({ lat: point.lat ?? point.latitude, lng: point.lng ?? point.longitude, altitude: 1.5 }, 1500);
        
        // Show Card
        showStudentCard(point);
      });
  }

  window.showStudentCard = function(student) {
    const card = document.getElementById('student-card');
    document.getElementById('card-img').src = student.image;
    document.getElementById('card-name').innerText = student.name;
    document.getElementById('card-profession').innerText = student.profession;
    document.getElementById('card-company').innerText = student.company;
    document.getElementById('card-location').innerText = student.location || '';
    document.getElementById('card-year').innerText = student.year || '';
    
    card.classList.remove('hidden');
    // small delay to allow CSS display:block to register before opacity transition
    setTimeout(() => card.classList.add('active'), 10);
  }

  window.closeStudentCard = function() {
    const card = document.getElementById('student-card');
    card.classList.remove('active');
    setTimeout(() => card.classList.add('hidden'), 400); // Wait for transition
    world.controls().autoRotate = true; // Resume rotation
  }

  // 4. Search Functionality
  function setupSearch(data) {
    const searchInput = document.getElementById('studentSearch');
    const resultsList = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      resultsList.innerHTML = '';
      
      if (!query) {
        resultsList.classList.add('hidden');
        return;
      }

      const matches = data.filter(s => {
        const name = (s.name || '').toLowerCase();
        const location = (s.location || '').toLowerCase();
        return name.includes(query) || location.includes(query);
      }).slice(0, 5);

      if (matches.length > 0) {
        resultsList.classList.remove('hidden');
        matches.forEach(match => {
          const li = document.createElement('li');
          li.innerText = `${match.name} - ${match.location}`;
          li.onclick = () => {
            searchInput.value = '';
            resultsList.classList.add('hidden');
            world.pointOfView({ lat: match.lat ?? match.latitude, lng: match.lng ?? match.longitude, altitude: 1.5 }, 1500);
            showStudentCard(match);
          };
          resultsList.appendChild(li);
        });
      } else {
        resultsList.classList.add('hidden');
      }
    });
  }

  // 5. Populate Grids (Team & Sessions)
  function populateTeam(data) {
    const grid = document.getElementById('team-grid');
    data.forEach(member => {
      grid.innerHTML += `
        <div class="card glass-panel">
          <img src="${member.image}" alt="${member.name}" class="team-img">
          <h3>${member.name}</h3>
          <p class="accent-text">${member.role}</p>
          <p style="font-size: 14px; margin-top: 10px; color: var(--text-secondary)">${member.bio}</p>
        </div>
      `;
    });
  }

  function populateSessions(data) {
    const grid = document.getElementById('sessions-grid');
    data.forEach(session => {
      grid.innerHTML += `
        <div class="card glass-panel">
          <div class="session-thumb"></div> <h3>${session.title}</h3>
          <p style="font-size: 14px; color: var(--text-secondary); margin-top: 5px;">${session.speaker} • ${session.date}</p>
        </div>
      `;
    });
  }

  // Handle Resize
  window.addEventListener('resize', () => {
    world.width(window.innerWidth).height(window.innerHeight);
  });
});
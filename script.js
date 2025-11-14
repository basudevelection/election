// ========================================
// script.js – FINAL FIXED VERSION
// ========================================

const ADMIN_EMAIL = 'admin@election.com';
let currentElection = null;
let currentVoter = null;
let nepalData = [];

// ========================================
// UTILS
// ========================================
const getUrlParam = (name) => new URLSearchParams(location.search).get(name);

const showMsg = (id, msg, type = 'success') => {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `<div class="${type}">${msg}</div>`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  }
};

function generateVoterId() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function calculateAge(dob) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB');
}

// ========================================
// NEPAL DATA LOADER
// ========================================
fetch('nepal-data.json')
  .then(response => {
    if (!response.ok) throw new Error('Failed to load nepal-data.json');
    return response.json();
  })
  .then(data => {
    nepalData = data.provinceList;
    console.log('Nepal data loaded:', nepalData.length, 'provinces');
    if (typeof populateProvinces === 'function') populateProvinces();
  })
  .catch(err => {
    console.error('JSON Load Error:', err);
    showMsg('msg', 'Failed to load location data. Check nepal-data.json', 'error');
  });

// ========================================
// LOCATION SELECT LOGIC
// ========================================
function populateProvinces() {
  const select = document.getElementById('province');
  if (!select || nepalData.length === 0) return;

  select.innerHTML = '<option value="">Select Province</option>';
  nepalData.forEach(p => {
    select.add(new Option(p.name, p.id));
  });
}

function populateDistricts() {
  const provinceId = document.getElementById('province')?.value;
  const districtSelect = document.getElementById('district');
  const municipalitySelect = document.getElementById('municipality');

  if (!districtSelect || !municipalitySelect) return;

  districtSelect.innerHTML = '<option value="">Select District</option>';
  municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';

  if (!provinceId) return;

  const province = nepalData.find(p => p.id == provinceId);
  if (!province) return;

  province.districtList.forEach(d => {
    districtSelect.add(new Option(d.name, d.id));
  });
}

function populateMunicipalities() {
  const districtId = document.getElementById('district')?.value;
  const municipalitySelect = document.getElementById('municipality');
  if (!municipalitySelect || !districtId) {
    municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
    return;
  }

  let district;
  for (let province of nepalData) {
    district = province.districtList.find(d => d.id == districtId);
    if (district) break;
  }

  if (!district) return;

  municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
  district.municipalityList.forEach(m => {
    municipalitySelect.add(new Option(m.name, m.id));
  });
}

// ========================================
// ELECTION PAGE LOGIC
// ========================================
async function loadElection() {
  const eid = getUrlParam('eid');
  if (!eid) {
    window.location.href = 'index.html';
    return;
  }

  const { data, error } = await supabase
    .from('elections')
    .select('id, name, start_date, nomination_end, voting_end, status')
    .eq('id', eid)
    .single();

  if (error || !data) {
    showMsg('msg', 'Election not found or invalid ID', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }

  currentElection = data;
  document.title = data.name;
  const nameEl = document.getElementById('electionName');
  if (nameEl) nameEl.textContent = data.name;

  updateElectionStatus();
  loadCandidates();
}

function updateElectionStatus() {
  if (!currentElection) return;

  const now = new Date();
  const start = new Date(currentElection.start_date);
  const end = new Date(currentElection.voting_end);
  const nom = new Date(currentElection.nomination_end);

  let status = 'upcoming';
  if (now >= start && now <= end) status = 'active';
  else if (now > end) status = 'ended';

  // Show/hide sections
  document.querySelectorAll('.nomination-only').forEach(el => {
    el.style.display = now < nom ? 'block' : 'none';
  });
  document.querySelectorAll('.voting-only').forEach(el => {
    el.style.display = status === 'active' ? 'block' : 'none';
  });
  document.querySelectorAll('.result-only').forEach(el => {
    el.style.display = status === 'ended' ? 'block' : 'none';
  });

  const statusEl = document.getElementById('electionStatus');
  if (statusEl) {
    statusEl.textContent = status.toUpperCase();
    statusEl.style.color = status === 'active' ? 'green' : status === 'ended' ? 'gray' : 'orange';
  }
}

async function loadCandidates() {
  if (!currentElection) return;

  const { data, error } = await supabase
    .from('candidates')
    .select('id, name, party, symbol')
    .eq('election_id', currentElection.id)
    .order('name');

  if (error || !data || data.length === 0) {
    document.getElementById('candidateList')?.innerHTML = '<p>No candidates registered yet.</p>';
    return;
  }

  const list = document.getElementById('candidateList');
  if (!list) return;

  list.innerHTML = data.map(c => `
    <div class="candidate-card" onclick="selectCandidate('${c.id}', this)">
      <strong>${c.name}</strong><br>
      <small>${c.party || 'Independent'}</small>
    </div>
  `).join('');
}

// ========================================
// VOTING LOGIC
// ========================================
let selectedCandidateId = null;

function selectCandidate(id, el) {
  document.querySelectorAll('.candidate-card').forEach(card => {
    card.style.border = '2px solid #ddd';
    card.style.background = '#fff';
  });
  el.style.border = '3px solid #1d4ed8';
  el.style.background = '#eff6ff';
  selectedCandidateId = id;
}

async function submitVote() {
  if (!selectedCandidateId) {
    alert('Please select a candidate');
    return;
  }

  const voterId = localStorage.getItem('voterId');
  if (!voterId) {
    alert('Voter not verified');
    return;
  }

  const { error } = await supabase
    .from('votes')
    .insert({
      election_id: currentElection.id,
      voter_id: voterId,
      candidate_id: selectedCandidateId
    });

  if (error) {
    if (error.message.includes('duplicate')) {
      alert('You have already voted in this election.');
    } else {
      alert('Vote failed: ' + error.message);
    }
  } else {
    alert('Vote cast successfully!');
    localStorage.removeItem('voterId');
    setTimeout(() => { window.location.href = 'thank-you.html'; }, 1000);
  }
}

// ========================================
// AUTO-INIT
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  const provinceEl = document.getElementById('province');
  const districtEl = document.getElementById('district');

  if (provinceEl) provinceEl.addEventListener('change', populateDistricts);
  if (districtEl) districtEl.addEventListener('change', populateMunicipalities);

  if (document.getElementById('electionName')) {
    loadElection();
    setInterval(updateElectionStatus, 10000);
  }
});

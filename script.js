let nepalData = [];
let currentElection = null;

fetch('nepal-data.json')
  .then(r => r.json())
  .then(d => nepalData = d.provinceList);

function getUrlParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function showMsg(id, msg, type = 'success') {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `<div class="${type}">${msg}</div>`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
  }
}

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

function populateProvinces() {
  const select = document.getElementById('province');
  if (!select || nepalData.length === 0) return;
  select.innerHTML = '<option value="">Select Province</option>';
  nepalData.forEach(p => select.add(new Option(p.name, p.id)));
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
  province.districtList.forEach(d => districtSelect.add(new Option(d.name, d.id)));
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
  district.municipalityList.forEach(m => municipalitySelect.add(new Option(m.name, m.id)));
}

async function loadElection() {
  const eid = getUrlParam('eid');
  if (!eid) {
    showError('Missing election ID in URL');
    setTimeout(() => location.href = 'index.html', 2000);
    return;
  }
  try {
    const { data, error } = await supabase
      .from('elections')
      .select('id, name, start_date, nomination_end, voting_end, status')
      .eq('id', eid)
      .single();
    if (error || !data) {
      showError('Election not found');
      return;
    }
    currentElection = data;
    document.title = data.name + ' - Election';
    const nameEl = document.getElementById('electionName');
    if (nameEl) nameEl.textContent = data.name;
    updateElectionStatus();
    setInterval(updateElectionStatus, 10000);
  } catch (err) {
    console.error('Load error:', err);
    showError('Network error');
  }
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
  const statusEl = document.getElementById('electionStatus');
  if (statusEl) {
    statusEl.textContent = status.toUpperCase();
    statusEl.style.color = status === 'active' ? '#16a34a' : status === 'ended' ? '#6b7280' : '#ea580c';
  }
  document.querySelectorAll('.nomination-only').forEach(el => {
    el.classList.toggle('hidden', now >= nom);
  });
  document.querySelectorAll('.voting-only').forEach(el => {
    el.classList.toggle('hidden', status !== 'active');
  });
  document.querySelectorAll('.result-only').forEach(el => {
    el.classList.toggle('hidden', status !== 'ended');
  });
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
  console.error('Error:', msg);
}

async function registerVoter() {
  const eid = getUrlParam('eid');
  const voterId = generateVoterId();
  const location = {
    province: document.getElementById('province').options[document.getElementById('province').selectedIndex].text,
    district: document.getElementById('district').options[document.getElementById('district').selectedIndex].text,
    municipality: document.getElementById('municipality').options[document.getElementById('municipality').selectedIndex].text,
    tole: document.getElementById('tole').value
  };
  const { error } = await supabase.from('voters').insert({
    election_id: eid,
    voter_id: voterId,
    full_name: document.getElementById('fullName').value,
    birth_date: document.getElementById('dob').value,
    family: { 
      father: document.getElementById('fatherName').value, 
      mother: document.getElementById('motherName').value 
    },
    location,
    citizenship_no: document.getElementById('citizenshipNo').value,
    citizenship_issue_date: document.getElementById('issueDate').value
  });
  if (error) return showMsg('msg', error.message, 'error');
  showMsg('msg', `Voter ID: <strong>${voterId}</strong><br>Save it securely!`, 'success');
}

async function registerCandidate() {
  const eid = getUrlParam('eid');
  const location = {
    province: document.getElementById('province').options[document.getElementById('province').selectedIndex].text,
    district: document.getElementById('district').options[document.getElementById('district').selectedIndex].text,
    municipality: document.getElementById('municipality').options[document.getElementById('municipality').selectedIndex].text,
    tole: document.getElementById('tole').value
  };
  const { error } = await supabase.from('candidates').insert({
    election_id: eid,
    full_name: document.getElementById('fullName').value,
    dob: document.getElementById('dob').value,
    gender: document.getElementById('gender').value,
    marital: document.getElementById('marital').value,
    contact: document.getElementById('contact').value,
    email: document.getElementById('email').value,
    location,
    highest_qual: document.getElementById('highestQual').value,
    institution: document.getElementById('institution').value,
    year_completion: parseInt(document.getElementById('yearCompletion').value),
    prof_exp: document.getElementById('profExp').value,
    occupation: document.getElementById('occupation').value,
    skills: document.getElementById('skills').value,
    party: document.getElementById('party').value,
    position_contested: document.getElementById('position').value,
    ward_const: document.getElementById('wardConst').value,
    prev_roles: document.getElementById('prevRoles').value,
    manifesto: document.getElementById('manifesto').value,
    motto: document.getElementById('motto').value,
    citizenship_no: document.getElementById('citizenshipNo').value,
    pan_id: document.getElementById('panId').value,
    criminal_record: document.getElementById('criminalRecord').value,
    nomination_date: document.getElementById('nominationDate').value,
    budget: parseInt(document.getElementById('budget').value),
    funding_source: document.getElementById('fundingSource').value,
    bank_acct: document.getElementById('bankAcct').value,
    auditor: document.getElementById('auditor').value,
    fb: document.getElementById('fb').value,
    twitter: document.getElementById('twitter').value,
    website: document.getElementById('website').value,
    youtube: document.getElementById('youtube').value,
    volunteer_info: document.getElementById('volunteerInfo').value,
    hobbies: document.getElementById('hobbies').value,
    achievements: document.getElementById('achievements').value,
    vision: document.getElementById('vision').value
  });
  if (error) return showMsg('msg', error.message, 'error');
  showMsg('msg', 'Candidate registered! Pending admin approval.', 'success');
}

async function checkEligibility() {
  const vid = document.getElementById('voterId').value.trim();
  if (vid.length !== 10 || !/^\d+$/.test(vid)) {
    return showMsg('msg', 'Please enter a valid 10-digit Voter ID', 'error');
  }
  const { data, error } = await supabase
    .from('voters')
    .select('birth_date, approved')
    .eq('voter_id', vid)
    .eq('election_id', getUrlParam('eid'))
    .single();
  if (error || !data) {
    return showMsg('msg', 'Voter ID not found or invalid election', 'error');
  }
  const age = calculateAge(data.birth_date);
  if (age >= 18 && data.approved) {
    showMsg('msg', `✅ Eligible! You are ${age} years old.`, 'success');
  } else {
    showMsg('msg', `❌ Not eligible. Age: ${age} (must be 18+) or pending approval`, 'error');
  }
}

async function findVoterId() {
  const citizenshipNo = document.getElementById('citizenshipNo').value.trim();
  const dob = document.getElementById('dob').value;
  if (!citizenshipNo || !dob) {
    return showMsg('msg', 'Please fill all fields', 'error');
  }
  const { data, error } = await supabase
    .from('voters')
    .select('voter_id, full_name')
    .eq('citizenship_no', citizenshipNo)
    .eq('birth_date', dob)
    .eq('election_id', getUrlParam('eid'))
    .single();
  if (error || !data) {
    return showMsg('msg', 'No voter found with this citizenship and DOB', 'error');
  }
  showMsg('msg', `Voter ID: <strong>${data.voter_id}</strong><br>Name: ${data.full_name}`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  const province = document.getElementById('province');
  const district = document.getElementById('district');
  if (province) province.addEventListener('change', populateDistricts);
  if (district) district.addEventListener('change', populateMunicipalities);
});

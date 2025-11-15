let nepalData = [];
let currentElection = null;
const ADMIN_EMAIL = 'admin@election.com';
const ITEMS_PER_PAGE = 10;
let currentPage = { elections: 1, voters: 1, candidates: 1, votes: 1, audit: 1 };

fetch('nepal-data.json')
  .then(r => r.json())
  .then(d => nepalData = d.provinceList)
  .catch(err => console.error('Failed to load nepal-data.json:', err));

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
  if (!municipalitySelect || !districtId) return;
  municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
  let district;
  for (let province of nepalData) {
    district = province.districtList.find(d => d.id == districtId);
    if (district) break;
  }
  if (!district) return;
  district.municipalityList.forEach(m => municipalitySelect.add(new Option(m.name, m.id)));
}

async function loadElection() {
  const eid = getUrlParam('eid');
  if (!eid) {
    showMsg('errorMsg', 'Missing election ID', 'error');
    setTimeout(() => location.href = 'index.html', 2000);
    return;
  }
  try {
    const { data, error } = await supabase
      .from('elections')
      .select('id, name, start_date, nomination_end, voting_end, status')
      .eq('id', eid)
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Election not found');
    currentElection = data;
    document.title = data.name + ' - Election';
    const nameEl = document.getElementById('electionName');
    if (nameEl) nameEl.textContent = data.name;
    updateElectionStatus();
    setInterval(updateElectionStatus, 60000);
  } catch (err) {
    console.error('Load election error:', err);
    showMsg('errorMsg', `Error loading election: ${err.message}`, 'error');
  }
}

function updateElectionStatus() {
  if (!currentElection) return;
  const now = new Date();
  const start = new Date(currentElection.start_date);
  const end = new Date(currentElection.voting_end);
  const nomEnd = new Date(currentElection.nomination_end);
  let status = 'upcoming';
  if (now >= start && now <= end) status = 'active';
  else if (now > end) status = 'ended';
  const statusEl = document.getElementById('electionStatus');
  if (statusEl) {
    statusEl.textContent = status.toUpperCase();
    statusEl.style.color = status === 'active' ? '#16a34a' : status === 'ended' ? '#6b7280' : '#ea580c';
  }
  document.querySelectorAll('.nomination-only').forEach(el => {
    el.classList.toggle('hidden', now >= nomEnd);
  });
  document.querySelectorAll('.voting-only').forEach(el => {
    el.classList.toggle('hidden', status !== 'active');
  });
  document.querySelectorAll('.result-only').forEach(el => {
    el.classList.toggle('hidden', status !== 'ended');
  });
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
  try {
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
    if (error) throw new Error(error.message);
    showMsg('msg', `Voter ID: <strong>${voterId}</strong><br>Save it securely!`, 'success');
    logAudit('register_voter', 'voters', null, { voter_id: voterId });
  } catch (err) {
    console.error('Register voter error:', err);
    showMsg('msg', `Error registering voter: ${err.message}`, 'error');
  }
}

async function registerCandidate() {
  const eid = getUrlParam('eid');
  const location = {
    province: document.getElementById('province').options[document.getElementById('province').selectedIndex].text,
    district: document.getElementById('district').options[document.getElementById('district').selectedIndex].text,
    municipality: document.getElementById('municipality').options[document.getElementById('municipality').selectedIndex].text,
    tole: document.getElementById('tole').value
  };
  try {
    const { data, error } = await supabase.from('candidates').insert({
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
    }).select('id');
    if (error) throw new Error(error.message);
    showMsg('msg', 'Candidate registered. Awaiting admin approval.', 'success');
    logAudit('register_candidate', 'candidates', data[0].id, { name: document.getElementById('fullName').value });
  } catch (err) {
    console.error('Register candidate error:', err);
    showMsg('msg', `Error registering candidate: ${err.message}`, 'error');
  }
}

async function checkEligibility() {
  const vid = document.getElementById('voterId').value.trim();
  if (vid.length !== 10 || !/^\d+$/.test(vid)) {
    return showMsg('msg', 'Please enter a valid 10-digit Voter ID', 'error');
  }
  try {
    const { data, error } = await supabase
      .from('voters')
      .select('birth_date, approved')
      .eq('voter_id', vid)
      .eq('election_id', getUrlParam('eid'))
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Voter ID not found');
    const age = calculateAge(data.birth_date);
    if (age >= 18 && data.approved) {
      showMsg('msg', `✅ Eligible! You are ${age} years old and approved to vote.`, 'success');
    } else {
      showMsg('msg', `❌ Not eligible. Age: ${age} (must be 18+) or not approved`, 'error');
    }
  } catch (err) {
    console.error('Check eligibility error:', err);
    showMsg('msg', `Error checking eligibility: ${err.message}`, 'error');
  }
}

async function findVoterId() {
  const citizenshipNo = document.getElementById('citizenshipNo').value.trim();
  const dob = document.getElementById('dob').value;
  if (!citizenshipNo || !dob) {
    return showMsg('msg', 'Please fill all fields', 'error');
  }
  try {
    const { data, error } = await supabase
      .from('voters')
      .select('voter_id, full_name')
      .eq('citizenship_no', citizenshipNo)
      .eq('birth_date', dob)
      .eq('election_id', getUrlParam('eid'))
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('No voter found');
    showMsg('msg', `Voter ID: <strong>${data.voter_id}</strong><br>Name: ${data.full_name}`, 'success');
  } catch (err) {
    console.error('Find voter ID error:', err);
    showMsg('msg', `Error finding voter ID: ${err.message}`, 'error');
  }
}

function checkAdminAuth() {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken || !adminToken.startsWith('admin-auth-')) {
    location.href = 'admin-login.html';
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  location.href = 'admin-login.html';
}

async function logAudit(action, entity_type, entity_id, details) {
  try {
    await supabase.from('audit_log').insert({
      admin_email: ADMIN_EMAIL,
      action,
      entity_type,
      entity_id,
      details
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

async function loadAdminData() {
  try {
    await Promise.all([
      loadElectionsAdmin(),
      loadVotersAdmin(),
      loadCandidatesAdmin(),
      loadVotesAdmin(),
      loadResultsAdmin(),
      loadAuditLog()
    ]);
  } catch (err) {
    console.error('Load admin data error:', err);
    showMsg('electionMsg', `Error loading admin data: ${err.message}`, 'error');
  }
}

function openAdminTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  document.querySelector(`button[onclick="openAdminTab('${tabName}')"]`).classList.add('active');
}

async function loadElectionsAdmin() {
  try {
    const { data } = await supabase.from('elections').select('*').order('created_at', { ascending: false });
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const start = (currentPage.elections - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    document.getElementById('electionsTable').innerHTML = data.length === 0
      ? '<tr><td colspan="7">No elections found.</td></tr>'
      : data.slice(start, end).map(e => `
        <tr>
          <td>${e.name}</td>
          <td>${formatDate(e.start_date)}</td>
          <td>${formatDate(e.nomination_end)}</td>
          <td>${formatDate(e.voting_end)}</td>
          <td>${e.status}</td>
          <td><button class="admin-btn view-btn" onclick="viewElectionStats('${e.id}')">View Stats</button></td>
          <td>
            <button class="admin-btn edit-btn" onclick="editElection('${e.id}')">Edit</button>
            <button class="admin-btn delete-btn" onclick="deleteElection('${e.id}')">Delete</button>
          </td>
        </tr>
      `).join('');
    updatePagination('electionsPagination', totalPages, 'elections', loadElectionsAdmin);
  } catch (err) {
    console.error('Load elections admin error:', err);
    document.getElementById('electionsTable').innerHTML = '<tr><td colspan="7">Failed to load elections.</td></tr>';
    showMsg('electionMsg', `Error loading elections: ${err.message}`, 'error');
  }
}

async function createElection() {
  const name = document.getElementById('newElectionName')?.value.trim();
  const start = document.getElementById('newStartDate')?.value;
  const nom = document.getElementById('newNomEnd')?.value;
  const vote = document.getElementById('newVoteEnd')?.value;
  if (!name || !start || !nom || !vote) {
    return showMsg('electionMsg', 'Please fill all fields', 'error');
  }
  const startDate = new Date(start);
  const nomDate = new Date(nom);
  const voteDate = new Date(vote);
  if (isNaN(startDate) || isNaN(nomDate) || isNaN(voteDate)) {
    return showMsg('electionMsg', 'Invalid date format', 'error');
  }
  if (nomDate >= startDate || voteDate <= startDate) {
    return showMsg('electionMsg', 'Nomination end must be before start date, and voting end must be after start date', 'error');
  }
  try {
    const { data, error } = await supabase.from('elections').insert({
      name,
      start_date: start,
      nomination_end: nom,
      voting_end: vote,
      status: 'upcoming'
    }).select('id');
    if (error) throw new Error(error.message);
    showMsg('electionMsg', 'Election created successfully', 'success');
    document.getElementById('newElectionName').value = '';
    document.getElementById('newStartDate').value = '';
    document.getElementById('newNomEnd').value = '';
    document.getElementById('newVoteEnd').value = '';
    logAudit('create_election', 'elections', data[0].id, { name });
    await loadElectionsAdmin();
  } catch (err) {
    console.error('Create election error:', err);
    showMsg('electionMsg', `Error creating election: ${err.message}`, 'error');
  }
}

async function editElection(id) {
  const name = prompt('New election name:');
  if (!name) return;
  try {
    const { error } = await supabase.from('elections').update({ name }).eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('edit_election', 'elections', id, { name });
    await loadElectionsAdmin();
  } catch (err) {
    console.error('Edit election error:', err);
    showMsg('electionMsg', `Error editing election: ${err.message}`, 'error');
  }
}

async function deleteElection(id) {
  if (!confirm('Delete election and all related data?')) return;
  try {
    await supabase.from('votes').delete().eq('election_id', id);
    await supabase.from('candidates').delete().eq('election_id', id);
    await supabase.from('voters').delete().eq('election_id', id);
    const { error } = await supabase.from('elections').delete().eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('delete_election', 'elections', id, {});
    await loadElectionsAdmin();
  } catch (err) {
    console.error('Delete election error:', err);
    showMsg('electionMsg', `Error deleting election: ${err.message}`, 'error');
  }
}

async function viewElectionStats(id) {
  try {
    const { data: election } = await supabase.from('elections').select('name').eq('id', id).single();
    const { count: voterCount } = await supabase.from('voters').select('*', { count: 'exact' }).eq('election_id', id);
    const { count: candidateCount } = await supabase.from('candidates').select('*', { count: 'exact' }).eq('election_id', id);
    const { count: voteCount } = await supabase.from('votes').select('*', { count: 'exact' }).eq('election_id', id);
    document.getElementById('modalContent').innerHTML = `
      <h2>${election.name} Stats</h2>
      <p><strong>Total Voters:</strong> ${voterCount}</p>
      <p><strong>Total Candidates:</strong> ${candidateCount}</p>
      <p><strong>Total Votes Cast:</strong> ${voteCount}</p>
      <p><strong>Turnout:</strong> ${voterCount ? ((voteCount / voterCount) * 100).toFixed(2) : 0}%</p>
    `;
    document.getElementById('modal').style.display = 'block';
  } catch (err) {
    console.error('View election stats error:', err);
    showMsg('electionMsg', `Error viewing stats: ${err.message}`, 'error');
  }
}

async function loadVotersAdmin() {
  try {
    const { data } = await supabase.from('voters').select('*').order('created_at', { ascending: false });
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const start = (currentPage.voters - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    document.getElementById('votersTable').innerHTML = data.length === 0
      ? '<tr><td colspan="7">No voters found.</td></tr>'
      : data.slice(start, end).map(v => `
        <tr>
          <td><input type="checkbox" class="voterSelect" value="${v.id}"></td>
          <td>${v.full_name}</td>
          <td>${v.voter_id}</td>
          <td>${formatDate(v.birth_date)}</td>
          <td>${v.citizenship_no}</td>
          <td>${v.approved ? 'Yes' : 'No'}</td>
          <td>
            <button class="admin-btn ${v.approved ? 'delete-btn' : 'approve-btn'}" onclick="${v.approved ? 'unapproveVoter' : 'approveVoter'}('${v.id}')">
              ${v.approved ? 'Unapprove' : 'Approve'}
            </button>
            <button class="admin-btn delete-btn" onclick="deleteVoter('${v.id}')">Delete</button>
            <button class="admin-btn view-btn" onclick="viewVoterDetails('${v.id}')">View</button>
          </td>
        </tr>
      `).join('');
    updatePagination('votersPagination', totalPages, 'voters', loadVotersAdmin);
  } catch (err) {
    console.error('Load voters admin error:', err);
    document.getElementById('votersTable').innerHTML = '<tr><td colspan="7">Failed to load voters.</td></tr>';
    showMsg('voterMsg', `Error loading voters: ${err.message}`, 'error');
  }
}

async function approveVoter(id) {
  try {
    const { error } = await supabase.from('voters').update({ approved: true }).eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('approve_voter', 'voters', id, {});
    await loadVotersAdmin();
  } catch (err) {
    console.error('Approve voter error:', err);
    showMsg('voterMsg', `Error approving voter: ${err.message}`, 'error');
  }
}

async function unapproveVoter(id) {
  try {
    const { error } = await supabase.from('voters').update({ approved: false }).eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('unapprove_voter', 'voters', id, {});
    await loadVotersAdmin();
  } catch (err) {
    console.error('Unapprove voter error:', err);
    showMsg('voterMsg', `Error unapproving voter: ${err.message}`, 'error');
  }
}

async function deleteVoter(id) {
  if (!confirm('Delete voter?')) return;
  try {
    const { error } = await supabase.from('voters').delete().eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('delete_voter', 'voters', id, {});
    await loadVotersAdmin();
  } catch (err) {
    console.error('Delete voter error:', err);
    showMsg('voterMsg', `Error deleting voter: ${err.message}`, 'error');
  }
}

async function bulkApproveVoters() {
  const selected = Array.from(document.querySelectorAll('.voterSelect:checked')).map(cb => cb.value);
  if (!selected.length) return showMsg('voterMsg', 'No voters selected', 'error');
  try {
    const { error } = await supabase.from('voters').update({ approved: true }).in('id', selected);
    if (error) throw new Error(error.message);
    logAudit('bulk_approve_voters', 'voters', null, { count: selected.length });
    await loadVotersAdmin();
  } catch (err) {
    console.error('Bulk approve voters error:', err);
    showMsg('voterMsg', `Error bulk approving voters: ${err.message}`, 'error');
  }
}

async function bulkDeleteVoters() {
  const selected = Array.from(document.querySelectorAll('.voterSelect:checked')).map(cb => cb.value);
  if (!selected.length) return showMsg('voterMsg', 'No voters selected', 'error');
  if (!confirm(`Delete ${selected.length} voters?`)) return;
  try {
    const { error } = await supabase.from('voters').delete().in('id', selected);
    if (error) throw new Error(error.message);
    logAudit('bulk_delete_voters', 'voters', null, { count: selected.length });
    await loadVotersAdmin();
  } catch (err) {
    console.error('Bulk delete voters error:', err);
    showMsg('voterMsg', `Error bulk deleting voters: ${err.message}`, 'error');
  }
}

async function viewVoterDetails(id) {
  try {
    const { data } = await supabase.from('voters').select('*').eq('id', id).single();
    document.getElementById('modalContent').innerHTML = `
      <h2>Voter Details</h2>
      <p><strong>Name:</strong> ${data.full_name}</p>
      <p><strong>Voter ID:</strong> ${data.voter_id}</p>
      <p><strong>DOB:</strong> ${formatDate(data.birth_date)}</p>
      <p><strong>Citizenship:</strong> ${data.citizenship_no}</p>
      <p><strong>Citizenship Issue Date:</strong> ${formatDate(data.citizenship_issue_date)}</p>
      <p><strong>Location:</strong> ${data.location.municipality}, ${data.location.district}, ${data.location.province}, ${data.location.tole}</p>
      <p><strong>Family:</strong> Father: ${data.family?.father || 'N/A'}, Mother: ${data.family?.mother || 'N/A'}</p>
      <p><strong>Approved:</strong> ${data.approved ? 'Yes' : 'No'}</p>
    `;
    document.getElementById('modal').style.display = 'block';
  } catch (err) {
    console.error('View voter details error:', err);
    showMsg('voterMsg', `Error viewing voter details: ${err.message}`, 'error');
  }
}

async function searchVoters() {
  const query = document.getElementById('voterSearch').value.toLowerCase();
  try {
    const { data } = await supabase.from('voters').select('*').order('created_at', { ascending: false });
    const filtered = data.filter(v => v.full_name.toLowerCase().includes(query) || v.voter_id.includes(query));
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage.voters - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    document.getElementById('votersTable').innerHTML = filtered.length === 0
      ? '<tr><td colspan="7">No voters found.</td></tr>'
      : filtered.slice(start, end).map(v => `
        <tr>
          <td><input type="checkbox" class="voterSelect" value="${v.id}"></td>
          <td>${v.full_name}</td>
          <td>${v.voter_id}</td>
          <td>${formatDate(v.birth_date)}</td>
          <td>${v.citizenship_no}</td>
          <td>${v.approved ? 'Yes' : 'No'}</td>
          <td>
            <button class="admin-btn ${v.approved ? 'delete-btn' : 'approve-btn'}" onclick="${v.approved ? 'unapproveVoter' : 'approveVoter'}('${v.id}')">
              ${v.approved ? 'Unapprove' : 'Approve'}
            </button>
            <button class="admin-btn delete-btn" onclick="deleteVoter('${v.id}')">Delete</button>
            <button class="admin-btn view-btn" onclick="viewVoterDetails('${v.id}')">View</button>
          </td>
        </tr>
      `).join('');
    updatePagination('votersPagination', totalPages, 'voters', loadVotersAdmin);
  } catch (err) {
    console.error('Search voters error:', err);
    document.getElementById('votersTable').innerHTML = '<tr><td colspan="7">Failed to search voters.</td></tr>';
    showMsg('voterMsg', `Error searching voters: ${err.message}`, 'error');
  }
}

async function loadCandidatesAdmin() {
  try {
    const { data } = await supabase.from('candidates').select('*').order('created_at', { ascending: false });
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const start = (currentPage.candidates - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    document.getElementById('candidatesTable').innerHTML = data.length === 0
      ? '<tr><td colspan="6">No candidates found.</td></tr>'
      : data.slice(start, end).map(c => `
        <tr>
          <td><input type="checkbox" class="candidateSelect" value="${c.id}"></td>
          <td>${c.full_name}</td>
          <td>${c.party}</td>
          <td>${c.position_contested}</td>
          <td>${c.approved ? 'Yes' : 'No'}</td>
          <td>
            <button class="admin-btn ${c.approved ? 'delete-btn' : 'approve-btn'}" onclick="${c.approved ? 'unapproveCandidate' : 'approveCandidate'}('${c.id}')">
              ${c.approved ? 'Unapprove' : 'Approve'}
            </button>
            <button class="admin-btn delete-btn" onclick="deleteCandidate('${c.id}')">Delete</button>
            <button class="admin-btn view-btn" onclick="viewCandidateDetails('${c.id}')">View</button>
          </td>
        </tr>
      `).join('');
    updatePagination('candidatesPagination', totalPages, 'candidates', loadCandidatesAdmin);
  } catch (err) {
    console.error('Load candidates admin error:', err);
    document.getElementById('candidatesTable').innerHTML = '<tr><td colspan="6">Failed to load candidates.</td></tr>';
    showMsg('candidateMsg', `Error loading candidates: ${err.message}`, 'error');
  }
}

async function approveCandidate(id) {
  try {
    const { error } = await supabase.from('candidates').update({ approved: true }).eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('approve_candidate', 'candidates', id, {});
    await loadCandidatesAdmin();
  } catch (err) {
    console.error('Approve candidate error:', err);
    showMsg('candidateMsg', `Error approving candidate: ${err.message}`, 'error');
  }
}

async function unapproveCandidate(id) {
  try {
    const { error } = await supabase.from('candidates').update({ approved: false }).eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('unapprove_candidate', 'candidates', id, {});
    await loadCandidatesAdmin();
  } catch (err) {
    console.error('Unapprove candidate error:', err);
    showMsg('candidateMsg', `Error unapproving candidate: ${err.message}`, 'error');
  }
}

async function deleteCandidate(id) {
  if (!confirm('Delete candidate?')) return;
  try {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('delete_candidate', 'candidates', id, {});
    await loadCandidatesAdmin();
  } catch (err) {
    console.error('Delete candidate error:', err);
    showMsg('candidateMsg', `Error deleting candidate: ${err.message}`, 'error');
  }
}

async function bulkApproveCandidates() {
  const selected = Array.from(document.querySelectorAll('.candidateSelect:checked')).map(cb => cb.value);
  if (!selected.length) return showMsg('candidateMsg', 'No candidates selected', 'error');
  try {
    const { error } = await supabase.from('candidates').update({ approved: true }).in('id', selected);
    if (error) throw new Error(error.message);
    logAudit('bulk_approve_candidates', 'candidates', null, { count: selected.length });
    await loadCandidatesAdmin();
  } catch (err) {
    console.error('Bulk approve candidates error:', err);
    showMsg('candidateMsg', `Error bulk approving candidates: ${err.message}`, 'error');
  }
}

async function bulkDeleteCandidates() {
  const selected = Array.from(document.querySelectorAll('.candidateSelect:checked')).map(cb => cb.value);
  if (!selected.length) return showMsg('candidateMsg', 'No candidates selected', 'error');
  if (!confirm(`Delete ${selected.length} candidates?`)) return;
  try {
    const { error } = await supabase.from('candidates').delete().in('id', selected);
    if (error) throw new Error(error.message);
    logAudit('bulk_delete_candidates', 'candidates', null, { count: selected.length });
    await loadCandidatesAdmin();
  } catch (err) {
    console.error('Bulk delete candidates error:', err);
    showMsg('candidateMsg', `Error bulk deleting candidates: ${err.message}`, 'error');
  }
}

async function viewCandidateDetails(id) {
  try {
    const { data } = await supabase.from('candidates').select('*').eq('id', id).single();
    document.getElementById('modalContent').innerHTML = `
      <h2>Candidate Details</h2>
      <p><strong>Name:</strong> ${data.full_name}</p>
      <p><strong>Party:</strong> ${data.party}</p>
      <p><strong>Position:</strong> ${data.position_contested}</p>
      <p><strong>Ward/Constituency:</strong> ${data.ward_const}</p>
      <p><strong>DOB:</strong> ${formatDate(data.dob)}</p>
      <p><strong>Gender:</strong> ${data.gender}</p>
      <p><strong>Marital Status:</strong> ${data.marital}</p>
      <p><strong>Contact:</strong> ${data.contact}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Location:</strong> ${data.location.municipality}, ${data.location.district}, ${data.location.province}, ${data.location.tole}</p>
      <p><strong>Qualification:</strong> ${data.highest_qual} (${data.institution}, ${data.year_completion})</p>
      <p><strong>Experience:</strong> ${data.prof_exp}</p>
      <p><strong>Occupation:</strong> ${data.occupation}</p>
      <p><strong>Skills:</strong> ${data.skills}</p>
      <p><strong>Previous Roles:</strong> ${data.prev_roles || 'None'}</p>
      <p><strong>Manifesto:</strong> ${data.manifesto}</p>
      <p><strong>Motto:</strong> ${data.motto}</p>
      <p><strong>Citizenship:</strong> ${data.citizenship_no}</p>
      <p><strong>PAN ID:</strong> ${data.pan_id || 'N/A'}</p>
      <p><strong>Criminal Record:</strong> ${data.criminal_record}</p>
      <p><strong>Nomination Date:</strong> ${formatDate(data.nomination_date)}</p>
      <p><strong>Budget:</strong> ${data.budget}</p>
      <p><strong>Funding Source:</strong> ${data.funding_source}</p>
      <p><strong>Bank Account:</strong> ${data.bank_acct}</p>
      <p><strong>Auditor:</strong> ${data.auditor}</p>
      <p><strong>Social Media:</strong> 
        ${data.fb ? `<a href="${data.fb}" target="_blank">Facebook</a>` : 'N/A'}, 
        ${data.twitter ? `<a href="${data.twitter}" target="_blank">Twitter</a>` : 'N/A'}, 
        ${data.website ? `<a href="${data.website}" target="_blank">Website</a>` : 'N/A'}, 
        ${data.youtube ? `<a href="${data.youtube}" target="_blank">YouTube</a>` : 'N/A'}
      </p>
      <p><strong>Hobbies:</strong> ${data.hobbies || 'N/A'}</p>
      <p><strong>Achievements:</strong> ${data.achievements || 'N/A'}</p>
      <p><strong>Vision:</strong> ${data.vision}</p>
      <p><strong>Approved:</strong> ${data.approved ? 'Yes' : 'No'}</p>
    `;
    document.getElementById('modal').style.display = 'block';
  } catch (err) {
    console.error('View candidate details error:', err);
    showMsg('candidateMsg', `Error viewing candidate details: ${err.message}`, 'error');
  }
}

async function searchCandidates() {
  const query = document.getElementById('candidateSearch').value.toLowerCase();
  try {
    const { data } = await supabase.from('candidates').select('*').order('created_at', { ascending: false });
    const filtered = data.filter(c => c.full_name.toLowerCase().includes(query) || c.party.toLowerCase().includes(query));
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage.candidates - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    document.getElementById('candidatesTable').innerHTML = filtered.length === 0
      ? '<tr><td colspan="6">No candidates found.</td></tr>'
      : filtered.slice(start, end).map(c => `
        <tr>
          <td><input type="checkbox" class="candidateSelect" value="${c.id}"></td>
          <td>${c.full_name}</td>
          <td>${c.party}</td>
          <td>${c.position_contested}</td>
          <td>${c.approved ? 'Yes' : 'No'}</td>
          <td>
            <button class="admin-btn ${c.approved ? 'delete-btn' : 'approve-btn'}" onclick="${c.approved ? 'unapproveCandidate' : 'approveCandidate'}('${c.id}')">
              ${c.approved ? 'Unapprove' : 'Approve'}
            </button>
            <button class="admin-btn delete-btn" onclick="deleteCandidate('${c.id}')">Delete</button>
            <button class="admin-btn view-btn" onclick="viewCandidateDetails('${c.id}')">View</button>
          </td>
        </tr>
      `).join('');
    updatePagination('candidatesPagination', totalPages, 'candidates', loadCandidatesAdmin);
  } catch (err) {
    console.error('Search candidates error:', err);
    document.getElementById('candidatesTable').innerHTML = '<tr><td colspan="6">Failed to search candidates.</td></tr>';
    showMsg('candidateMsg', `Error searching candidates: ${err.message}`, 'error');
  }
}

async function loadVotesAdmin() {
  try {
    const { data } = await supabase.from('votes').select('*, candidates(full_name, party), voters(full_name)').order('created_at', { ascending: false });
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const start = (currentPage.votes - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    document.getElementById('votesTable').innerHTML = data.length === 0
      ? '<tr><td colspan="4">No votes found.</td></tr>'
      : data.slice(start, end).map(v => `
        <tr>
          <td>${v.voter_id}</td>
          <td>${v.candidates.full_name} (${v.candidates.party})</td>
          <td>${formatDate(v.created_at)}</td>
          <td><button class="admin-btn delete-btn" onclick="deleteVote('${v.id}')">Delete</button></td>
        </tr>
      `).join('');
    updatePagination('votesPagination', totalPages, 'votes', loadVotesAdmin);
  } catch (err) {
    console.error('Load votes admin error:', err);
    document.getElementById('votesTable').innerHTML = '<tr><td colspan="4">Failed to load votes.</td></tr>';
    showMsg('voteMsg', `Error loading votes: ${err.message}`, 'error');
  }
}

async function deleteVote(id) {
  if (!confirm('Delete vote?')) return;
  try {
    const { error } = await supabase.from('votes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('delete_vote', 'votes', id, {});
    await loadVotesAdmin();
  } catch (err) {
    console.error('Delete vote error:', err);
    showMsg('voteMsg', `Error deleting vote: ${err.message}`, 'error');
  }
}

async function loadResultsAdmin() {
  try {
    const { data } = await supabase.from('elections').select('*').order('created_at', { ascending: false });
    document.getElementById('resultsTable').innerHTML = data.length === 0
      ? '<tr><td colspan="4">No elections found.</td></tr>'
      : data.map(e => `
        <tr>
          <td>${e.name}</td>
          <td>${e.result_approved ? 'Yes' : 'No'}</td>
          <td><button class="admin-btn view-btn" onclick="viewResultTally('${e.id}')">View Tally</button></td>
          <td>
            <button class="admin-btn ${e.result_approved ? 'delete-btn' : 'publish-btn'}" onclick="${e.result_approved ? 'unpublishResult' : 'publishResult'}('${e.id}')">
              ${e.result_approved ? 'Unpublish' : 'Publish Results'}
            </button>
          </td>
        </tr>
      `).join('');
  } catch (err) {
    console.error('Load results admin error:', err);
    document.getElementById('resultsTable').innerHTML = '<tr><td colspan="4">Failed to load results.</td></tr>';
    showMsg('resultMsg', `Error loading results: ${err.message}`, 'error');
  }
}

async function publishResult(id) {
  try {
    const { error } = await supabase.from('elections').update({ result_approved: true }).eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('publish_result', 'elections', id, {});
    await loadResultsAdmin();
  } catch (err) {
    console.error('Publish result error:', err);
    showMsg('resultMsg', `Error publishing result: ${err.message}`, 'error');
  }
}

async function unpublishResult(id) {
  try {
    const { error } = await supabase.from('elections').update({ result_approved: false }).eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('unpublish_result', 'elections', id, {});
    await loadResultsAdmin();
  } catch (err) {
    console.error('Unpublish result error:', err);
    showMsg('resultMsg', `Error unpublishing result: ${err.message}`, 'error');
  }
}

async function viewResultTally(id) {
  try {
    const { data: votes } = await supabase.from('votes').select('candidate_id').eq('election_id', id);
    const { data: candidates } = await supabase.from('candidates').select('*').eq('election_id', id).eq('approved', true);
    const tally = {};
    votes.forEach(v => tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1);
    const results = candidates.map(c => ({ ...c, votes: tally[c.id] || 0 })).sort((a, b) => b.votes - a.votes);
    document.getElementById('modalContent').innerHTML = `
      <h2>Election Tally</h2>
      ${results.length === 0 ? '<p>No votes recorded.</p>' : results.map(r => `
        <p><strong>${r.full_name} (${r.party}):</strong> ${r.votes} votes</p>
      `).join('')}
    `;
    document.getElementById('modal').style.display = 'block';
  } catch (err) {
    console.error('View result tally error:', err);
    showMsg('resultMsg', `Error viewing tally: ${err.message}`, 'error');
  }
}

async function loadAuditLog() {
  try {
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false });
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const start = (currentPage.audit - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    document.getElementById('auditTable').innerHTML = data.length === 0
      ? '<tr><td colspan="4">No audit logs found.</td></tr>'
      : data.slice(start, end).map(a => `
        <tr>
          <td>${a.action}</td>
          <td>${a.entity_type}</td>
          <td>${JSON.stringify(a.details)}</td>
          <td>${formatDate(a.created_at)}</td>
        </tr>
      `).join('');
    updatePagination('auditPagination', totalPages, 'audit', loadAuditLog);
  } catch (err) {
    console.error('Load audit log error:', err);
    document.getElementById('auditTable').innerHTML = '<tr><td colspan="4">Failed to load audit logs.</td></tr>';
    showMsg('auditMsg', `Error loading audit logs: ${err.message}`, 'error');
  }
}

function updatePagination(containerId, totalPages, type, loadFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = currentPage[type] === i ? 'active' : '';
    btn.onclick = () => {
      currentPage[type] = i;
      loadFn();
    };
    container.appendChild(btn);
  }
}

function toggleSelectAll(className) {
  const checkboxes = document.querySelectorAll(`.${className}`);
  const selectAll = document.getElementById(`selectAll${className.replace('Select', '')}s`);
  if (selectAll) checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.style.display = 'none';
}

async function exportElections() {
  try {
    const { data } = await supabase.from('elections').select('*');
    const csv = [
      'Name,Start Date,Nomination End,Voting End,Status',
      ...data.map(e => `"${e.name}",${e.start_date},${e.nomination_end},${e.voting_end},${e.status}`)
    ].join('\n');
    downloadCSV(csv, 'elections.csv');
  } catch (err) {
    console.error('Export elections error:', err);
    showMsg('electionMsg', `Error exporting elections: ${err.message}`, 'error');
  }
}

async function exportVoters() {
  try {
    const { data } = await supabase.from('voters').select('*');
    const csv = [
      'Name,Voter ID,DOB,Citizenship,Approved,Location',
      ...data.map(v => `"${v.full_name}",${v.voter_id},${v.birth_date},${v.citizenship_no},${v.approved},${v.location.municipality} ${v.location.district}`)
    ].join('\n');
    downloadCSV(csv, 'voters.csv');
  } catch (err) {
    console.error('Export voters error:', err);
    showMsg('voterMsg', `Error exporting voters: ${err.message}`, 'error');
  }
}

async function exportCandidates() {
  try {
    const { data } = await supabase.from('candidates').select('*');
    const csv = [
      'Name,Party,Position,Approved',
      ...data.map(c => `"${c.full_name}",${c.party},${c.position_contested},${c.approved}`)
    ].join('\n');
    downloadCSV(csv, 'candidates.csv');
  } catch (err) {
    console.error('Export candidates error:', err);
    showMsg('candidateMsg', `Error exporting candidates: ${err.message}`, 'error');
  }
}

async function exportResults() {
  try {
    const { data: elections } = await supabase.from('elections').select('id, name');
    let csv = 'Election,Candidate,Party,Votes\n';
    for (const e of elections) {
      const { data: votes } = await supabase.from('votes').select('candidate_id').eq('election_id', e.id);
      const { data: candidates } = await supabase.from('candidates').select('id, full_name, party').eq('election_id', e.id).eq('approved', true);
      const tally = {};
      votes.forEach(v => tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1);
      candidates.forEach(c => {
        csv += `"${e.name}","${c.full_name}",${c.party},${tally[c.id] || 0}\n`;
      });
    }
    downloadCSV(csv, 'results.csv');
  } catch (err) {
    console.error('Export results error:', err);
    showMsg('resultMsg', `Error exporting results: ${err.message}`, 'error');
  }
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sortTable(tableId, col) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const rows = Array.from(table.rows).slice(1);
  const isAsc = table.dataset.sortCol !== col.toString() || table.dataset.sortDir !== 'asc';
  table.dataset.sortCol = col;
  table.dataset.sortDir = isAsc ? 'asc' : 'desc';
  rows.sort((a, b) => {
    let aVal = a.cells[col].textContent;
    let bVal = b.cells[col].textContent;
    if (col === 0 || col === 4) aVal = aVal.toLowerCase();
    if (col === 1 || col === 2 || col === 3) aVal = new Date(aVal.split('/').reverse().join('-'));
    return isAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });
  table.tBodies[0].append(...rows);
}

document.addEventListener('DOMContentLoaded', () => {
  const province = document.getElementById('province');
  const district = document.getElementById('district');
  if (province) province.addEventListener('change', populateDistricts);
  if (district) district.addEventListener('change', populateMunicipalities);
});

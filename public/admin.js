const endpoint = '/api/projects?view=admin';
const login = document.querySelector('#login');
const dashboard = document.querySelector('#dashboard');
const status = document.querySelector('#status');
const saveStatus = document.querySelector('#save-status');
const logout = document.querySelector('#logout');
const editor = document.querySelector('#editor');
const heading = document.querySelector('#editor-title');
const cancel = document.querySelector('#cancel');
let activeId = '';

function message(node, text, isError = false) {
  node.textContent = text;
  node.dataset.error = String(isError);
}

async function api(payload) {
  const response = await fetch(endpoint, payload ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  } : {});
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const issue = new Error(data?.error ?? 'The admin service is unavailable.');
    issue.status = response.status;
    throw issue;
  }
  return data;
}

function resetEditor() {
  editor.reset();
  activeId = '';
  heading.textContent = 'Add a project';
  cancel.hidden = true;
}

function showLogin() {
  resetEditor();
  dashboard.hidden = true;
  logout.hidden = true;
  login.hidden = false;
}

function renderList(projects) {
  const list = document.querySelector('#admin-list');
  list.replaceChildren(...projects.map(project => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = project.name + (project.hidden ? ' · Hidden' : '');
    const edit = document.createElement('button');
    edit.className = 'secondary';
    edit.textContent = 'Edit';
    edit.setAttribute('aria-label', `Edit ${project.name}`);
    edit.onclick = () => {
      activeId = project.id;
      for (const field of ['name', 'category', 'url', 'image', 'description']) {
        editor.elements[field].value = project[field];
      }
      editor.elements.tags.value = project.tags.join(', ');
      editor.elements.hidden.checked = project.hidden;
      heading.textContent = 'Edit project';
      cancel.hidden = false;
      message(saveStatus, '');
      editor.elements.name.focus();
    };
    item.append(name, edit);
    return item;
  }));
  const categories = [...new Set(projects.map(project => project.category))];
  document.querySelector('#categories').replaceChildren(...categories.map(category => {
    const option = document.createElement('option');
    option.value = category;
    return option;
  }));
}

async function openDashboard() {
  renderList(await api());
  login.hidden = true;
  dashboard.hidden = false;
  logout.hidden = false;
}

function handleIssue(issue, node = status) {
  if (issue.status === 401) {
    showLogin();
    node = status;
  }
  message(node, issue.message, true);
}

document.querySelector('#login-form').onsubmit = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  event.submitter.disabled = true;
  try {
    await api({ action: 'login', password: form.elements.password.value });
    form.reset();
    await openDashboard();
    message(status, '');
  } catch (issue) {
    handleIssue(issue);
  } finally {
    event.submitter.disabled = false;
  }
};

editor.onsubmit = async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(editor));
  const fields = [...editor.elements];
  fields.forEach(field => { field.disabled = true; });
  try {
    await api({ ...data, action: 'save', id: activeId, hidden: data.hidden === 'on' });
    resetEditor();
    message(saveStatus, 'Project saved.');
    try {
      renderList(await api());
    } catch (issue) {
      handleIssue(issue, saveStatus);
      if (issue.status !== 401) message(saveStatus, 'Project saved. Reload this page to refresh the list.', true);
    }
  } catch (issue) {
    handleIssue(issue, saveStatus);
  } finally {
    fields.forEach(field => { field.disabled = false; });
  }
};

cancel.onclick = () => { resetEditor(); message(saveStatus, ''); };
logout.onclick = async () => {
  logout.disabled = true;
  try {
    await api({ action: 'logout' });
    showLogin();
    message(status, 'Signed out.');
  } catch (issue) {
    handleIssue(issue);
  } finally {
    logout.disabled = false;
  }
};

openDashboard().catch(issue => {
  if (issue.status === 401) showLogin();
  else handleIssue(issue);
});

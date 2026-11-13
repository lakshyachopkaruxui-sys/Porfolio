// Resume-backed normal-mode content. Original source and audit stay separate
// from public copy; this module never renders provenance or local source paths.
import {copyText} from './clipboard-copy.js?v=20261110-contact-copy';

let activeProfile = null;

let profileInstance = 0;

function element(tag, className, text, parent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent?.append(node);
  return node;
}

function profileLink(text, href, parent, {external = false, className} = {}) {
  const link = element('a', className, text, parent);
  link.href = href;
  if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  return link;
}

function externalURL(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function copyButton(label, parent) {
  const button = element('button', 'resume-copy-button', undefined, parent);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({viewBox: '0 0 24 24', width: '20', height: '20',
    fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round',
    'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false'})) svg.setAttribute(key, value);
  const back = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  back.setAttribute('d', 'M8 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3');
  const front = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  for (const [key, value] of Object.entries({x: '8', y: '8', width: '13', height: '13', rx: '2'})) front.setAttribute(key, value);
  back.setAttribute('class', 'copy-symbol');
  front.setAttribute('class', 'copy-symbol');
  const tick = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  tick.setAttribute('class', 'copy-tick');
  tick.setAttribute('d', 'M5 12l4 4L19 6');
  svg.append(back, front, tick);
  button.append(svg);
  return button;
}

const EXPERIENCE_SUMMARIES = {
  Baragaun: 'Website and mobile app design, stakeholder reviews and development handoff.',
  'Novae Avenue': 'A dashcam data portal, app screens, landing page and brochure.',
};

/** Mount before the page binds its project and section anchors. */
export function mountResumeProfile(resume) {
  if (!resume?.identity) return null;
  const about = document.querySelector('#about');
  const bio = about?.querySelector('.personal-bio');
  const contact = document.querySelector('#contact');
  const slots = contact?.querySelector('.contact-slots');
  if (!about && !contact) return null;
  activeProfile?.destroy();
  const lifecycle = new AbortController();
  const listen = (node, type, handler) => node.addEventListener(type, handler, {signal: lifecycle.signal});
  const prefix = `resume-profile-${++profileInstance}`;
  const originalBio = bio ? [...bio.childNodes].map(node => node.cloneNode(true)) : [];
  const originalSlots = slots ? [...slots.childNodes].map(node => node.cloneNode(true)) : [];
  const pending = contact?.querySelector('.contact-pending');
  const pendingParent = pending?.parentNode;
  const pendingNext = pending?.nextSibling;
  const created = [];
  let copyVersion = 0;
  let destroyed = false;

  if (bio) {
    bio.replaceChildren();
    const masters = resume.education?.find(entry => /^M\.Des\b/i.test(entry.qualification));
    const study = masters ? ` I’m now studying User Experience at ${masters.institution.split(',')[0]}.` : '';
    element('p', 'personal-bio-intro', `My route to UX began in Electronics & Telecommunication.${study}`, bio);
    element('p', undefined, 'I’m often the one starting a conversation. Away from design, I sing, dance Garba and photograph clouds. I performed at Junoon during my M.Des, and I still make time for Pokemon GO.', bio);
    const recognition = element('p', 'resume-recognition', undefined, bio);
    profileLink('Giggles', '#project-giggles', recognition);
    recognition.append(document.createTextNode(' received Best Project at Meraki, our college’s pre-grad show.'));
  }

  if (about) {
    const journey = element('section', 'resume-background wrap practice-section');
    journey.id = 'background';
    journey.setAttribute('aria-label', 'Experience, education and courses');
    (document.querySelector('#toolkit') || about).after(journey);
    created.push(journey);
    const columns = element('div', 'resume-journey-columns', undefined, journey);
    const work = element('section', 'resume-journey-column', undefined, columns);
    work.setAttribute('aria-labelledby', `${prefix}-work`);
    element('h2', 'resume-journey-heading', 'Experience', work).id = `${prefix}-work`;
    const workList = element('ol', 'resume-timeline', undefined, work);
    for (const entry of resume.experience || []) {
      const item = element('li', 'resume-timeline-item', undefined, workList);
      element('h3', 'resume-entry-title', entry.organization, item);
      element('p', 'resume-entry-place', entry.title, item);
      element('p', 'resume-entry-date', entry.date_text.replace(/ - /g, ' – '), item);
      const summary = EXPERIENCE_SUMMARIES[entry.organization];
      if (summary) element('p', 'resume-entry-description', summary, item);
    }

    const education = element('section', 'resume-journey-column', undefined, columns);
    education.setAttribute('aria-labelledby', `${prefix}-education`);
    element('h2', 'resume-journey-heading', 'Education', education).id = `${prefix}-education`;
    const educationList = element('ol', 'resume-timeline', undefined, education);
    for (const entry of resume.education || []) {
      const item = element('li', 'resume-timeline-item', undefined, educationList);
      element('h3', 'resume-entry-title', entry.qualification, item);
      element('p', 'resume-entry-place', entry.institution, item);
      element('p', 'resume-entry-date', entry.date_text.replace(/ - /g, ' – '), item);
    }

    if (resume.certifications?.length) {
      const courses = element('section', 'resume-courses', undefined, journey);
      courses.setAttribute('aria-labelledby', `${prefix}-courses`);
      element('h2', 'resume-courses-heading', 'Courses & workshops', courses).id = `${prefix}-courses`;
      const list = element('ul', 'resume-course-list', undefined, courses);
      for (const course of resume.certifications) {
        const item = element('li', undefined, undefined, list);
        element('p', 'resume-course-title', course.title, item);
        element('p', 'resume-course-provider', [course.provider, course.platform].filter(Boolean).join(' · '), item);
      }
    }
  }

  if (contact && slots) {
    slots.replaceChildren();
    slots.classList.add('resume-contact-slots');
    pending?.remove();
    const copyStatus = element('p', 'resume-copy-status', '', contact);
    copyStatus.setAttribute('role', 'status');
    copyStatus.setAttribute('aria-live', 'polite');
    copyStatus.setAttribute('aria-atomic', 'true');
    created.push(copyStatus);
    const fallback = element('div', 'resume-copy-fallback', undefined, contact);
    fallback.hidden = true;
    const fallbackLabel = element('label', undefined, 'Copy manually', fallback);
    fallbackLabel.htmlFor = `${prefix}-manual-copy`;
    const fallbackField = element('input', undefined, undefined, fallback);
    fallbackField.id = fallbackLabel.htmlFor;
    fallbackField.type = 'text';
    fallbackField.readOnly = true;
    element('p', undefined, 'Use your device’s copy command on the selected text.', fallback);
    created.push(fallback);

    async function copyContact(value, label, button) {
      const version = ++copyVersion;
      button.setAttribute('data-copied', 'false');
      button.setAttribute('aria-label', label === 'email' ? 'Copy email address' : 'Copy phone number');
      button.title = label === 'email' ? 'Copy email address' : 'Copy phone number';
      fallback.hidden = true;
      copyStatus.textContent = `Copying ${label}…`;
      const result = await copyText(value, {isCurrent: () => !destroyed && version === copyVersion});
      if (destroyed || version !== copyVersion || result.status === 'cancelled') return;
      if (result.status === 'copied') {
        const confirmation = `${label === 'email' ? 'Email' : 'Phone number'} copied.`;
        copyStatus.textContent = confirmation;
        button.setAttribute('data-copied', 'true');
        button.setAttribute('aria-label', `${confirmation} Copy again`);
        button.title = `${confirmation} Click to copy again`;
      } else {
        fallback.hidden = false;
        fallbackField.value = value;
        fallbackLabel.textContent = `Copy ${label} manually`;
        copyStatus.textContent = `Automatic copying isn’t available. The ${label} is selected below for manual copying.`;
        fallbackField.focus();
        fallbackField.select();
      }
    }

    function contactRow(title, {id, className, parent = slots} = {}) {
      const row = element('div', 'resume-contact-row', undefined, parent);
      if (id) row.id = id;
      if (className) row.classList.add(className);
      element('dt', undefined, title, row);
      return element('dd', undefined, undefined, row);
    }

    const email = resume.contacts?.email?.value;
    if (email) {
      const row = contactRow('Email', {className: 'resume-contact-email'});
      const emailLink = profileLink(undefined, `mailto:${email}`, row, {className: 'resume-contact-value'});
      const splitAt = email.lastIndexOf('@') + 1;
      emailLink.append(document.createTextNode(email.slice(0, splitAt)));
      element('wbr', undefined, undefined, emailLink);
      emailLink.append(document.createTextNode(email.slice(splitAt)));
      const copy = copyButton('Copy email address', row);
      listen(copy, 'click', () => copyContact(email, 'email', copy));
    }
    const documentRow = contactRow('Resume', {id: 'resume'});
    const documentLinks = element('span', 'resume-document-links', undefined, documentRow);
    const resumeURL = './assets/Lakshya-Chopkar-Product-Designer-Resume.pdf';
    profileLink('View resume', resumeURL, documentLinks, {external: true});
    const download = profileLink('Download PDF', resumeURL, documentLinks);
    download.download = 'Lakshya-Chopkar-Product-Designer-Resume.pdf';
    const profiles = contactRow('Profiles');
    const profileLinks = element('span', 'resume-document-links', undefined, profiles);
    const linkedin = externalURL(resume.contacts?.linkedin?.url);
    if (linkedin) profileLink('LinkedIn', linkedin, profileLinks, {external: true, className: 'resume-contact-value'});
    const portfolio = externalURL(resume.contacts?.portfolio?.url);
    if (portfolio) profileLink('Behance', portfolio, profileLinks, {external: true, className: 'resume-contact-value'});
    if (!profileLinks.children.length) profiles.parentNode.remove();
    const phone = resume.contacts?.phone;
    if (phone?.display) {
      const row = contactRow('Phone', {className: 'resume-contact-phone'});
      const normalized = String(phone.normalized || '').replace(/[^+\d]/g, '');
      if (/^\+\d{7,15}$/.test(normalized)) profileLink(phone.display, `tel:${normalized}`, row, {className: 'resume-contact-value'});
      else element('span', 'resume-contact-value', phone.display, row);
      const copy = copyButton('Copy phone number', row);
      listen(copy, 'click', () => copyContact(/^\+\d{7,15}$/.test(normalized) ? normalized : phone.display, 'phone number', copy));
    }
  }

  const mounted = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      copyVersion += 1;
      lifecycle.abort();
      created.forEach(node => node.remove());
      if (bio) bio.replaceChildren(...originalBio);
      if (slots) {
        slots.replaceChildren(...originalSlots);
        slots.classList.remove('resume-contact-slots');
      }
      if (pendingParent && pending) pendingParent.insertBefore(pending, pendingNext?.parentNode === pendingParent ? pendingNext : null);
      if (activeProfile === mounted) activeProfile = null;
    },
  };
  activeProfile = mounted;
  return mounted;
}

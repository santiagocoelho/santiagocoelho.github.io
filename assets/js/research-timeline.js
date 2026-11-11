async function loadResearchTimeline() {
  const timeline = document.getElementById('research-timeline');
  const response = await fetch('assets/js/research-records.json');
  if (!response.ok) throw new Error('Research records could not be loaded.');
  const records = await response.json();
  const chart = timeline.querySelector('.timeline-years');
  const detail = timeline.querySelector('.record-detail');
  let selected;

  function select(record, button) {
    selected?.setAttribute('aria-pressed', 'false');
    selected = button;
    selected.setAttribute('aria-pressed', 'true');
    const metadata = document.createElement('p');
    metadata.textContent = record.kind + ' · ' + record.date;
    const title = document.createElement(record.url ? 'a' : 'strong');
    if (record.url) title.href = record.url;
    title.textContent = record.title;
    const venue = document.createElement('p');
    venue.textContent = record.venue;
    detail.replaceChildren(metadata, title, venue);
    if (record.award) {
      const award = document.createElement('strong');
      award.className = 'record-award';
      award.textContent = record.award;
      if (record.kind === 'Abstract') {
        const svgNamespace = 'http://www.w3.org/2000/svg';
        const medal = document.createElementNS(svgNamespace, 'svg');
        medal.setAttribute('class', record.award.startsWith('Magna') ? 'medal silver' : 'medal');
        medal.setAttribute('aria-hidden', 'true');
        const shape = document.createElementNS(svgNamespace, 'use');
        shape.setAttribute('href', '#abstract-medal');
        medal.append(shape);
        award.prepend(medal);
      }
      detail.append(award);
    }
  }

  const years = [...new Set(records.map(record => record.date.slice(0, 4)))].sort();
  for (const year of years) {
    const column = document.createElement('div');
    const heading = document.createElement('h4');
    heading.textContent = year;
    const points = document.createElement('div');
    points.className = 'record-points';
    for (const record of records.filter(item => item.date.startsWith(year))) {
      const button = document.createElement('button');
      button.type = 'button';
      button.title = [record.date, record.kind, record.title, record.award].filter(Boolean).join(' · ');
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', 'false');
      const symbol = document.createElement('span');
      symbol.className = 'record-symbol ' + record.kind.toLowerCase().replace(' ', '-') + (record.award ? ' awarded' : '');
      button.append(symbol);
      button.addEventListener('click', () => select(record, button));
      points.append(button);
      if (!selected && year === years[years.length - 1]) select(record, button);
    }
    column.append(heading, points);
    chart.append(column);
  }
  timeline.hidden = false;
}

loadResearchTimeline().catch(console.error);

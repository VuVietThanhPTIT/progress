// ─── iCalendar (.ics) Parser Utility ───────────────────────────────────────
export function parseICS(icsContent) {
  if (!icsContent || typeof icsContent !== 'string') return [];

  const events = [];
  const lines = icsContent.split(/\r?\n/);
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.title && currentEvent.date) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY')) {
        const parts = line.split(':');
        currentEvent.title = parts.slice(1).join(':').trim();
      } else if (line.startsWith('DTSTART')) {
        const val = line.split(':').pop().trim();
        if (val.length >= 8) {
          const y = val.slice(0, 4);
          const m = val.slice(4, 6);
          const d = val.slice(6, 8);
          currentEvent.date = `${y}-${m}-${d}`;
        }
        if (val.includes('T') && val.length >= 13) {
          const tIdx = val.indexOf('T');
          const timePart = val.slice(tIdx + 1, tIdx + 5);
          currentEvent.start_time = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`;
        }
      } else if (line.startsWith('DTEND')) {
        const val = line.split(':').pop().trim();
        if (val.includes('T') && val.length >= 13) {
          const tIdx = val.indexOf('T');
          const timePart = val.slice(tIdx + 1, tIdx + 5);
          currentEvent.end_time = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`;
        }
      } else if (line.startsWith('LOCATION')) {
        currentEvent.location = line.split(':').slice(1).join(':').trim();
      } else if (line.startsWith('DESCRIPTION')) {
        currentEvent.description = line.split(':').slice(1).join(':').trim();
      }
    }
  }

  return events.map((e, idx) => {
    let duration_minutes = 60;
    if (e.start_time && e.end_time) {
      const [sh, sm] = e.start_time.split(':').map(Number);
      const [eh, em] = e.end_time.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) duration_minutes = diff;
    }

    const descParts = [];
    if (e.description) descParts.push(e.description);
    if (e.location) descParts.push(`📍 Phòng: ${e.location}`);
    const fullDesc = descParts.join(' | ');

    return {
      id: `ics-${idx}-${Date.now()}`,
      title: e.title,
      date: e.date,
      start_time: e.start_time || '08:00',
      duration_minutes,
      description: fullDesc,
      location: e.location || '',
      category_id: 'cat-1', // Default 'Học tập'
      recurrence: 'none',
    };
  });
}

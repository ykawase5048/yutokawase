export const updateChanges = ['added', 'publication', 'slides-added', 'video-added', 'resources-added', 'links-updated'];

export function validUpdate(update) {
    return update && ['paper', 'talk', 'note'].includes(update.category)
        && typeof update.targetId === 'string' && /^[A-Za-z0-9-]+$/.test(update.targetId)
        && typeof update.title === 'string' && Boolean(update.title.trim())
        && typeof update.updatedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(update.updatedAt) && Number.isFinite(Date.parse(update.updatedAt))
        && /^[a-f0-9]{40}$/.test(update.commit)
        && Array.isArray(update.changes) && update.changes.length > 0 && update.changes.every(change => updateChanges.includes(change));
}

export function recentUpdates(data, limit = 3) {
    if (!Array.isArray(data?.updates)) return [];
    return data.updates.filter(validUpdate).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, limit);
}

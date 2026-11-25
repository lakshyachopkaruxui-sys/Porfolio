// Both the canvas and the reader display the same bounded, public fields.
export function visitorReviews(items) {
  const reviews = [];
  if (!Array.isArray(items)) return reviews;
  for (const row of items) {
    if (!row || typeof row.name !== 'string' || typeof row.feedback !== 'string' ||
        !Number.isInteger(row.stars) || row.stars < 1 || row.stars > 5) continue;
    reviews.push({
      id:typeof row.id === 'string' && /^[1-9]\d*$/.test(row.id) ? row.id : '',
      name:row.name.slice(0,60), feedback:row.feedback.slice(0,600), stars:row.stars,
      linkedin:typeof row.linkedin === 'string' ? row.linkedin.slice(0,512) : '',
      createdAt:typeof row.createdAt === 'string' || typeof row.createdAt === 'number' ? row.createdAt : ''
    });
    if (reviews.length === 20) break;
  }
  return reviews;
}

export async function readReviewReceipt(response) {
  const body = await response.json().catch(() => null);
  const message = typeof body?.error === 'string' ? body.error : '';
  if (!response.ok) {
    if (response.status === 429) throw Error('Please wait a moment before posting another note.');
    throw Error(message || 'Your note could not be posted. Your writing is still here.');
  }
  const id = body?.review?.id;
  const saved = typeof id === 'string' && /^[1-9]\d*$/.test(id);
  if (!saved || body.ok === false || body.error) {
    throw Error('The board could not confirm your note. Your writing is still here.');
  }
  return body;
}

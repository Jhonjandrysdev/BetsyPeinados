import type { APIRoute } from 'astro';
import { revokeGoogle } from '../../../lib/google';
import { deleteGoogleConnection } from '../../../lib/db';

export const POST: APIRoute = async ({ redirect }) => {
  await revokeGoogle();
  await deleteGoogleConnection();
  return redirect('/admin/ajustes?ok=' + encodeURIComponent('Google Calendar desconectado. Las citas nuevas ya no se anotarán allá.'), 303);
};

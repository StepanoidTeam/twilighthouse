import { getCached } from './local-cache.helper.js';
import { fetchClientIpInfo } from './ip-info.js';
import { currentUser } from './auth.js';
import { updateUserProfile } from './profile-store.js';

// page init
{
  const clientIpInfo = await getCached({
    fn: fetchClientIpInfo,
    cacheKey: 'client-ip-info',
  });

  // Save to user profile if logged in
  if (currentUser) {
    await updateUserProfile(currentUser, { ipInfo: clientIpInfo }).catch(
      (e) => {
        console.warn('Failed to save IP info to profile', e);
      },
    );
  }

  console.log(clientIpInfo);
  // todo(vmyshko): set lang based on ip?
}

const appConfig = {
  ipRegistryKey: 'tryout',
};

export function fetchClientIpInfo() {
  return fetch(
    `https://api.ipregistry.co/?key=${appConfig.ipRegistryKey}`,
  ).then((response) => response.json());
}

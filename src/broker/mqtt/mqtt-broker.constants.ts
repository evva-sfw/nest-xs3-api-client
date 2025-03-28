export const BROKER_TOPIC_PREFIXES = Object.freeze({
  BASE: 'xs3/1',
  CMD: 'xs3/1/cmd',
  OC: 'oc/1',
  CQRS_EVENTS: 'xs3/1/ces',
  ACCESS_PROTOCOL: 'xs3/1/ase',
});

export const BROKER_TOPIC_SUFFIXES = Object.freeze({
  LOGGED_IN: 'LoggedIn',
  ERROR_IN: 'err',
  QUERY_IN: 'q',
  USER_IN: '#',
});

export const BROKER_TOPICS = Object.freeze({
  LOGIN: `${BROKER_TOPIC_PREFIXES.CMD}/Login`,
  CQRS_EVENTS: `${BROKER_TOPIC_PREFIXES.CQRS_EVENTS}/#`,
  OC: `${BROKER_TOPIC_PREFIXES.OC}/#`,
  QUERY_OUT: `${BROKER_TOPIC_PREFIXES.BASE}/q`,
  ACCESS_PROTOCOL: `${BROKER_TOPIC_PREFIXES.ACCESS_PROTOCOL}/#`,
});
